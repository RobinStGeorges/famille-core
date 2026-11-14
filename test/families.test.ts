import { beforeEach, describe, expect, test, vi } from 'vitest';

// ---- Faux Firestore : on déclenche les « snapshots » à la main ----
type Listener = { ref: { path: string }; next: (snap: any) => void; error?: (e: unknown) => void };
const listeners: Listener[] = [];
const deleted: string[] = [];
const written: Array<{ path: string; data: unknown }> = [];

vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, ...seg: string[]) => ({ path: seg.join('/') }),
  doc: (_db: unknown, ...seg: string[]) => ({ path: seg.join('/') }),
  onSnapshot: (ref: { path: string }, next: (s: any) => void, error?: (e: unknown) => void) => {
    const l = { ref, next, error };
    listeners.push(l);
    return () => {
      const i = listeners.indexOf(l);
      if (i >= 0) listeners.splice(i, 1);
    };
  },
  deleteDoc: (ref: { path: string }) => {
    deleted.push(ref.path);
    return Promise.resolve();
  },
  setDoc: (ref: { path: string }, data: unknown) => {
    written.push({ path: ref.path, data });
    return Promise.resolve();
  },
  serverTimestamp: () => 'TS',
}));

let sessionListeners: Array<(s: any) => void> = [];
let currentSession: any = { status: 'noFamily', user: {}, displayName: 'Robin' };
vi.mock('../src/session', () => ({
  session: {
    subscribe: (fn: (s: any) => void) => {
      sessionListeners.push(fn);
      fn(currentSession);
      return () => (sessionListeners = sessionListeners.filter((f) => f !== fn));
    },
  },
}));
vi.mock('../src/services', () => ({
  getServices: () => ({ auth: { currentUser: { uid: 'u1' } }, db: {} }),
}));

import { watchMyFamilies, type MyFamily } from '../src/families';

const at = (path: string) => listeners.find((l) => l.ref.path === path);
const indexSnap = (docs: Array<{ id: string; pending?: boolean }>) =>
  at('users/u1/memberships')!.next({
    docs: docs.map((d) => ({ id: d.id, metadata: { hasPendingWrites: !!d.pending } })),
    metadata: { fromCache: false },
  });
const familySnap = (id: string, data: Record<string, unknown> | null, fromCache = false) =>
  at(`families/${id}`)!.next({ exists: () => data !== null, data: () => data, metadata: { fromCache } });
const setSession = (s: any) => {
  currentSession = s;
  sessionListeners.forEach((f) => f(s));
};

let last: { families: MyFamily[]; ready: boolean };
let stop: () => void;

beforeEach(() => {
  listeners.length = 0;
  deleted.length = 0;
  written.length = 0;
  sessionListeners = [];
  currentSession = { status: 'noFamily', user: {}, displayName: 'Robin' };
  last = { families: [], ready: false };
  stop = watchMyFamilies((families, ready) => (last = { families, ready }));
});

describe('liste de mes familles', () => {
  test('prête seulement quand l\'index ET les noms de toutes les familles sont chargés', () => {
    indexSnap([{ id: 'a' }, { id: 'b' }]);
    expect(last.ready).toBe(false);
    familySnap('a', { name: 'Famille A', ownerUid: 'u1' });
    expect(last.ready).toBe(false);
    familySnap('b', { name: 'Famille B', ownerUid: 'x' });
    expect(last.ready).toBe(true);
    expect(last.families.map((f) => [f.name, f.role])).toEqual([['Famille A', 'owner'], ['Famille B', 'member']]);
  });
  test('aucune famille : prête avec une liste vide', () => {
    indexSnap([]);
    expect(last).toEqual({ families: [], ready: true });
  });
  test('triées par nom, rôle déduit du propriétaire réel de la famille', () => {
    indexSnap([{ id: 'z' }, { id: 'a' }]);
    familySnap('z', { name: 'Zoé', ownerUid: 'x' });
    familySnap('a', { name: 'Alice', ownerUid: 'u1' });
    expect(last.families.map((f) => f.name)).toEqual(['Alice', 'Zoé']);
    expect(last.families[0].role).toBe('owner');
  });
  test('la famille active est repérée et suit les changements de session', () => {
    setSession({ status: 'ready', familyId: 'b', isOwner: false });
    indexSnap([{ id: 'a' }, { id: 'b' }]);
    familySnap('a', { name: 'A', ownerUid: 'u1' });
    familySnap('b', { name: 'B', ownerUid: 'x' });
    expect(last.families.map((f) => [f.id, f.active])).toEqual([['a', false], ['b', true]]);
    setSession({ status: 'ready', familyId: 'a', isOwner: true });
    expect(last.families.map((f) => [f.id, f.active])).toEqual([['a', true], ['b', false]]);
    setSession({ status: 'noFamily', user: {}, displayName: 'R' });
    expect(last.families.every((f) => !f.active)).toBe(true);
  });
});

