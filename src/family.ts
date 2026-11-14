import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
  type CollectionReference,
  type DocumentData,
} from 'firebase/firestore';
import { getServices } from './services';
import { getSession } from './session';
import { FamilleError } from './errors';
import { generateInviteCode, normalizeInviteCode } from './invite';

const INVITE_VALIDITY_DAYS = 7;
const MAX_MEMBERS_FOR_DELETE = 200; // une suppression tient dans un seul lot atomique (500 écritures max)

export interface Member {
  uid: string;
  displayName: string;
  role: 'owner' | 'member';
}

function currentUser() {
  const { auth } = getServices();
  const user = auth.currentUser;
  if (!user) throw new FamilleError('Vous devez être connecté.');
  return user;
}

function currentDisplayName(): string {
  const s = getSession();
  if (s.status === 'noFamily' || s.status === 'ready') return s.displayName;
  return currentUser().email ?? '';
}

/** Famille actuellement choisie par l'utilisateur (celle que lisent toutes les applications). */
function activeFamilyId(): string | null {
  const s = getSession();
  return s.status === 'ready' ? s.familyId : null;
}

/**
 * Définit la famille active : c'est le champ `familyId` du profil, que toutes les applications
 * lisent déjà. Changer de famille ne demande donc aucune modification des applications.
 */
async function setActiveFamily(familyId: string | null): Promise<void> {
  const { db } = getServices();
  const user = currentUser();
  await setDoc(doc(db, 'users', user.uid), { displayName: currentDisplayName(), familyId });
}

/**
 * Crée une famille dont l'utilisateur connecté est propriétaire, et la rend active.
 * Une personne peut créer autant de familles qu'elle le souhaite.
 */
export async function createFamily(name: string): Promise<string> {
  const familyName = name.trim();
  if (!familyName) throw new FamilleError("Donnez un nom à votre espace familial.");
  if (familyName.length > 60) throw new FamilleError('Nom trop long (60 caractères maximum).');

  const { db } = getServices();
  const user = currentUser();
  const displayName = currentDisplayName();
  const familyRef = doc(collection(db, 'families'));

  const batch = writeBatch(db);
  batch.set(familyRef, { name: familyName, ownerUid: user.uid, createdAt: serverTimestamp() });
  batch.set(doc(db, 'families', familyRef.id, 'members', user.uid), {
    displayName,
    role: 'owner',
    joinedAt: serverTimestamp(),
  });
  // Index « mes familles » : permet de lister les familles d'une personne.
  batch.set(doc(db, 'users', user.uid, 'memberships', familyRef.id), { joinedAt: serverTimestamp() });
  await batch.commit();

  // La famille n'est rendue active qu'APRÈS validation par le serveur (sinon l'appli tenterait
  // de la lire avant que l'appartenance existe côté serveur : lecture refusée).
  await setActiveFamily(familyRef.id);
  return familyRef.id;
}

/** Génère un code d'invitation valable 7 jours (réservé au propriétaire). */
export async function createInvite(familyId: string): Promise<{ code: string; expiresAt: Date }> {
  const { db } = getServices();
  const user = currentUser();
  const code = generateInviteCode();
  const expires = new Date(Date.now() + INVITE_VALIDITY_DAYS * 24 * 3600 * 1000);
  await setDoc(doc(db, 'invites', code), {
    fid: familyId,
    expiresAt: Timestamp.fromDate(expires),
    createdBy: user.uid,
  });
  return { code, expiresAt: expires };
}

