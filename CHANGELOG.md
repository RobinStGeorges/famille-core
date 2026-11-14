# Changelog

## 0.2.0
- **Familles multiples** : une personne peut appartenir à plusieurs familles.
  - Nouveaux : `watchMyFamilies`, `selectFamily`, `deleteFamily`.
  - `createFamily` et `joinFamily` rendent la nouvelle famille active ; `leaveFamily` ne désactive la famille que si elle était active.
  - La « famille active » reste le champ `familyId` du profil : **les applications qui utilisent la version 0.1.x continuent de fonctionner sans changement**.
  - Nouvel index `users/{uid}/memberships/{familleId}` (nécessite les règles de sécurité de `famille-infra` ≥ 0.2.0).
  - La suppression d'une famille la marque « supprimée » (`deletedAt`) et retire tous ses membres.

## 0.1.1
- Correctif : après création ou jonction d'une famille, l'écran d'accueil s'affiche immédiatement.

## 0.1.0
- Première version : initialisation Firebase, session, authentification, famille, thème.
