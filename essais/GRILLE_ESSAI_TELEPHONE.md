# Grille d'essai sur téléphone — retours du 25/10 (A1 à B6)

APK : `apk-test/vault-watch-test-2.3.6-essai-complet.apk` (construit le 2026-10-27, 500 tests verts).
À installer par-dessus l'application actuelle (même signature de debug : les données sont gardées si l'ancienne version était aussi un APK de test ; sinon, désinstaller d'abord, après une sauvegarde Drive).

Pour chaque ligne : ✅ ça marche · ❌ ça ne marche pas (écrire ce qu'on voit, joindre une capture).
Cette grille remplace, pour l'essai, les cases K2 / K3 des clôtures dans `PLAN_V2.md`.

## 0. Avant de commencer (étape S0 de la sauvegarde)
| # | À faire | Attendu | Résultat |
|---|---|---|---|
| 0.1 | Sur l'**ancienne** version, si elle est encore installée : Réglages > Sauvegarde, lire la ligne « Dernière tentative » | Recopier le texte exact ici : | |
| 0.2 | D'où vient l'application installée : Play Store ou fichier APK ? | Noter : | |

## 1. Sauvegarde (A1, A2)
| # | À faire | Attendu | Résultat |
|---|---|---|---|
| A1.1 | Réglages > Sauvegarde, connecté à Google | Un bloc d'état en tête : « Sauvegardé à HH:MM » (ou une cause en clair) | |
| A1.2 | Cocher un épisode, rester dans l'application, attendre ~35 s, rouvrir Réglages > Sauvegarde | « Sauvegardé à HH:MM » avec l'heure du moment, sans rien d'autre à faire | |
| A1.3 | Fermer l'application depuis les récentes après une modification, la rouvrir | Pas de message inquiétant ; état « Sauvegardé » | |
| A1.4 | Couper le Wi-Fi et les données, cocher un épisode, attendre 2 min | État « En attente : hors connexion » ; bandeau seulement après un délai | |
| A1.5 | Rétablir le réseau | L'état repasse tout seul à « Sauvegardé à HH:MM » | |
| A2.1 | Pendant tout l'essai, regarder les notifications Android | Aucune notification de sauvegarde ; aucun bandeau en cas normal | |

## 2. Disponibilité (A3)
| # | À faire | Attendu | Résultat |
|---|---|---|---|
| A3.1 | Ouvrir la fiche d'un film actuellement en salle (titre : ______ ) | Pastille « Au cinéma », pas « Pas encore sorti » | |
| A3.2 | Fiche d'un film d'un streaming que tu as | Pastille « Disponible » avec le logo de la plateforme | |
| A3.3 | Fiche d'un film à venir | « Pas encore sorti » avec la date | |
| A3.4 | Mes listes > À voir : regarder les affiches (laisser 1-2 lancements pour le relevé) | Pastilles visibles sur les affiches | |
| A3.5 | Ce soir > À voir ce soir | Aucun film « Au cinéma » dedans ; ils sont dans « Pas encore disponible » | |

## 3. Suivi des épisodes (A4, B5)
| # | À faire | Attendu | Résultat |
|---|---|---|---|
| A4 | Ajouter une série comme « Vue » | Tous les épisodes diffusés sont cochés (toutes saisons) | |
| B5 | Cocher un épisode au milieu d'une saison | Fenêtre « cocher aussi les précédents ? » ; « Oui » coche les précédents de la saison | |

## 4. Navigation et affichage (A5, A6, A7, A11, B4)
| # | À faire | Attendu | Résultat |
|---|---|---|---|
| A5 | Découvrir : ajouter un titre depuis une rangée | La carte reste en place, la liste ne bouge pas sous le doigt | |
| A6 | Ouvrir la liste d'un ami | Écran plein cadre, rien de décalé ni coupé | |
| A7.1 | Ce soir > En attente > « Tout voir » | Écran plein cadre, rien de décalé | |
| A7.2 | Dans « Tout voir », bouton retour Android | Revient à l'écran précédent (pas aux listes) | |
| A11 | Glisser latéralement sur Ce soir | Pas de changement d'onglet, pas de saccade | |
| B4 | Idée du soir | L'affiche du film est visible, nette | |

## 5. Recherche (A8, A9, A10, B2)
| # | À faire | Attendu | Résultat |
|---|---|---|---|
| A8 | Taper dans la barre de recherche | Une croix ✕ efface la saisie | |
| A9 | Chercher « avenger », puis « Voir plus » | Plus de résultats à chaque appui, sans doublon | |
| A10 | Chercher un titre au singulier (ex. un titre connu qui n'apparaissait qu'au pluriel) | Il est proposé | |
| B2.1 | Recherche > mode « Mot-clé » (à la place d'Explorer) : taper « marvel » | Des mots-clés en puces ; en toucher un → films et séries | |
| B2.2 | Filtres du mode Mot-clé (type, année, genre, tri) | Ils s'appliquent | |

## 6. Listes, filtres, sagas (B1, B3)
| # | À faire | Attendu | Résultat |
|---|---|---|---|
| B1.1 | Réglages > Mes plateformes : cocher tes abonnements | Choix gardé | |
| B1.2 | Mes listes > Filtres > « Sur mes plateformes » | Seuls les titres sur tes plateformes ; « Aucun titre ne correspond » + Réinitialiser si vide | |
| B1.3 | Découvrir > « Sur mes plateformes » | Les rangées se recalculent | |
| B1.4 | Même panneau de filtres dans Découvrir, Ce soir, Recherche | Type, année, genre, tri présents | |
| B3.1 | Mes listes avec au moins 2 films d'une saga | En-tête « Saga … — N titres », dans l'ordre de sortie | |
| B3.2 | Réglage « Sagas » (rangée d'outils), éteindre | Le regroupement disparaît ; retenu après relance | |
| B3.3 | Tris de la liste : date d'ajout, alphabétique, date de sortie | Chacun trie correctement | |

## 7. Fusion des conflits (B6) — risque de perte de données : sauvegarder d'abord
| # | À faire | Attendu | Résultat |
|---|---|---|---|
| B6.0 | Avant l'essai : Réglages > Sauvegarde > export des données (fichier de secours) | Fichier enregistré | |
| B6.1 | Provoquer un conflit (modifier sur ce téléphone alors que le Drive a été changé ailleurs) | Écran de conflit avec « Fusionner » en premier et un résumé « Ce téléphone reçoit / Le Drive reçoit » | |
| B6.2 | Appuyer sur « Fusionner » | Rien ne disparaît ; puis « Sauvegardé à HH:MM » | |
| B6.3 | Mes listes | Titres, épisodes vus et listes des deux versions sont présents | |

Rien de ce qui est marqué ❌ n'est considéré comme fini. Chaque ✅ de A1 à B6 permet de cocher le point correspondant dans `PLAN_V2.md`.