/** Rejoint une famille existante grâce à un code d'invitation, et la rend active. */
export async function joinFamily(rawCode: string): Promise<void> {
  const code = normalizeInviteCode(rawCode);
  if (code.length < 6) throw new FamilleError("Ce code d'invitation n'est pas valide.");

  const { db } = getServices();
  const user = currentUser();
  const displayName = currentDisplayName();

  const invite = await getDoc(doc(db, 'invites', code));
  if (!invite.exists()) throw new FamilleError("Ce code d'invitation n'est pas valide.");
  const { fid, expiresAt } = invite.data() as { fid: string; expiresAt: Timestamp };
  if (expiresAt.toMillis() < Date.now()) {
    throw new FamilleError('Ce code a expiré. Demandez-en un nouveau.');
  }
  const already = await getDoc(doc(db, 'families', fid, 'members', user.uid));
  if (already.exists()) throw new FamilleError('Vous faites déjà partie de cette famille.');

  const batch = writeBatch(db);
  batch.set(doc(db, 'families', fid, 'members', user.uid), {
    displayName,
    role: 'member',
    inviteCode: code,
    joinedAt: serverTimestamp(),
  });
  batch.set(doc(db, 'users', user.uid, 'memberships', fid), { joinedAt: serverTimestamp() });
  await batch.commit();
  await setActiveFamily(fid);
}

/** Choisit la famille avec laquelle on utilise les applications. */
export async function selectFamily(familyId: string): Promise<void> {
  const { db } = getServices();
  const user = currentUser();
  const member = await getDoc(doc(db, 'families', familyId, 'members', user.uid));
  if (!member.exists()) throw new FamilleError('Vous ne faites plus partie de cette famille.');
  await setActiveFamily(familyId);
}

/** Quitte une famille (non proposé au propriétaire, qui peut la supprimer). */
export async function leaveFamily(familyId: string): Promise<void> {
  const { db } = getServices();
  const user = currentUser();
  const wasActive = activeFamilyId() === familyId;
  const batch = writeBatch(db);
  batch.delete(doc(db, 'families', familyId, 'members', user.uid));
  batch.delete(doc(db, 'users', user.uid, 'memberships', familyId));
  await batch.commit();
  if (wasActive) await setActiveFamily(null);
}

/**
 * Supprime une famille (propriétaire uniquement) : elle est marquée « supprimée », tous ses membres
 * perdent l'accès et disparaissent de leur liste. Les données des applications deviennent
 * inaccessibles pour tout le monde ; elles peuvent ensuite être purgées avec l'outil d'administration
 * (voir le dépôt famille-infra) : le navigateur ne peut pas parcourir les données de toutes les apps.
 */
export async function deleteFamily(familyId: string): Promise<void> {
  const { db } = getServices();
  const user = currentUser();
  const wasActive = activeFamilyId() === familyId;

  const members = await getDocs(collection(db, 'families', familyId, 'members'));
  if (members.size > MAX_MEMBERS_FOR_DELETE) throw new FamilleError('Cette famille compte trop de membres pour être supprimée ici.');

  const batch = writeBatch(db);
  batch.update(doc(db, 'families', familyId), { deletedAt: serverTimestamp() });
  members.docs.forEach((m) => {
    batch.delete(m.ref);
    batch.delete(doc(db, 'users', m.id, 'memberships', familyId));
  });
  // le propriétaire figure normalement parmi les membres ; on s'assure de retirer aussi son index
  batch.delete(doc(db, 'users', user.uid, 'memberships', familyId));
  await batch.commit();

  if (wasActive) await setActiveFamily(null);
}

/** Écoute la liste des membres d'une famille. Renvoie la fonction d'arrêt. */
export function watchMembers(
  familyId: string,
  onData: (members: Member[]) => void,
  onError?: (e: unknown) => void,
): () => void {
  const { db } = getServices();
  return onSnapshot(
    collection(db, 'families', familyId, 'members'),
    (snap) => {
      const members = snap.docs
        .map((d) => ({
          uid: d.id,
          displayName: String(d.data().displayName ?? ''),
          role: d.data().role === 'owner' ? ('owner' as const) : ('member' as const),
        }))
        .sort((a, b) =>
          a.role === b.role ? a.displayName.localeCompare(b.displayName) : a.role === 'owner' ? -1 : 1,
        );
      onData(members);
    },
    onError,
  );
}

/**
 * Collection de données d'une mini-application, dans l'espace de la famille :
 * families/{familyId}/apps/{appId}/...segments
 * Chaque app n'écrit QUE sous son propre appId.
 */
export function appCollection(
  familyId: string,
  appId: string,
  ...segments: string[]
): CollectionReference<DocumentData> {
  const { db } = getServices();
  return collection(db, 'families', familyId, 'apps', appId, ...segments);
}

