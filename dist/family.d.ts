import { type CollectionReference, type DocumentData } from 'firebase/firestore';
export interface Member {
    uid: string;
    displayName: string;
    role: 'owner' | 'member';
}
/** Crée une famille dont l'utilisateur connecté est propriétaire. Renvoie son identifiant. */
export declare function createFamily(name: string): Promise<string>;
/** Génère un code d'invitation valable 7 jours (réservé au propriétaire). */
export declare function createInvite(familyId: string): Promise<{
    code: string;
    expiresAt: Date;
}>;
/** Rejoint une famille existante grâce à un code d'invitation. */
export declare function joinFamily(rawCode: string): Promise<void>;
/** Quitte la famille (non proposé au propriétaire). */
export declare function leaveFamily(familyId: string): Promise<void>;
/** Écoute la liste des membres d'une famille. Renvoie la fonction d'arrêt. */
export declare function watchMembers(familyId: string, onData: (members: Member[]) => void, onError?: (e: unknown) => void): () => void;
/**
 * Collection de données d'une mini-application, dans l'espace de la famille :
 * families/{familyId}/apps/{appId}/...segments
 * Chaque app n'écrit QUE sous son propre appId.
 */
export declare function appCollection(familyId: string, appId: string, ...segments: string[]): CollectionReference<DocumentData>;
