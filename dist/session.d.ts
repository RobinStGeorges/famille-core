import { type User } from 'firebase/auth';
import type { FamilleServices } from './services';
export type Session = {
    status: 'loading';
} | {
    status: 'signedOut';
} | {
    status: 'noFamily';
    user: User;
    displayName: string;
} | {
    status: 'ready';
    user: User;
    displayName: string;
    familyId: string;
    familyName: string;
    isOwner: boolean;
};
/** Store compatible Svelte (`$session`) et utilisable partout (`session.subscribe`). */
export declare const session: {
    subscribe(run: (s: Session) => void): () => void;
};
export declare function getSession(): Session;
/** Démarre l'écoute de la connexion, du profil et de la famille. Appelée par initFamille. */
export declare function startSession({ auth, db }: FamilleServices): void;
