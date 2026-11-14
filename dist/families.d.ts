/** Une famille dont l'utilisateur fait partie. */
export interface MyFamily {
    id: string;
    name: string;
    role: 'owner' | 'member';
    active: boolean;
}
/**
 * Écoute la liste des familles de l'utilisateur (« mes familles »).
 * `ready` passe à vrai quand la liste est complète (index et noms de familles chargés).
 *
 * Un index `users/{uid}/memberships/{familleId}` recense les familles de chaque personne ; les noms
 * viennent des familles elles-mêmes. Les lignes périmées (famille supprimée, accès retiré) sont
 * nettoyées au passage, et l'index est complété pour les comptes créés avant les familles multiples.
 */
export declare function watchMyFamilies(onData: (families: MyFamily[], ready: boolean) => void, onError?: (e: unknown) => void): () => void;
