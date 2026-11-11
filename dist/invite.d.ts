/** Génère un code d'invitation aléatoire (cryptographiquement sûr). */
export declare function generateInviteCode(): string;
/** Affichage lisible : XXXXX-XXXXX */
export declare function formatInviteCode(code: string): string;
/** Normalise la saisie d'un utilisateur : majuscules, sans espaces ni tirets. */
export declare function normalizeInviteCode(input: string): string;
