import { type FirebaseOptions } from 'firebase/app';
import { type FamilleServices } from './services';
/**
 * À appeler une seule fois au démarrage de chaque application, avec la
 * configuration Firebase de l'environnement (dev ou prod).
 * Active le cache hors-ligne de Firestore (IndexedDB, multi-onglets).
 */
export declare function initFamille(config: FirebaseOptions): FamilleServices;
