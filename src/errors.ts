/** Erreur dont le message est déjà en français et affichable tel quel. */
export class FamilleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FamilleError';
  }
}

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Adresse e-mail ou mot de passe incorrect.',
  'auth/wrong-password': 'Adresse e-mail ou mot de passe incorrect.',
  'auth/user-not-found': 'Adresse e-mail ou mot de passe incorrect.',
  'auth/invalid-email': "Cette adresse e-mail n'est pas valide.",
  'auth/email-already-in-use': 'Un compte existe déjà avec cette adresse e-mail.',
  'auth/weak-password': 'Mot de passe trop faible : 6 caractères minimum.',
  'auth/too-many-requests': 'Trop de tentatives. Réessayez dans quelques minutes.',
  'auth/network-request-failed': 'Pas de connexion Internet. Vérifiez votre réseau.',
  'auth/user-disabled': 'Ce compte a été désactivé.',
  'auth/missing-password': 'Saisissez votre mot de passe.',
  'permission-denied': "Vous n'avez pas l'autorisation d'effectuer cette action.",
  unavailable: 'Service momentanément injoignable. Vérifiez votre connexion.',
};

/** Transforme n'importe quelle erreur en message français lisible. */
export function toFrenchMessage(e: unknown): string {
  if (e instanceof FamilleError) return e.message;
  const code = (e as { code?: string } | null)?.code;
  if (code) {
    if (MESSAGES[code]) return MESSAGES[code];
    const short = code.split('/').pop() ?? '';
    if (MESSAGES[short]) return MESSAGES[short];
  }
  return "Une erreur est survenue. Réessayez dans un instant.";
}
