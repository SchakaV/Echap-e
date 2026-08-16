# Échappée — jeu de course cycliste

Jeu de plateau de course cycliste, jouable dans le navigateur. Déplacement au dé,
spécialisations de coureurs, aspiration, bouchons de peloton, plateau généré
aléatoirement, courses en une manche ou par étapes.

## Lancer le jeu

Aucune installation ni build n'est nécessaire (JavaScript natif, modules ES).

**Dans VSCode :**
1. Ouvrir le dossier `velo-jeu` dans VSCode.
2. Installer l'extension **Live Server** (Ritwick Dey).
3. Clic droit sur `index.html` → **Open with Live Server**.

(Ouvrir `index.html` directement avec un double-clic dans le navigateur ne
fonctionne pas à cause des modules ES qui exigent un serveur — même local.)

**Sans VSCode**, avec Python déjà installé :
```
cd velo-jeu
python3 -m http.server 8000
```
puis ouvrir http://localhost:8000

## Structure du projet

```
velo-jeu/
├── index.html          Écrans de l'application (accueil, configuration, équipes, course, résultats, multijoueur)
├── css/style.css        Identité visuelle
├── js/
│   ├── board.js          Génération procédurale du parcours (terrain, largeur)
│   ├── rider.js          Coureurs et spécialisations
│   ├── engine.js         Moteur de course (dés, déplacement, blocages, aspiration, échappée)
│   ├── ai.js             Choix de case automatique pour les coureurs IA
│   ├── scoring.js        Barème de points par étape
│   ├── names.js          Prénoms tirés au sort
│   ├── audio.js          Musique d'ambiance générative
│   ├── ui.js             Rendu du plateau, des équipes et des résultats
│   ├── net.js            Client WebSocket (mode multijoueur)
│   ├── online.js         Logique du mode multijoueur en ligne côté client
│   └── main.js           Orchestration de l'application (mode solo)
└── server/               Serveur multijoueur en ligne — voir server/README.md
    ├── game.js             Logique d'une salle (réutilise board.js/engine.js/etc.)
    └── server.js           Serveur WebSocket
```

## Nouveautés de cette version

- Contre-la-montre : la largeur de route est désormais **fixée à 3 voies**,
  que ce soit en course unique ou comme étape d'une course par étapes —
  quel que soit le réglage choisi pour les autres étapes (champ verrouillé
  dans l'interface avec une note explicative).
- Ordre de départ du contre-la-montre en étape 2+ : garanti strictement
  inverse au classement général au temps (le dernier du classement s'élance
  en premier, on remonte jusqu'au porteur du maillot jaune qui part en
  dernier), y compris en cas d'égalité de retard entre plusieurs coureurs.
- Classement du maillot jaune : en cas d'égalité de retard cumulé, le
  départage se fait maintenant en comparant les classements de chaque étape
  un par un (du plus ancien au plus récent), comme au classement général
  réel — remplace l'ancien départage par nombre d'étapes gagnées.

- Correction d'un bug affectant **toutes les courses** (pas seulement le
  contre-la-montre) : près de la ligne d'arrivée, si une voie permettait à
  la fois de franchir la ligne (en peu de pas) et de continuer plus loin
  sans la franchir (via un autre trajet plus long), le moteur préférait à
  tort le trajet le plus long — proposant la dernière case avant la ligne
  au lieu de la ligne elle-même, même quand le total de pas suffisait
  largement. Franchir la ligne prime désormais toujours.

