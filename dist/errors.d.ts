/** Erreur dont le message est déjà en français et affichable tel quel. */
export declare class FamilleError extends Error {
    constructor(message: string);
}
/** Transforme n'importe quelle erreur en message français lisible. */
export declare function toFrenchMessage(e: unknown): string;
