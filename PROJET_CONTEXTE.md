# PROJET_CONTEXTE — Vault Watch

## But du projet
Application personnelle de suivi de films et séries, en remplacement de TVShowTime (arrêté).
Permet de savoir, pour chaque film ou série, ce qu'on a vu, ce qu'on veut voir, et — pour les séries — d'en suivre la progression épisode par épisode.

## Où en est le projet (2026-09-19)
**Application Android publiée sous le nom « Vault Watch », version 2.1** (2026-09-03 — la 2.0 du
2026-08-27 portait l'ancien nom). Une passe de corrections issue des retours du 10 septembre est
faite ; elle a été **validée à l'écran dans un navigateur en largeur téléphone le 2026-09-19**
(aucun défaut). Restent à confirmer sur l'appareil les seuls gestes propres au téléphone
(appui long, photo d'avatar, bouton retour, restauration Drive), puis publication en 2.2 (paquet signé prêt depuis le 2026-09-19).
Elle tourne entièrement sur le téléphone :
plus aucun serveur, plus aucun back. Le catalogue vient de TMDB en direct, le suivi vit
dans un SQLite embarqué, et la sauvegarde va dans le Google Drive de l'utilisateur.

Le dossier `server/` est conservé dans le dépôt comme base d'une éventuelle mise en ligne
future — il n'est plus utilisé par l'application.

### Point du 2026-10-27 — sagas regroupées (mission B3)
- Mission « Sagas regroupées » **codée et essayée** (454 tests verts) : en-têtes « Saga … — N titres » dans Mes listes, réglage « Sagas ». Reste la
  vérification par une autre IA et la capture finale de Kinder (étape B3-2). Suite figée : B1 + B2 (filtres, mot-clé), puis B6 (fusion).

### Point du 2026-10-27 — disponibilité des titres (mission A3)
- Mission « Disponibilité des titres » **codée et essayée** (428 tests verts) : cinq états sur fiche et affiches, « Ce soir » trié par
  « regardable », relevé rangé dans le suivi. Reste la vérification par une autre IA et la capture finale de Kinder (étape A3-4).
- Suite figée : B3 (sagas), B1 + B2 (filtres, mot-clé), B6 (fusion) — voir « Décision du 2026-10-27 — feuille de route ».

### Point du 2026-10-27 — sauvegarde cloud
- Mission « Sauvegarde cloud » (A1 / A2 des retours du 25/10) : étapes S1 à S4 **codées et essayées sur émulateur**
  (370 tests verts) ; S5 (vérification par une autre IA, puis capture finale de Kinder sur téléphone) à faire.
  Détail, critères et captures : `PLAN_V2.md`.
- Restent ouverts : S0 (lire « Dernière tentative » sur le téléphone de Kinder), B6 (fusion en cas de conflit), et les
  points des retours du 25/10 non traités.

### Point du 2026-10-06
- **2.3 envoyée en examen chez Google** (en attente de validation ; ne plus la modifier).
- **Correctif « Ce soir » codé** sur la branche `correctif-ce-soir` (balayage trop sensible, « Tout voir » décalé) :
  tests verts, mais **jamais vu à l'écran**. Sera la 2.3.1. Détail : `CHANGELOG.md`.
- Reste : APK de test → essai de Kinder sur téléphone → accord → fusion → 2.3.1 après validation de la 2.3.

## Utilisateur & horizon
- **Aujourd'hui** : usage personnel, sur téléphone, hors ligne pour le suivi (le réseau ne
  sert qu'au catalogue). Gestion de **profils locaux** : plusieurs profils sur le même
  appareil, sans compte ni mot de passe.
- **Cible gardée, non décidée** : mise en ligne et ouverture à quelques proches. Voir
  « Ce qui reste ouvert ».

## Profils
Le suivi appartient à un **profil** identifié par un **UUID portable** (pas un numéro de
ligne local). Raison : c'est la brique qui permet, le jour d'une mise en ligne, de rattacher
un profil local à un compte en ligne **sans re-migrer ni perdre ses données**. C'est aussi
ce qui fait fonctionner la sauvegarde et la restauration entre appareils.
- Profils locaux, choisis / créés / renommés / **supprimés** depuis l'écran « Mes profils ».
- Chacun a son **avatar** : une couleur et un symbole, ou une photo de la galerie.
- Aucun mot de passe. Les données d'un profil ne quittent l'appareil que par une sauvegarde
  demandée ou automatique, vers le Drive de l'utilisateur.

## Source des données
Les métadonnées (titres, synopsis, casting, saisons, épisodes, affiches, durées, dates de
sortie, disponibilité en streaming) proviennent de l'API **TMDB**, dans la langue choisie.
Les services de streaming n'exposent pas ces données : TMDB est la seule source.

## Périmètre construit
1. **Chercher** un film ou une série : par titre, par acteur, par genre. Par acteur, par genre
   et dans les tendances, les titres déjà suivis sont masqués.
2. **Suivre** un titre, avec 4 statuts : à voir, en cours, vu, abandonné.
3. **Marquer vu** : film binaire ; série = épisodes cochés, avec raccourcis « toute la
   saison » et « toute la série » (qui ne cochent que ce qui est **diffusé**).
4. **Progression** d'une série et **prochain épisode**, calculés sur les épisodes réellement
   sortis — pas sur ceux seulement annoncés.
5. **Listes personnalisées**, remplissables en masse depuis la bibliothèque.
6. **Note personnelle** : étoiles et avis écrit.
7. **Statistiques** : temps passé, bibliothèque, répartition, note moyenne.
8. **« Quoi regarder ce soir ? »** : reprendre une série, à voir, pas encore sorti (en
   dernier, replié), et suggestions à parts égales films / séries.
9. **Sauvegarde** : fichier local, export CSV Letterboxd, et Drive de l'utilisateur —
   manuelle, ou automatique (30 s après une modification, en quittant, au retour, au retour du réseau). L'état et la cause
   d'un blocage sont dits en clair dans Réglages > Sauvegarde ; un bandeau n'alerte que si quelque chose est bloqué.
10. **Saga** : dans la fiche d'un film, les autres films de sa saga dans l'ordre de sortie.
11. **Disponibilité** : cinq états (pas encore sorti, au cinéma, sorti sans streaming, location / achat, disponible + plateformes) sur la
    fiche et les affiches ; « Ce soir » ne montre à regarder que le regardable ; « Mes listes » montre tout.
12. **Sagas regroupées** : dans Mes listes, les films d'une même saga sont regroupés sous un en-tête, dans l'ordre de sortie ; réglage « Sagas ».

## Architecture (3 couches, strict)
Tout tient dans `client/`, il n'y a plus de séparation par processus :
- **UI** : les écrans React (`client/src/components/`).
- **Logique** : `store.js` (règles métier), `backup.js` (sauvegarde), `api.js` (porte unique
  entre l'UI et le reste).
- **Données** : `db.js` (SQLite embarqué) et `tmdb.js` (catalogue externe).

Une seule pièce écrite spécialement pour Android : `DriveAuthPlugin.java`, qui renouvelle
l'autorisation Drive sans réafficher l'écran de compte Google.

## Décisions figées
- **[DÉCIDÉ, PAS ENCORE CONSTRUIT — aujourd'hui la clé est toujours embarquée] Relais Cloudflare Workers pour la clé TMDB (2026-09-26, remplace la décision « aucun
  serveur » ci-dessous pour ce seul usage).** La clé TMDB de Kinder n'est plus embarquée dans
  l'application : un relais gratuit, hébergé sur Cloudflare Workers, la garde secrète et
  transmet les appels à TMDB à sa place. Ce relais ne s'endort jamais (pas de délai de
  réveil), contrairement aux formules gratuites de type Render. L'utilisateur peut aussi
  renseigner sa propre clé TMDB depuis un écran des réglages qui explique pas à pas comment
  la créer (liens, informations à saisir, où cliquer) ; une fois renseignée, elle remplace
  **définitivement** le relais pour cet utilisateur — la clé de Kinder n'est alors plus jamais
  utilisée. La clé personnelle est un champ du **profil** : elle voyage donc automatiquement
  avec la sauvegarde Drive déjà existante (dossier caché de l'application, invisible et
  inaccessible aux autres applications), sans nouveau mécanisme de synchronisation.
  Justification : une clé unique partagée par tous les utilisateurs peut être bloquée par
  TMDB si quelqu'un en abuse, coupant l'application pour tout le monde d'un coup ; le relais
  isole ce risque, et une clé personnelle en met l'utilisateur définitivement à l'abri.
- **Aucun serveur applicatif, aucun hébergement de données.** Ancienne formulation, conservée
  pour ce qu'elle continue de couvrir : pas de back-end métier, pas de base de données en
  ligne, pas de compte hébergé par l'éditeur. Le relais Cloudflare ci-dessus est une exception
  strictement limitée à cacher la clé TMDB — il ne stocke aucune donnée personnelle et ne voit
  jamais le suivi d'un utilisateur.
- **Aucune monétisation** : ni application payante, ni abonnement, ni publicité. Franchir
  cette ligne imposerait la licence commerciale TMDB.
- **Mention TMDB obligatoire** dans l'application, et ne jamais masquer son identité auprès
  de l'API.
- **Les données personnelles restent sur l'appareil**, sauf sauvegarde demandée par
  l'utilisateur vers **son propre** Drive. L'éditeur n'a aucun accès, aucun serveur, aucune
  copie.
- **Abandonné (2026-08-27) : la connexion aux comptes Netflix, Canal+ et Disney+.** Aucun de
  ces services n'expose l'historique d'un compte personnel, et s'y connecter à la place de
  l'utilisateur serait interdit par leurs conditions autant que fragile. Si le besoin
  revient, la seule voie acceptable est l'**import d'un fichier que l'utilisateur exporte
  lui-même**, ou un intermédiaire à API publique comme Trakt. Ne pas rouvrir le sujet du
  côté « se connecter à leur place ».
- **Pas de sauvegarde automatique d'Android (2026-09-19).** Le réglage `allowBackup` est
  coupé : Android ne copie pas la base de suivi vers le compte Google du téléphone. La seule
  voie de sauvegarde est celle vers le Drive de l'utilisateur, déjà en place et validée sur
  l'appareil. Verrouillé par un test (`configuration.test.js`). Prend effet avec la 2.2.
- **Le code serveur n'est pas supprimé** : il reste dans le dépôt comme base d'une
  éventuelle mise en ligne. Mis de côté, pas jeté.
- **Rattachement : socle Application locale React** (D40 de la Révision Outil IA, 2026-09-18), avec l'option sauvegarde vers le Drive de l'utilisateur. L'ancienne stack V1 est archivée dans `_archives\STACK_STANDARD_V1.md`.
- **Notifications de sortie (figé le 2026-09-27).** Notifier l'utilisateur quand un film suivi
  sort au cinéma, quand une série suivie diffuse un nouvel épisode, ou quand une nouvelle saison
  est annoncée. Périmètre : listes, favoris et likes de l'utilisateur.
  1. Si TMDB donne déjà une date connue au moment où l'élément est suivi, une notification
     locale est programmée pour ce jour-là, une seule fois — pas de revérification pour cet
     élément.
  2. Si la date n'est pas encore connue, l'élément passe au statut « en attente » et entre dans
     un cycle de vérification périodique.
  3. Le cycle ne traite que les éléments « en attente » (jamais toute la bibliothèque), tourne au
     maximum une fois par jour, déclenché au lancement de l'application — pas de tâche de fond,
     pas de serveur.
  4. Le cycle corrige aussi une date qui aurait changé (report de sortie) tant que l'élément est
     « en attente ».
  5. Un élément notifié ou marqué « terminé » sort définitivement du cycle.
  6. Compromis accepté : si l'application reste fermée le jour J, la notification part en retard,
     au prochain lancement.
  7. Nouvelle dépendance validée : un plugin de notifications locales Android pour Capacitor
     (ex. `@capacitor/local-notifications`), l'application n'ayant aujourd'hui aucun moyen de
     notifier hors de l'application ouverte.

- **Refonte visuelle (figée le 2026-10-03).** Identité conservée (crème, doré, titres serif) ; une
  hiérarchie de titres, des échelles communes, des blocs communs ; Découvrir en rangées d'affiches ;
  quatre états par écran (chargé, chargement en fantômes, vide, hors connexion). Plan complet,
  maquette (30 écrans) et missions M1 à M7 : `PLAN_V2.md`, « Refonte visuelle — PLAN COMPLET ».
  Une mission à la fois, essayée sur téléphone par Kinder avant la suivante. M1 et M2 validées ; M3 à M7 codées le 2026-10-03 (Kinder teste à la fin de la série, décision du jour) ; chantier clos après son essai sur téléphone.
- **Règle de schéma (2026-10-03).** Aucun commentaire SQL ni apostrophe/point-virgule parasite dans le
  schéma de `db.js` : le moteur SQLite du téléphone s'y étrangle et l'application ne démarre plus.

## Contraintes projet
- 3 couches uniquement (UI / Logique / Données).
- Maximum 5 fichiers de documentation : `PROJET_CONTEXTE.md`, `PLAN_V2.md`,
  `PLAN_ANDROID.md`, `README.md`, `CHANGELOG.md`.
- Aucune structure créée « pour le futur ».
- Le plafond V1 « 20 modules » a été volontairement relevé pour la V2 (voir `PLAN_V2.md`).

## Ce qui reste ouvert
- **Amis par code (codé, embarqué dans la 2.3 le 2026-10-03 ; ex-« cadré, rien de codé »)** : fiche partagée facultative sur
  Firebase, sans compte, sauvegarde privée toujours sur le Drive de l'utilisateur. Si elle est
  construite, elle **modifie** deux décisions figées (« aucun serveur », « données sur
  l'appareil ») — uniquement pour cette fiche facultative — et impose de mettre à jour le
  questionnaire Play Store et la politique de confidentialité *avant* publication. Détail dans
  `PLAN_V2.md`, point 4 bis.
- **La mise en ligne** — idée conservée, **non décidée**. Elle conditionne tout ce qui est
  social (voir les profils d'autres utilisateurs, partager des listes). Ce n'est pas une
  fonction de plus : c'est le moment où l'application cesse d'être locale, avec hébergement,
  comptes, base PostgreSQL, données partagées, RGPD et modération. À trancher comme une
  décision de projet, pas comme une tranche de développement.
- Les idées notées dans `PLAN_V2.md` et pas encore faites : l'onglet « Découvrir » (à cadrer)
  et les suggestions qui reviennent trop souvent (attend une capture de Kinder).
- **Retours d'usage du 2026-09-10** : tous traités le 2026-09-11 et validés à l'écran le
  2026-09-19 (détail dans `PLAN_V2.md`, point 13). **Reste l'essai sur l'appareil** pour les
  gestes propres au téléphone, puis publication en 2.2.

- **Retours d'essai du 2026-10-25** : 18 points notés (11 anomalies, 7 nouveautés), **rien de
  codé**. Liste, ordre proposé et cases à cocher dans `PLAN_V2.md`, « Retours d'essai du 2026-10-25 ».

## Décision du 2026-10-03 — la 2.3 publie les amis
Le partage (amis par code) est allumé dans la version publiée (`client/.env.production`). Les deux décisions figées
« aucun serveur » et « données sur l'appareil » sont donc modifiées pour cette seule fiche facultative (Firebase).
L'avatar en photo part en miniature de 48 px. Politique de confidentialité et formulaire Play Store mis en conformité.

## Décision du 2026-10-26 — logique de la sauvegarde cloud (FIGÉE, validée par Kinder)
Constat (essai émulateur, compte de test, build debug) : le circuit Drive marche, mais la logique d'ensemble est
incohérente — un seul déclencheur sérieux (quitter l'application, non garanti sous Android), un bandeau
« modifications non sauvegardées » affiché dès la première modification alors que l'envoi automatique est prévu, et
des échecs réels (conflit, autorisation, réseau) sans message clair.
- **La sauvegarde est un service silencieux ; le bandeau est une alerte rare**, jamais l'état normal.
- **Déclencheurs automatiques** : 30 s après la dernière modification (application ouverte) ; en quittant ; au retour /
  au lancement ; au retour du réseau. Jamais d'écran Google (`interactive: false`, inchangé).
- **Bandeau seulement si bloqué**, texte et bouton selon la cause : conflit (choix existant), autorisation (Reconnecter),
  hors connexion prolongée (après un délai). Interrupteur automatique coupé : rappel manuel discret.
- **Réglages > Sauvegarde** montre en permanence l'état : « Sauvegardé à HH:MM » ou « En attente : <cause> ».
- **Notifications** : aucune nouvelle notification Android pour la sauvegarde. Les notifications restent celles des
  sorties. Un filet de sécurité programmé (« non sauvegardé depuis 2 jours », annulé à chaque réussite) est une option
  **non retenue pour l'instant**, à rouvrir plus tard.
- **Hors de cette mission** : la fusion de deux versions en conflit (B6) — à cadrer à part, règles écrites avant tout code.
- **Inconnue restante** : sur le téléphone de Kinder, l'échec vient-il d'un conflit ou de la clé de signature du Play Store
  (clé de debug enregistrée chez Google : essai émulateur réussi) ? Lecture de « Dernière tentative » demandée (étape S0).

## Décision du 2026-10-27 — permission Android ACCESS_NETWORK_STATE (validée par Kinder)
La permission est ajoutée à `AndroidManifest.xml` (le test `configuration.test.js` la liste explicitement). Raison, constatée
sur émulateur : sans elle le WebView ne voit jamais la connexion changer, donc la sauvegarde ne reprend pas au retour du
réseau. Permission « normale » : aucune fenêtre de demande à l'utilisateur, aucun lien avec le formulaire « Sécurité des
données », mais elle figure dans la liste des autorisations de la fiche Play Store. Tout ajout de permission se décide ainsi.

## Décision du 2026-10-27 — feuille de route des retours du 25/10 (FIGÉE, validée par Kinder)
Cinq missions, **une à la fois**, dans cet ordre, chacune avec ses phases 3 à 6 et un critère de fin écrit par Kinder :
1. **A3 — Disponibilité des titres** (socle commun).
2. **B3 — Sagas regroupées** dans les vues de liste.
3. **B1 + B2 — Filtres unifiés, puis recherche par mot-clé.**
4. **B6 — Fusion des conflits de sauvegarde.**
**B7 (ordre de lecture des mangas) : ABANDONNÉ** — TMDB ne le fournit pas ; à rouvrir seulement via Wikidata si Kinder le redemande.
Décisions de fond :
- **Cinq états de disponibilité**, affichés en pastille : Pas encore sorti (avec la date) · Au cinéma · Sorti, pas en streaming ·
  En location / achat · Disponible (logos des plateformes). Pour une série : Pas encore sorti · Disponible · Pas disponible en streaming.
- **« Au cinéma »** = le film figure dans la liste TMDB « en salle » de la **région du catalogue** (`/movie/now_playing`), relue au plus
  une fois par jour. Pas d'heuristique sur les dates.
- **Disponibilité** = offres de la région (`watch/providers`), rangées dans le suivi et rafraîchies par petits lots au lancement (même
  mécanique que `backfillReleaseDates`, **dans le même appel** : aucun appel de plus par titre). Données **dérivées** : elles ne sont
  **pas** dans la sauvegarde (pas de changement de format) ; une restauration les refait au lancement.
- **« À voir ce soir »** ne garde que ce qui est regardable maintenant ; le bloc « Pas encore sorti » devient « Pas encore disponible »
  et réunit les trois états non regardables, chacun avec sa pastille. Une disponibilité encore **inconnue** ne cache jamais un titre.
- **B1** : un panneau de filtres partagé (Films/Séries, « seulement sur mes plateformes » choisies **une fois** dans Réglages, genre,
  année, tri) sur Recherche, Découvrir, Suggestions et Mes listes. **B2** : « Explorer » devient « Mot-clé » (mots-clés TMDB).
- **B3** : saga rangée par film (`belongs_to_collection`, rattrapée dans le même appel que la disponibilité) ; en liste, ≥ 2 titres d'une
  même saga sont regroupés sous « Saga — N titres », dans l'ordre de sortie ; réglage « Regrouper les sagas » actif par défaut.
- **B6** : 3ᵉ choix du conflit, « Fusionner », proposé en premier ; union des titres, épisodes vus, visionnages, listes ; statut le plus
  avancé ; abandon et notes : valeur du téléphone ; résumé avant d'appliquer ; résultat renvoyé au Drive. Limite assumée : un titre
  supprimé sur un appareil peut revenir.