describe('situations délicates', () => {
  test('une ligne d\'index pas encore validée par le serveur est ignorée (sinon lecture refusée à tort)', () => {
    indexSnap([{ id: 'a' }, { id: 'neuve', pending: true }]);
    expect(at('families/neuve')).toBeUndefined();
    familySnap('a', { name: 'A', ownerUid: 'u1' });
    expect(last.families.map((f) => f.id)).toEqual(['a']);
    // une fois validée par le serveur, la famille apparaît
    indexSnap([{ id: 'a' }, { id: 'neuve' }]);
    expect(at('families/neuve')).toBeDefined();
    familySnap('neuve', { name: 'Nouvelle', ownerUid: 'u1' });
    expect(last.families.map((f) => f.id)).toEqual(['a', 'neuve']);
    expect(deleted).toEqual([]); // et rien n'a été supprimé par erreur
  });
  test('famille supprimée : retirée de la liste et ligne d\'index nettoyée', () => {
    indexSnap([{ id: 'a' }, { id: 'b' }]);
    familySnap('a', { name: 'A', ownerUid: 'u1' });
    familySnap('b', { name: 'B', ownerUid: 'x', deletedAt: 'ts' });
    expect(last.families.map((f) => f.id)).toEqual(['a']);
    expect(deleted).toEqual(['users/u1/memberships/b']);
  });
  test('accès refusé (on a été retiré) : retirée et nettoyée, une seule fois', () => {
    indexSnap([{ id: 'a' }]);
    at('families/a')!.error!(new Error('permission-denied'));
    expect(last).toEqual({ families: [], ready: true });
    expect(deleted).toEqual(['users/u1/memberships/a']);
    at('families/a')?.error?.(new Error('permission-denied'));
    expect(deleted).toHaveLength(1);
  });
  test('famille introuvable depuis le cache : on attend le serveur sans rien supprimer', () => {
    indexSnap([{ id: 'a' }]);
    familySnap('a', null, true);
    expect(last.ready).toBe(false);
    expect(deleted).toEqual([]);
    familySnap('a', { name: 'A', ownerUid: 'u1' });
    expect(last.ready).toBe(true);
  });
  test('famille réellement inexistante (réponse du serveur) : nettoyée', () => {
    indexSnap([{ id: 'a' }]);
    familySnap('a', null, false);
    expect(deleted).toEqual(['users/u1/memberships/a']);
    expect(last.families).toEqual([]);
  });
  test('une famille retirée de l\'index n\'est plus écoutée', () => {
    indexSnap([{ id: 'a' }, { id: 'b' }]);
    familySnap('a', { name: 'A', ownerUid: 'u1' });
    familySnap('b', { name: 'B', ownerUid: 'u1' });
    indexSnap([{ id: 'a' }]);
    expect(at('families/b')).toBeUndefined();
    expect(last.families.map((f) => f.id)).toEqual(['a']);
  });
});

describe('comptes créés avant les familles multiples', () => {
  test('la famille active absente de l\'index y est ajoutée, une seule fois', () => {
    setSession({ status: 'ready', familyId: 'ancienne', isOwner: true });
    indexSnap([]);
    expect(written).toEqual([{ path: 'users/u1/memberships/ancienne', data: { joinedAt: 'TS' } }]);
    indexSnap([]);
    setSession({ status: 'ready', familyId: 'ancienne', isOwner: true });
    expect(written).toHaveLength(1);
  });
  test('rien à ajouter quand la famille active est déjà indexée ou sans famille active', () => {
    setSession({ status: 'ready', familyId: 'a', isOwner: true });
    indexSnap([{ id: 'a' }]);
    expect(written).toEqual([]);
  });
  test('sans famille active, aucune écriture', () => {
    indexSnap([]);
    expect(written).toEqual([]);
  });
});

describe('arrêt', () => {
  test('toutes les écoutes sont arrêtées', () => {
    indexSnap([{ id: 'a' }]);
    expect(listeners.length).toBeGreaterThan(1);
    stop();
    expect(listeners).toEqual([]);
    expect(sessionListeners).toEqual([]);
  });
  test('plus aucune notification après l\'arrêt', () => {
    indexSnap([{ id: 'a' }]);
    familySnap('a', { name: 'A', ownerUid: 'u1' });
    const before = last;
    stop();
    // un snapshot tardif ne doit rien changer
    expect(last).toBe(before);
  });
});
