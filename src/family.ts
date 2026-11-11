import {
  Timestamp,
  collection,
  doc,
  getDoc,
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

/** Crée une famille dont l'utilisateur connecté est propriétaire. Renvoie son identifiant. */
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
  batch.set(doc(db, 'users', user.uid), { displayName, familyId: familyRef.id });
  await batch.commit();
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

/** Rejoint une famille existante grâce à un code d'invitation. */
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

  const batch = writeBatch(db);
  batch.set(doc(db, 'families', fid, 'members', user.uid), {
    displayName,
    role: 'member',
    inviteCode: code,
    joinedAt: serverTimestamp(),
  });
  batch.set(doc(db, 'users', user.uid), { displayName, familyId: fid });
  await batch.commit();
}

/** Quitte la famille (non proposé au propriétaire). */
export async function leaveFamily(familyId: string): Promise<void> {
  const { db } = getServices();
  const user = currentUser();
  const batch = writeBatch(db);
  batch.delete(doc(db, 'families', familyId, 'members', user.uid));
  batch.set(doc(db, 'users', user.uid), { displayName: currentDisplayName(), familyId: null });
  await batch.commit();
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
