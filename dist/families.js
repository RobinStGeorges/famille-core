import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { getServices } from './services';
import { session } from './session';
/**
 * Écoute la liste des familles de l'utilisateur (« mes familles »).
 * `ready` passe à vrai quand la liste est complète (index et noms de familles chargés).
 *
 * Un index `users/{uid}/memberships/{familleId}` recense les familles de chaque personne ; les noms
 * viennent des familles elles-mêmes. Les lignes périmées (famille supprimée, accès retiré) sont
 * nettoyées au passage, et l'index est complété pour les comptes créés avant les familles multiples.
 */
export function watchMyFamilies(onData, onError) {
    const { auth, db } = getServices();
    const user = auth.currentUser;
    if (!user) {
        onData([], true);
        return () => { };
    }
    const uid = user.uid;
    let memberIds = new Set();
    const infos = new Map(); // null = inaccessible ou supprimée
    const familyUnsubs = new Map();
    const cleaned = new Set();
    let activeId = null;
    let membershipsLoaded = false;
    let indexIds = new Set(); // y compris les écritures pas encore validées
    let backfilled = false;
    let stopped = false;
    const emit = () => {
        if (stopped)
            return;
        let ready = membershipsLoaded;
        const list = [];
        for (const id of memberIds) {
            if (!infos.has(id)) {
                ready = false;
                continue;
            }
            const info = infos.get(id);
            if (!info || info.deleted)
                continue;
            list.push({ id, name: info.name, role: info.ownerUid === uid ? 'owner' : 'member', active: id === activeId });
        }
        list.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
        onData(list, ready);
    };
    const cleanup = (id) => {
        if (cleaned.has(id))
            return;
        cleaned.add(id);
        deleteDoc(doc(db, 'users', uid, 'memberships', id)).catch(() => { });
    };
    const watchFamily = (id) => {
        if (familyUnsubs.has(id))
            return;
        const stop = onSnapshot(doc(db, 'families', id), (snap) => {
            if (!snap.exists()) {
                if (snap.metadata.fromCache)
                    return; // on attend la réponse du serveur
                infos.set(id, null);
                cleanup(id);
            }
            else {
                const d = snap.data();
                const deleted = d.deletedAt != null;
                infos.set(id, { name: String(d.name ?? ''), ownerUid: String(d.ownerUid ?? ''), deleted });
                if (deleted)
                    cleanup(id);
            }
            emit();
        }, () => {
            // accès refusé : on n'est plus membre de cette famille
            infos.set(id, null);
            cleanup(id);
            emit();
        });
        familyUnsubs.set(id, stop);
    };
    const maybeBackfill = () => {
        if (backfilled || !membershipsLoaded || !activeId || indexIds.has(activeId))
            return;
        backfilled = true;
        setDoc(doc(db, 'users', uid, 'memberships', activeId), { joinedAt: serverTimestamp() }).catch(() => { });
    };
    const stopSession = session.subscribe((s) => {
        activeId = s.status === 'ready' ? s.familyId : null;
        maybeBackfill();
        emit();
    });
    const stopIndex = onSnapshot(collection(db, 'users', uid, 'memberships'), (snap) => {
        indexIds = new Set(snap.docs.map((d) => d.id));
        // Une ligne d'index pas encore validée par le serveur est ignorée : la famille ne serait
        // pas encore lisible (le serveur n'a pas encore enregistré l'appartenance).
        const confirmed = new Set(snap.docs.filter((d) => !d.metadata.hasPendingWrites).map((d) => d.id));
        for (const [id, stop] of familyUnsubs) {
            if (!confirmed.has(id)) {
                stop();
                familyUnsubs.delete(id);
                infos.delete(id);
            }
        }
        memberIds = confirmed;
        membershipsLoaded = true;
        confirmed.forEach(watchFamily);
        maybeBackfill();
        emit();
    }, (e) => {
        membershipsLoaded = true;
        onData([], true);
        onError?.(e);
    });
    return () => {
        stopped = true;
        stopSession();
        stopIndex();
        familyUnsubs.forEach((stop) => stop());
        familyUnsubs.clear();
    };
}