- **Nouveau type d'épreuve : le contre-la-montre.** Sélectionnable comme
  format de course à part entière, ou comme étape d'une course par étapes
  (en choisissant à quelle étape il a lieu). Les coureurs s'élancent un par
  un — un nouveau par manche — sur une grille de 4 voies (largeur par
  défaut, recommandée pour limiter les blocages accidentels entre coureurs
  partis à des moments différents, ajustable comme d'habitude). Comme ils ne
  partent pas tous en même temps, le classement final se fait sur le temps
  personnel de chacun (nombre de manches réellement courues), pas sur
  l'ordre d'arrivée brut — un coureur parti plus tard peut très bien
  terminer devant un coureur parti plus tôt s'il a mis moins de manches.
  Pour l'ordre de départ : tiré au sort si c'est une course unique ou la
  1ère étape d'une course par étapes ; à partir de la 2e étape, les
  coureurs s'élancent du dernier au premier du classement général au temps
  (maillot jaune) — comme dans un vrai contre-la-montre.
- Le rouleur ne relance plus le dé sur un 1 (il garde son bonus de terrain
  en plaine et en vallon).

- Correction du calcul des cases d'arrivée proposées en cas de peloton
  compact : chaque voie propose maintenant sa propre case la plus loin
  atteignable, même si les voies ne sont pas bloquées à la même profondeur.
  Avant, seules les voies partageant le maximum de pas global étaient
  proposées ; une voie bloquée plus tôt (donc avec une case moins avancée)
  disparaissait complètement des choix au lieu d'être offerte à son propre
  niveau.

- Correction : le classement général aux points doublait les points de
  chaque étape (le bouton « Simuler jusqu'à l'arrivée » restait cliquable
  après la fin de la course et pouvait redéclencher le décompte). Verrouillé
  pour de bon : les points, le maillot jaune et les victoires d'étape ne sont
  désormais comptabilisés qu'une seule fois par étape.
- La protection contre le vent manquait dans le rappel des règles de
  l'écran de course — ajoutée.

- Retour au choix multiple de case d'arrivée (plusieurs options mises en
  surbrillance selon le jet de dé, comme avant) — seule l'**animation** du
  déplacement a été affinée : à case choisie égale, le chemin le plus direct
  (le moins de diagonales, le moins de changements de direction) est
  désormais privilégié pour l'affichage, plutôt qu'un chemin trouvé au
  hasard de l'exploration qui pouvait zigzaguer inutilement. Cases très
  éloignées atteignables uniquement via un vrai détour : un zigzag peut
  encore apparaître si c'est la seule façon d'y arriver exactement.

- **Maillot jaune** : en cas d'égalité de retard cumulé, c'est celui qui a
  remporté le plus d'étapes qui porte le maillot (le jaune reste toujours
  prioritaire sur le vert en cas de double égalité).
- **Classement général par équipe** : l'équipe en tête affiche maintenant 0
  (même principe que le maillot jaune individuel), les autres un écart par
  rapport à elle.
- **Nouveau bonus : protection contre le vent**. Si un coureur passe 2
  manches d'affilée juste derrière un coéquipier (pas un rival), il gagne
  +1 à son prochain jet — en plus de l'aspiration normale (+1 pour être
  derrière n'importe qui, une seule manche suffit). Vient s'ajouter, pas
  remplacer.
- **Déplacement simplifié** : le moteur choisit désormais toujours le chemin
  le plus direct (tout droit en priorité), sans chercher à consommer tous
  les points de dé via des détours compliqués. Un vrai choix n'est proposé
  que dans le cas où contourner un blocage est possible aussi bien par la
  gauche que par la droite. Conséquence recherchée : les bouchons de peloton
  reviennent plus souvent dans le journal de course.

- **Choix de la couleur d'équipe** : un bouton dédié (le rond de couleur, à
  côté du nom de l'équipe) ouvre une palette élargie (16 couleurs). Les
  couleurs déjà prises par une autre équipe sont grisées — en solo comme en
  multijoueur.
- **Multijoueur — IA de secours** : si un joueur se déconnecte en pleine
  course, son équipe passe automatiquement sous contrôle de l'IA (la course
  continue sans bloquer les autres). S'il revient sur la même salle, il
  reprend directement la main là où il l'a laissée (même couleur, mêmes
  coureurs) — la reconnexion se fait via un jeton conservé par le
  navigateur, pas besoin de rien retaper.

- Le serveur multijoueur héberge maintenant le jeu lui-même en plus
  d'arbitrer les parties : une fois déployé (voir `server/README.md`, avec
  un guide pas à pas pour un déploiement gratuit sur Render), il suffit de
  partager un lien — aucune installation nécessaire côté joueurs, juste un
  navigateur.
- **Multijoueur en ligne** ajouté (bouton dédié sur l'écran d'accueil) : un
  serveur Node.js fait autorité sur la course (dés, déplacements,
  classement), plusieurs navigateurs s'y connectent et jouent chacun leur
  équipe en temps réel. Voir `server/README.md` pour le lancer — limité pour
  l'instant à une course unique (pas de courses par étapes ni de maillots en
  ligne).
- Sprint final repensé : ce n'est plus un bonus permanent tant que le
  sprinteur est dans les 4 dernières cases, mais un « coup de reins »
  déclenché seulement si le jet de dé (avec ses autres bonus) suffit à
  l'y faire arriver — s'il reste bloqué avant, le bonus ne se déclenche pas.

