import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

export interface FamilleServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

let services: FamilleServices | null = null;

export function setServices(s: FamilleServices): void {
  services = s;
}

export function getServices(): FamilleServices {
  if (!services) {
    throw new Error("famille-core : appelez initFamille(config) avant toute autre fonction.");
  }
  return services;
}
