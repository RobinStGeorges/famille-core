import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, } from 'firebase/firestore';
import { setServices, getServices } from './services';
import { startSession } from './session';
let started = false;
/**
 * À appeler une seule fois au démarrage de chaque application, avec la
 * configuration Firebase de l'environnement (dev ou prod).
 * Active le cache hors-ligne de Firestore (IndexedDB, multi-onglets).
 */
export function initFamille(config) {
    if (started)
        return getServices();
    started = true;
    const app = initializeApp(config);
    const auth = getAuth(app);
    const db = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
    const services = { app, auth, db };
    setServices(services);
    startSession(services);
    return services;
}