- Correction de l'ordre de jeu : à cause du pavage décalé, changer de voie
  en diagonale peut faire arriver sur une nouvelle case sans que le numéro
  de colonne change. Ce cas ne mettait pas à jour la manche d'arrivée, ce
  qui faussait l'ordre de jeu (« qui a atteint sa case en premier ») dès
  qu'un coureur zigzaguait. C'est corrigé : tout changement de case, quelle
  que soit la voie, remet bien le compteur à jour.
- Le sprinteur gagne désormais +1 en plaine (en plus de son bonus au sprint
  final), pour ne plus être trop souvent distancé avant l'arrivée.
- Génération des parcours : un tracé n'a plus systématiquement les 3 types
  de terrain — un tirage sur deux environ n'en comporte que 2.

- Couleurs d'équipe : retour à la palette d'origine (le système de maillots
  jaune/vert n'a pas besoin d'exclure ces couleurs, puisqu'il se distingue
  par un halo autour du vélo, pas par la couleur de fond).
- Ordre de jeu affiné : au tout début, à égalité de position, l'ordre va de
  haut en bas (voie 0 en premier). Ensuite, en cas d'égalité de colonne
  entre deux coureurs, celui qui a atteint cette case en premier (lors d'une
  manche antérieure) joue avant l'autre.

- Classement du maillot jaune ajouté sur l'écran de course, à côté du top 3
  aux points (🟢) — même format, top 3, disponible à partir de la 2ᵉ étape.
- Correction du calcul du maillot jaune : à la fin de chaque étape, les
  retards cumulés sont recalés pour que le porteur du maillot affiche
  toujours 0 (écart par rapport à LUI, pas par rapport au vainqueur du jour)
  — comme au classement général réel, y compris quand le leadership change
  de coureur d'une étape à l'autre.

- Caméra : au début de chaque tour, elle se place à 25 % du bord gauche
  (au lieu d'être centrée). Pendant l'animation d'un déplacement, elle ne
  suit plus systématiquement — seulement si le coureur s'approche à moins
  de 10 % d'un bord de la fenêtre, pour les tout derniers pas.
- Classement par équipe recalculé selon la méthode du maillot jaune (somme
  des retards cumulés de tous les coureurs de l'équipe, le plus petit total
  gagne), plutôt qu'aux points.
- Si le porteur du maillot jaune est aussi en tête du classement aux points,
  le maillot vert revient au 2ᵉ de ce classement plutôt que d'être partagé.

- Les porteurs des maillots (à partir de la 2ᵉ étape d'une course par
  étapes) sont identifiables directement sur le plateau : liseré et halo
  jaune ou vert autour du vélo, petit drapeau 🟡/🟢 au-dessus, et badge
  devant le nom dans le panneau « Peloton ».
- Prénoms tirés au hasard pour chaque coureur (au lieu de « Coureur 1 » /
  « CPU 1 ») — à la création des équipes par défaut comme à chaque ajout
  manuel d'un coureur sur l'écran de composition d'équipe.

- Fin de manche marquée à la fois par une notification et une ligne dans le
  journal de course.
- Le déplacement d'un coureur (humain ou IA) est maintenant animé case par
  case le long du chemin réellement emprunté (tout droit / diagonale), et la
  caméra suit automatiquement.
- Au début de chaque tour de jeu, la caméra se centre sur le coureur actif et
  sa case est mise en surbrillance.
- Top 3 du classement général (maillot vert) affiché sur l'écran de course,
  à partir de la 2ᵉ étape.
- Maillots (courses par étapes uniquement) :
  - 🟢 **maillot vert** — classement aux points cumulés (déjà en place).
  - 🟡 **maillot jaune** — classement au nombre de manches de retard cumulées
    sur le vainqueur de chaque étape (équivalent d'un classement au temps).
  - Les couleurs d'équipe ont été changées pour qu'aucune ne soit verte ou
    jaune, afin de ne pas entrer en conflit avec les maillots.
- Classement par équipe (somme des points de tous les coureurs de l'équipe),
  affiché en plus du classement individuel.
- Correction : le bonus d'aspiration ne bénéficie plus qu'au coureur qui suit
  dans la roue d'un autre (et non plus à celui qui est devant).

- Grille de départ : profondeur calculée pour que tous les coureurs soient
  visibles, avec une ligne de marge en plus. Le placement se fait
  automatiquement, au hasard, en remplissant les lignes de la grille dans
  l'ordre (aucune interaction requise avant le départ).
- Déplacement en demi-cases : chaque point de dé est un pas, tout droit ou en
  diagonale — pas un nombre de cases franchies. À cause du pavage décalé,
  un pas tout droit fait avancer d'une case complète, tandis qu'un pas en
  diagonale ne fait avancer que d'une demi-case (parfois 0, parfois 1 selon
  la parité de la voie de départ) : zigzaguer pour contourner un peloton
  compact coûte donc un peu de progression, exactement comme le ferait un
  vrai écart dans un peloton. Seules les cases effectivement libres sont
  prises en compte à chaque pas du trajet ; les cases d'arrivée réellement
  atteignables (qui peuvent être à des colonnes différentes les unes des
  autres) sont mises en surbrillance, à cliquer.
- Ordre de jeu : à chaque manche, le coureur le plus avancé joue en premier
  (au départ, cela correspond à la ligne -1, puis -2, etc.) — les suivants
  voient donc les positions déjà jouées et peuvent contourner en connaissance
  de cause.
- Notification (bandeau temporaire) à la fin de chaque manche complète, une
  fois que tous les coureurs ont joué.
- Aspiration recalculée une fois par manche complète (une fois que tous les
  coureurs ont joué), selon les positions finales.
- Classement général « aux points » façon classement par points d'une course
  par étapes (comme un maillot vert) : chaque arrivée rapporte des points
  selon un barème qui dépend du profil de l'étape (plaine, vallonné,
  montagne), et c'est le total de points le plus élevé qui gagne — pas le
  temps le plus court comme au classement général réel (maillot jaune). Voir
  `js/scoring.js` pour ajuster le barème.
- Rappel des bonus/malus par spécialité sur l'écran de composition d'équipe
  et dans le panneau de règles dépliable pendant la course.
- Coureurs représentés par un vélo avec un cycliste dessus (au lieu d'un
  simple pion rond) ; le maillot du cycliste reprend la couleur d'équipe. La
  liste « Peloton » à côté du plateau affiche les noms et la progression de
  tous les coureurs.
- Musique d'ambiance activable/désactivable (case à cocher en haut de
  l'écran) : entièrement synthétisée en direct par le navigateur (Web Audio
  API), donc aucun fichier audio à télécharger. Une nappe douce sur les
  écrans de menu, un rythme plus marqué pendant la course.

