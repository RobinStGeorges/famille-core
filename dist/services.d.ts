import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
export interface FamilleServices {
    app: FirebaseApp;
    auth: Auth;
    db: Firestore;
}
export declare function setServices(s: FamilleServices): void;
export declare function getServices(): FamilleServices;
