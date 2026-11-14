# famille-core

Socle **minimal** commun aux applications du portail familial « Le Petit Perchoir ».
Ce paquet ne contient aucune logique métier d'application (ni courses, ni jeux).

## Contenu

| Module | Rôle |
|---|---|
| `initFamille(config)` | Initialise Firebase (Auth + Firestore avec cache hors-ligne) et démarre la session |
| `session` | Store (compatible Svelte `$session`) : `loading`, `signedOut`, `noFamily`, `ready` |
| `signUp`, `signIn`, `signOutUser`, `resetPassword` | Authentification |
| `createFamily`, `createInvite`, `joinFamily`, `leaveFamily`, `deleteFamily`, `selectFamily`, `watchMembers` | Espace familial |
| `watchMyFamilies(cb)` | Liste des familles de l'utilisateur (une personne peut en avoir plusieurs) ; `cb(familles, prêt)` |
| `appCollection(familyId, appId, ...)` | Chemin des données d'une app : `families/{fid}/apps/{appId}/...` |
| `toFrenchMessage(e)` | Messages d'erreur en français |
| `theme.css`, `initTheme`, `setThemeChoice` | Charte graphique, mode clair / sombre / auto |

## Utilisation dans une application

```
npm install git+https://github.com/RobinStGeorges/famille-core.git#v0.2.0
```

```ts
import 'famille-core/theme.css';
import { initFamille, initTheme, session } from 'famille-core';

initTheme();
initFamille({ apiKey: '…', projectId: '…', /* config Firebase */ });
```

`firebase` est une **dépendance de pair** : l'application doit l'installer elle-même
(une seule copie de Firebase doit exister dans le bundle).

## Versions

Chaque application **fige** la version du core qu'elle utilise (`#v0.1.0`).
Publier une nouvelle version ne casse donc aucune application : chacune migre quand elle le décide.
Règles : SemVer. Changement cassant = version majeure.

## Développement

```
npm install
npm test          # tests unitaires
npm run build     # compile src/ vers dist/
```

Le dossier `dist/` est **versionné volontairement** : les apps installent ce dépôt depuis Git,
sans étape de compilation. Après toute modification : `npm run build`, commit, puis tag.

Publier une version :

```
git tag v0.1.1
git push origin main --tags
```

## Familles multiples

Une personne peut appartenir à plusieurs familles. La **famille active** est le champ `familyId` du profil
(`users/{uid}`) : c'est lui que lisent `session` et donc toutes les applications. Choisir une autre famille
(`selectFamily`) change ce champ ; les applications, qui ne connaissent que « la famille de la session »,
n'ont rien à modifier. Les données de chaque famille restent séparées (`families/{id}/apps/…`).

L'index `users/{uid}/memberships/{familleId}` sert uniquement à **lister** les familles d'une personne.