## Règles implémentées

- **Dé** : 1d6 par coureur et par manche.
- **Spécialisations** :
  - **Grimpeur** : +2 en montagne, +1 en vallon.
  - **Sprinteur** : +3 dans les 4 dernières cases (sprint final), -1 en montagne.
  - **Baroudeur** : +2 s'il est seul en tête (échappée : aucun rival à
    moins de 4 cases derrière lui). En contre-la-montre, ce bonus
    d'échappée est remplacé par un bonus de +1 en plaine.
  - **Puncheur** : +2 en vallon.
  - **Rouleur** : +1 partout, relance le dé une fois s'il tombe sur 1.
- **Aspiration** : un coureur qui termine une manche directement derrière un
  autre (même voie, case juste derrière) gagne +1 au prochain jet.
- **Largeur de route / bouchons** : le plateau a un nombre de voies
  configurable (2 à 5). Si toutes les voies sont occupées à la case visée, le
  coureur s'arrête à la première case libre en amont — un gros score de dé
  peut donc être « perdu » si le peloton bloque le passage. Un joueur humain
  choisit alors sa voie quand plusieurs sont disponibles ; l'IA choisit
  automatiquement.
- **Terrain** : chaque case du parcours est plaine (vert), vallon (jaune) ou
  montagne (rouge), généré aléatoirement selon le profil choisi (plaine,
  vallonné, montagne ou aléatoire), avec toujours un départ et un sprint final
  neutralisés en plaine.
- **Équipes** : 1 à 6 coureurs par équipe, composition libre des
  spécialisations.
- **Format** : course unique ou course par étapes (classement général à
  points cumulés = somme des rangs d'arrivée, le plus petit total gagne).
- **Modes** : local à tour de rôle (même écran), contre l'IA, ou mixte.

## Pistes d'évolution (non implémentées)

- IA plus tactique (actuellement elle ne décide que du choix de voie en cas
  de bouchon).
- Sauvegarde de partie / historique des courses.
- Multijoueur en ligne : courses par étapes, maillots et classement général,
  reprise après déconnexion en cours de course.
