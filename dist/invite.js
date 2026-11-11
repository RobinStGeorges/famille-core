// Alphabet sans caractères ambigus (pas de 0/O, 1/I/L).
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 10;
/** Génère un code d'invitation aléatoire (cryptographiquement sûr). */
export function generateInviteCode() {
    const limit = 256 - (256 % ALPHABET.length); // rejet pour éviter le biais
    let out = '';
    while (out.length < CODE_LENGTH) {
        const bytes = new Uint8Array(CODE_LENGTH * 2);
        crypto.getRandomValues(bytes);
        for (const b of bytes) {
            if (b < limit && out.length < CODE_LENGTH)
                out += ALPHABET[b % ALPHABET.length];
        }
    }
    return out;
}
/** Affichage lisible : XXXXX-XXXXX */
export function formatInviteCode(code) {
    const c = normalizeInviteCode(code);
    return c.length > 5 ? `${c.slice(0, 5)}-${c.slice(5)}` : c;
}
/** Normalise la saisie d'un utilisateur : majuscules, sans espaces ni tirets. */
export function normalizeInviteCode(input) {
    return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}
