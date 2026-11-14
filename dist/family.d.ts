import { type CollectionReference, type DocumentData } from 'firebase/firestore';
export interface Member {
    uid: string;
    displayName: string;
    role: 'owner' | 'member';
}
/**
 * Crée une famille dont l'utilisateur connecté est propriétaire, et la rend active.
 * Une personne peut créer autant de familles qu'elle le souhaite.
 */
export declare function createFamily(name: string): Promise<string>;
/** Génère un code d'invitation valable 7 jours (réservé au propriétaire). */
export declare function createInvite(familyId: string): Promise<{
    code: string;
    expiresAt: Date;
}>;
/** Rejoint une famille existante grâce à un code d'invitation, et la rend active. */
export declare function joinFamily(rawCode: string): Promise<void>;
/** Choisit la famille avec laquelle on utilise les applications. */
export declare function selectFamily(familyId: string): Promise<void>;
/** Quitte une famille (non proposé au propriétaire, qui peut la supprimer). */
export declare function leaveFamily(familyId: string): Promise<void>;
/**
 * Supprime une famille (propriétaire uniquement) : elle est marquée « supprimée », tous ses membres
 * perdent l'accès et disparaissent de leur liste. Les données des applications deviennent
 * inaccessibles pour tout le monde ; elles peuvent ensuite être purgées avec l'outil d'administration
 * (voir le dépôt famille-infra) : le navigateur ne peut pas parcourir les données de toutes les apps.
 */
export declare function deleteFamily(familyId: string): Promise<void>;
/** Écoute la liste des membres d'une famille. Renvoie la fonction d'arrêt. */
export declare function watchMembers(familyId: string, onData: (members: Member[]) => void, onError?: (e: unknown) => void): () => void;
/**
 * Collection de données d'une mini-application, dans l'espace de la famille :
 * families/{familyId}/apps/{appId}/...segments
 * Chaque app n'écrit QUE sous son propre appId.
 */
export declare function appCollection(familyId: string, appId: string, ...segments: string[]): CollectionReference<DocumentData>;
