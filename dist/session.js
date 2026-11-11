import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
let current = { status: 'loading' };
const subscribers = new Set();
function setSession(s) {
    current = s;
    subscribers.forEach((fn) => fn(s));
}
/** Store compatible Svelte (`$session`) et utilisable partout (`session.subscribe`). */
export const session = {
    subscribe(run) {
        run(current);
        subscribers.add(run);
        return () => {
            subscribers.delete(run);
        };
    },
};
export function getSession() {
    return current;
}
/** Démarre l'écoute de la connexion, du profil et de la famille. Appelée par initFamille. */
export function startSession({ auth, db }) {
    let unsubUser = null;
    let unsubFamily = null;
    const cleanup = () => {
        unsubUser?.();
        unsubFamily?.();
        unsubUser = null;
        unsubFamily = null;
    };
    onAuthStateChanged(auth, (user) => {
        cleanup();
        if (!user) {
            setSession({ status: 'signedOut' });
            return;
        }
        setSession({ status: 'loading' });
        unsubUser = onSnapshot(doc(db, 'users', user.uid), (snap) => {
            // Hors-ligne et jamais synchronisé : on attend plutôt que d'afficher
            // à tort l'écran de création de famille.
            if (!snap.exists() && snap.metadata.fromCache)
                return;
            unsubFamily?.();
            unsubFamily = null;
            const data = snap.data();
            const displayName = data?.displayName || user.email || '';
            const familyId = data?.familyId;
            if (!familyId) {
                setSession({ status: 'noFamily', user, displayName });
                return;
            }
            unsubFamily = onSnapshot(doc(db, 'families', familyId), (fsnap) => {
                if (!fsnap.exists()) {
                    if (fsnap.metadata.fromCache)
                        return;
                    setSession({ status: 'noFamily', user, displayName });
                    return;
                }
                const f = fsnap.data();
                setSession({
                    status: 'ready',
                    user,
                    displayName,
                    familyId,
                    familyName: String(f.name ?? ''),
                    isOwner: f.ownerUid === user.uid,
                });
            }, 
            // Typiquement : on a été retiré de la famille (permission refusée).
            () => setSession({ status: 'noFamily', user, displayName }));
        }, () => setSession({ status: 'noFamily', user, displayName: user.email ?? '' }));
    });
}
