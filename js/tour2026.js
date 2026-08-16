// tour2026.js
// Parcours fixes du Tour de France 2026.
//
// Règles d'échelle :
// - étapes en ligne : 1 case = 1 km
// - contre-la-montre : 1 case = 0,5 km
//
// Le terrain est défini explicitement pour chaque case.
// Aucune génération procédurale n'est utilisée pour le Tour.

import { TERRAIN } from './board.js';

const P = TERRAIN.PLAINE;
const V = TERRAIN.VALLON;
const M = TERRAIN.MONTAGNE;

/**
 * Crée une séquence de terrain à partir de segments.
 *
 * Exemple :
 * segments([
 *   [31, P],
 *   [1, V],
 *   [3, M]
 * ])
 *
 * donne :
 * [P, P, ..., P, V, M, M, M]
 */
function terrainFromSegments(segments) {
  const terrain = [];

  for (const [count, type] of segments) {
    for (let i = 0; i < count; i++) {
      terrain.push(type);
    }
  }

  return terrain;
}

/**
 * Vérifie qu'un plateau correspond bien à sa longueur déclarée.
 */
function checkStage(stage) {
  if (stage.terrain.length !== stage.length) {
    throw new Error(
      `Tour 2026 — Étape ${stage.number}: ` +
      `terrain=${stage.terrain.length}, longueur=${stage.length}`
    );
  }

  return stage;
}

/**
 * Tour de France 2026
 */
export const TOUR_2026 = {

  id: 'tour2026',

  name: 'Tour de France 2026',

  totalStages: 21,

  stages: {

    // ============================================================
    // ÉTAPE 1
    // Barcelone → Barcelone
    // CLM par équipes — 19,6 km
    // ============================================================
    1: checkStage({
      number: 1,
      name: 'Barcelone → Barcelone',
      type: 'team-time-trial',

      distance: 19.6,

      // 1 case = 0,5 km
      length: 40,

      width: 3,

      scale: 0.5,

      terrain: terrainFromSegments([
        [32, P], // jusqu'à environ 16 km
        [1, V],  // approche Montjuïc
        [3, M],  // Côte de Montjuïc
        [2, V],  // transition / descente
        [2, M],  // Côte du Stade Olympique
      ]),

      features: [
        {
          type: 'chrono',
          distance: 5.1,
          column: 10,
          name: 'Point chrono intermédiaire n°1'
        },
        {
          type: 'chrono',
          distance: 10.5,
          column: 21,
          name: 'Point chrono intermédiaire n°2'
        },
        {
          type: 'chrono',
          distance: 15.9,
          column: 32,
          name: 'Point chrono intermédiaire n°3'
        },
        {
          type: 'climb',
          distanceStart: 16.8,
          distanceEnd: 17.9,
          columnStart: 34,
          columnEnd: 36,
          name: 'Côte de Montjuïc',
          category: 3,
          length: 1.1,
          gradient: 5.1
        },
        {
          type: 'climb',
          distanceStart: 18.8,
          distanceEnd: 19.6,
          columnStart: 38,
          columnEnd: 40,
          name: 'Côte du Stade Olympique de Montjuïc',
          category: null,
          length: 0.8,
          gradient: 7
        }
      ]
    }),


    // ============================================================
    // ÉTAPE 2
    // Tarragone → Barcelone
    // Accidentée — 168,5 km
    // ============================================================
    2: checkStage({
      number: 2,
      name: 'Tarragone → Barcelone',
      type: 'hilly',

      distance: 168.5,

      // 1 case = 1 km
      length: 169,

      width: 5,

      scale: 1,

      terrain: terrainFromSegments([
        [86, P],  // longue partie roulante
        [3, V],   // approche Begues
        [6, M],   // Côte de Begues
        [43, V],  // terrain vallonné
        [3, V],   // approche Montjuïc
        [2, M],   // Montjuïc #1
        [10, V],  // circuit / transition
        [2, M],   // Montjuïc #2
        [10, V],  // circuit / transition
        [2, M],   // Montjuïc #3
        [2, V],   // final
      ]),

      features: [
        {
          type: 'sprint',
          distance: 85.6,
          column: 86,
          name: 'Sprint intermédiaire de Viladecans'
        },
        {
          type: 'climb',
          distanceStart: 88.1,
          distanceEnd: 94.2,
          columnStart: 88,
          columnEnd: 94,
          name: 'Côte de Begues',
          category: 2,
          length: 6.1,
          gradient: 6.5
        },
        {
          type: 'climb',
          distanceStart: 140.0,
          distanceEnd: 141.6,
          columnStart: 140,
          columnEnd: 142,
          name: 'Montjuïc #1',
          category: null,
          length: 1.6,
          gradient: 9.3
        },
        {
          type: 'climb',
          distanceStart: 152.2,
          distanceEnd: 153.8,
          columnStart: 152,
          columnEnd: 154,
          name: 'Montjuïc #2',
          category: null,
          length: 1.6,
          gradient: 9.3
        },
        {
          type: 'climb',
          distanceStart: 164.4,
          distanceEnd: 166.0,
          columnStart: 164,
          columnEnd: 166,
          name: 'Montjuïc #3',
          category: null,
          length: 1.6,
          gradient: 9.3
        },
        {
          type: 'lap',
          distance: 144.1,
          column: 144,
          name: 'Premier passage sur la ligne'
        },
        {
          type: 'lap',
          distance: 156.3,
          column: 156,
          name: 'Deuxième passage sur la ligne'
        }
      ]
    }),

// ============================================================
    // ÉTAPE 3
    // Granollers → Les Angles
    // Montagneuse — 195,9 km
    // ============================================================
    
    // ============================================================
// ÉTAPE 3
// Granollers → Les Angles
// Montagne — 195,9 km
// ============================================================

3: checkStage({
  number: 3,

  name: 'Granollers → Les Angles',

  type: 'mountain',

  // Distance officielle
  distance: 195.9,

  // 1 case ≈ 1 km
  length: 196,

  width: 5,

  scale: 1,

  /*
   * PROFIL DU PARCOURS
   *
   * 196 cases correspondant à environ 196 km.
   *
   * P = plaine
   * V = vallonné
   * M = montagne
   *
   * Les zones montagneuses sont positionnées sur les
   * ascensions officielles de l'étape.
   */
  terrain: terrainFromSegments([

    // Granollers → pied de la Côte de Saint-Feliu
    [17, P],

    // Côte de Saint-Feliu de Codines
    // 7,6 km - 4,5 %
    [8, M],

    // Saint-Feliu → approche des Pyrénées
    [92, V],

    // Col de Toses
    // 9,3 km - 6,5 %
    [10, M],

    // Descente / Cerdagne
    [32, V],

    // Col du Calvaire
    // 11,4 km - 4,1 %
    [12, M],

    // Col du Calvaire → approche des Angles
    [23, V],

    // Montée finale vers Les Angles
    // 1,8 km - 6,5 %
    [2, M]
  ]),

  features: [

    // --------------------------------------------------------
    // CÔTE DE SAINT-FELIU DE CODINES
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Côte de Saint Feliu de Codines',

      distanceStart: 9.6,
      distanceEnd: 17.2,

      columnStart: 10,
      columnEnd: 17,

      category: 3,

      length: 7.6,

      gradient: 4.5
    },

    // --------------------------------------------------------
    // SPRINT DE CAMPDEVÀNOL
    // --------------------------------------------------------

    {
      type: 'sprint',

      name: 'Campdevànol',

      distance: 98.4,

      column: 98
    },

    // --------------------------------------------------------
    // COL DE TOSES
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Col de Toses',

      distanceStart: 118.4,
      distanceEnd: 127.7,

      columnStart: 118,
      columnEnd: 128,

      category: 1,

      length: 9.3,

      gradient: 6.5
    },

    // --------------------------------------------------------
    // COL DU CALVAIRE
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Col du Calvaire',

      distanceStart: 160.9,
      distanceEnd: 172.3,

      columnStart: 161,
      columnEnd: 172,

      category: 3,

      length: 11.4,

      gradient: 4.1
    },

    // --------------------------------------------------------
    // ARRIVÉE AUX ANGLES
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Les Angles',

      distanceStart: 194.1,
      distanceEnd: 195.9,

      columnStart: 194,
      columnEnd: 196,

      category: 3,

      length: 1.8,

      gradient: 6.5
    }
  ]
}),

// ============================================================
// ÉTAPE 4
// Carcassonne → Foix
// Accidentée — 181,9 km
// ============================================================

4: checkStage({
  number: 4,

  name: 'Carcassonne → Foix',

  type: 'hilly',

  // Distance officielle
  distance: 181.9,

  // 1 case ≈ 1 km
  length: 182,

  // Largeur demandée : 5 voies
  width: 5,

  scale: 1,

  /*
   * PROFIL DU PARCOURS
   *
   * P = plaine
   * V = vallonné
   * M = montagne
   *
   * Les zones M correspondent aux principales ascensions
   * classées officiellement sur l'étape.
   */
  terrain: terrainFromSegments([

    // Carcassonne → approche du Col de Bedos
    [45, V],

    // Col de Bedos
    // 3,4 km à 4,4 %
    [3, M],

    // Col de Bedos → approche du Col du Paradis
    [11, V],

    // Col du Paradis
    // 5,9 km à 4,1 %
    [6, M],

    // Col du Paradis → approche du Col de Coudons
    [29, V],

    // Col de Coudons
    // 10,8 km à 5,5 %
    [11, M],

    // Col de Coudons → approche du Col de Montségur
    [35, V],

    // Col de Montségur
    // 6,9 km à 6,6 %
    [7, M],

    // Descente / final vers Foix
    [35, V]
  ]),

  features: [

    // --------------------------------------------------------
    // COL DE BEDOS
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Col de Bedos',

      distanceStart: 44.8,
      distanceEnd: 48.2,

      columnStart: 45,
      columnEnd: 48,

      category: 4,

      length: 3.4,

      gradient: 4.4
    },

    // --------------------------------------------------------
    // COL DU PARADIS
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Col du Paradis',

      distanceStart: 59.0,
      distanceEnd: 64.9,

      columnStart: 59,
      columnEnd: 65,

      category: 3,

      length: 5.9,

      gradient: 4.1
    },

    // --------------------------------------------------------
    // SPRINT DE QUILLAN
    // --------------------------------------------------------

    {
      type: 'sprint',

      name: 'Quillan',

      distance: 93.4,

      column: 93
    },

    // --------------------------------------------------------
    // COL DE COUDONS
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Col de Coudons',

      distanceStart: 94.1,
      distanceEnd: 104.9,

      columnStart: 94,
      columnEnd: 105,

      category: 2,

      length: 10.8,

      gradient: 5.5
    },

    // --------------------------------------------------------
    // COL DE MONTSÉGUR
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Col de Montségur',

      distanceStart: 139.8,
      distanceEnd: 146.7,

      columnStart: 140,
      columnEnd: 147,

      category: 2,

      length: 6.9,

      gradient: 6.6
    }
  ]
}),

// ============================================================
// ÉTAPE 5
// Lannemezan → Pau
// Plat — 158,3 km
// ============================================================

5: checkStage({
  number: 5,

  name: 'Lannemezan → Pau',

  type: 'flat',

  // Distance officielle
  distance: 158.3,

  // 1 case ≈ 1 km
  length: 158,

  // Largeur : 5 voies
  width: 5,

  scale: 1,

  /*
   * PROFIL DU PARCOURS
   *
   * Étape officiellement classée "Plat".
   *
   * P = plaine
   * V = vallonné
   * M = montagne
   *
   * La Côte de Baleix est matérialisée comme secteur
   * montagneux afin de donner son caractère propre à
   * cette difficulté dans le moteur.
   */
  terrain: terrainFromSegments([

    // Lannemezan → Vic-en-Bigorre
    [113, P],

    // Côte de Baleix
    // 1 km à 8,8 %
    [1, M],

    // Baleix → Pau
    [44, P]
  ]),

  features: [

    // --------------------------------------------------------
    // SPRINT INTERMÉDIAIRE
    // --------------------------------------------------------

    {
      type: 'sprint',

      name: 'Vic-en-Bigorre',

      distance: 112.9,

      column: 113
    },

    // --------------------------------------------------------
    // CÔTE DE BALEIX
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Côte de Baleix',

      distanceStart: 131.7,
      distanceEnd: 132.7,

      columnStart: 132,
      columnEnd: 133,

      category: 3,

      length: 1,

      gradient: 8.8
    }
  ]
}),

// ============================================================
// ÉTAPE 6
// Pau → Gavarnie-Gèdre
// Montagne — 186,2 km
// ============================================================

6: checkStage({
  number: 6,

  name: 'Pau → Gavarnie-Gèdre',

  type: 'mountain',

  // Distance officielle
  distance: 186.2,

  // 1 case ≈ 1 km
  length: 186,

  // Largeur : 5 voies
  width: 5,

  scale: 1,

  /*
   * PROFIL DU PARCOURS
   *
   * P = plaine
   * V = vallonné
   * M = montagne
   *
   * Les secteurs montagneux correspondent aux principales
   * ascensions et à la montée finale officielle.
   */
  terrain: terrainFromSegments([

    // Pau → pied de la Côte de Loucrup
    [49, P],

    // Côte de Loucrup
    // 2 km à 7,1 %
    [2, M],

    // Loucrup → Côte de Mauvezin
    [25, V],

    // Côte de Mauvezin
    // 3 km à 6,8 %
    [3, M],

    // Mauvezin → pied du Col d'Aspin
    [38, V],

    // Col d'Aspin
    // 12 km à 6,5 %
    [12, M],

    // Aspin → pied du Tourmalet
    [17, V],

    // Col du Tourmalet
    // 17,1 km à 7,3 %
    [17, M],

    // Descente du Tourmalet → pied de la montée finale
    [4, V],

    // Montée finale vers Gavarnie-Gèdre
    // 18,7 km à 3,7 %
    [19, M]
  ]),

  features: [

    // --------------------------------------------------------
    // CÔTE DE LOUCRUP
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Côte de Loucrup',

      distanceStart: 48.9,
      distanceEnd: 50.9,

      columnStart: 49,
      columnEnd: 51,

      category: 4,

      length: 2,

      gradient: 7.1
    },

    // --------------------------------------------------------
    // CÔTE DE MAUVEZIN
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Côte de Mauvezin',

      distanceStart: 74.3,
      distanceEnd: 77.3,

      columnStart: 74,
      columnEnd: 77,

      category: 3,

      length: 3,

      gradient: 6.8
    },

    // --------------------------------------------------------
    // SPRINT INTERMÉDIAIRE
    // --------------------------------------------------------

    {
      type: 'sprint',

      name: 'Pouzac',

      distance: 59.1,

      column: 59
    },

    // --------------------------------------------------------
    // COL D'ASPIN
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Col d’Aspin',

      distanceStart: 106.1,
      distanceEnd: 118.1,

      columnStart: 106,
      columnEnd: 118,

      category: 1,

      length: 12,

      gradient: 6.5
    },

    // --------------------------------------------------------
    // COL DU TOURMALET
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Col du Tourmalet',

      distanceStart: 130.7,
      distanceEnd: 147.8,

      columnStart: 131,
      columnEnd: 148,

      category: 'HC',

      length: 17.1,

      gradient: 7.3
    },

    // --------------------------------------------------------
    // ARRIVÉE — GAVARNIE-GÈDRE
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Gavarnie-Gèdre',

      distanceStart: 167.5,
      distanceEnd: 186.2,

      columnStart: 168,
      columnEnd: 186,

      category: 2,

      length: 18.7,

      gradient: 3.7
    }
  ]
}),

// ============================================================
// ÉTAPE 7
// Hagetmau → Bordeaux
// Plat — 175,1 km
// ============================================================

7: checkStage({
  number: 7,

  name: 'Hagetmau → Bordeaux',

  type: 'flat',

  // Distance officielle
  distance: 175.1,

  // 1 case ≈ 1 km
  length: 175,

  // Largeur : 5 voies
  width: 5,

  scale: 1,

  /*
   * PROFIL DU PARCOURS
   *
   * Étape officiellement classée "Plat".
   *
   * P = plaine
   * V = vallonné
   * M = montagne
   *
   * Une seule difficulté répertoriée :
   * Côte de Béguey — 1,2 km à 4,4 %, catégorie 4.
   */
  terrain: terrainFromSegments([
    [120, P],
    [2, M],
    [53, P]
  ]),

  features: [

    // --------------------------------------------------------
    // SPRINT INTERMÉDIAIRE — LANDIRAS
    // --------------------------------------------------------

    {
      type: 'sprint',

      name: 'Landiras',

      distance: 120.3,

      column: 120
    },

    // --------------------------------------------------------
    // CÔTE DE BÉGUEY
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Côte de Béguey',

      distanceStart: 136.1,
      distanceEnd: 137.3,

      columnStart: 136,
      columnEnd: 137,

      category: 4,

      length: 1.2,

      gradient: 4.4
    }
  ]
}),

// ============================================================
// ÉTAPE 8
// Périgueux → Bergerac
// Plat — 180,4 km
// ============================================================

8: checkStage({
  number: 8,

  name: 'Périgueux → Bergerac',

  type: 'flat',

  // Distance officielle
  distance: 180.4,

  // 1 case ≈ 1 km
  length: 180,

  // Largeur : 5 voies
  width: 5,

  scale: 1,

  terrain: terrainFromSegments([
    [102, P],
    [4, M],
    [34, V],
    [3, M],
    [37, P]
  ]),

  features: [

    // --------------------------------------------------------
    // CÔTE DE DOMME
    // Km 102,6 — 3,7 km à 3,3 % — catégorie 4
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Côte de Domme',

      distanceStart: 98.9,
      distanceEnd: 102.6,

      columnStart: 99,
      columnEnd: 103,

      category: 4,

      length: 3.7,

      gradient: 3.3
    },

    // --------------------------------------------------------
    // SPRINT INTERMÉDIAIRE — SAINT-CYPRIEN
    // --------------------------------------------------------

    {
      type: 'sprint',

      name: 'Saint-Cyprien',

      distance: 122.8,

      column: 123
    },

    // --------------------------------------------------------
    // CÔTE DU BUISSON-DE-CADOUIN
    // Km 140,4 — 2,2 km à 5,3 % — catégorie 4
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Côte du Buisson-de-Cadouin',

      distanceStart: 138.2,
      distanceEnd: 140.4,

      columnStart: 138,
      columnEnd: 140,

      category: 4,

      length: 2.2,

      gradient: 5.3
    }
  ]
}),

// ============================================================
// ÉTAPE 9
// Malemort → Ussel
// Accidentée — 154,6 km
// Parcours officiel adapté
// ============================================================

9: checkStage({
  number: 9,

  name: 'Malemort → Ussel',

  type: 'hilly',

  // Distance officielle du parcours
  distance: 154.6,

  // 1 case ≈ 1 km
  length: 155,

  // Largeur : 5 voies
  width: 5,

  scale: 1,

  terrain: terrainFromSegments([
    // Malemort → Côte de Naves
    [45, P],

    // Côte de Naves
    // 2,3 km à 7,4 % — catégorie 3
    [2, M],

    // Côte de Naves → Suc au May
    [26, V],

    // Suc au May
    // 3,8 km à 7,7 % — catégorie 2
    [4, M],

    // Suc au May → Côte de la Croix du Pey
    [20, V],

    // Côte de la Croix du Pey
    // 4,8 km à 6 % — catégorie 3
    [5, M],

    // Croix du Pey → Mont Bessou
    [31, V],

    // Mont Bessou
    // 0,9 km à 7,3 % — catégorie 4
    [1, M],

    // Mont Bessou → Ussel
    [21, P]
  ]),

  features: [

    // --------------------------------------------------------
    // SPRINT INTERMÉDIAIRE — BEYNAT
    // --------------------------------------------------------

    {
      type: 'sprint',

      name: 'Beynat',

      distance: 44.9,

      column: 45
    },

    // --------------------------------------------------------
    // CÔTE DE NAVES
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Côte de Naves',

      distanceStart: 43.7,
      distanceEnd: 46.0,

      columnStart: 44,
      columnEnd: 46,

      category: 3,

      length: 2.3,

      gradient: 7.4
    },

    // --------------------------------------------------------
    // SUC AU MAY
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Suc au May',

      distanceStart: 70.3,
      distanceEnd: 74.1,

      columnStart: 70,
      columnEnd: 74,

      category: 2,

      length: 3.8,

      gradient: 7.7
    },

    // --------------------------------------------------------
    // CÔTE DE LA CROIX DU PEY
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Côte de la Croix du Pey',

      distanceStart: 93.7,
      distanceEnd: 98.5,

      columnStart: 94,
      columnEnd: 99,

      category: 3,

      length: 4.8,

      gradient: 6.0
    },

    // --------------------------------------------------------
    // MONT BESSOU
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Mont Bessou',

      distanceStart: 129.2,
      distanceEnd: 130.1,

      columnStart: 129,
      columnEnd: 130,

      category: 4,

      length: 0.9,

      gradient: 7.3
    }
  ]
}),

// ============================================================
// ÉTAPE 10
// Aurillac → Le Lioran
// Montagne — 166,6 km
// ============================================================

10: checkStage({
  number: 10,

  name: 'Aurillac → Le Lioran',

  type: 'mountain',

  // Distance officielle
  distance: 166.6,

  // 1 case ≈ 1 km
  length: 167,

  // Largeur : 5 voies
  width: 5,

  scale: 1,

  terrain: terrainFromSegments([
    // Aurillac → Côte de Pailherols
    [65, P],

    // Côte de Pailherols
    // 3 km à 7,2 % — catégorie 3
    [3, M],

    // Pailherols → Col de la Griffoul
    [23, V],

    // Col de la Griffoul
    // 5,9 km à 6,7 % — catégorie 2
    [6, M],

    // Griffoul → Col de Prat de Bouc
    [3, V],

    // Col de Prat de Bouc
    // 3,1 km à 6,5 % — catégorie 3
    [3, M],

    // Prat de Bouc → Côte de Murat
    [10, V],

    // Côte de Murat
    // 5,2 km à 5,3 % — catégorie 3
    [5, M],

    // Murat → Puy Mary
    [9, V],

    // Puy Mary - Pas de Peyrol
    // 7,8 km à 6 % — catégorie 1
    [8, M],

    // Puy Mary → Col de Pertus
    [12, V],

    // Col de Pertus
    // 4,4 km à 8,5 % — catégorie 1
    [4, M],

    // Pertus → Col de Font de Cère
    [9, V],

    // Col de Font de Cère
    // 3,1 km à 5,8 % — catégorie 3
    [3, M],

    // Derniers kilomètres vers Le Lioran
    [4, P]
  ]),

  features: [

    // --------------------------------------------------------
    // SPRINT INTERMÉDIAIRE — LACAPELLE-DEL-FRAISSE
    // --------------------------------------------------------

    {
      type: 'sprint',

      name: 'Lacapelle-del-Fraisse',

      distance: 25.3,

      column: 25
    },

    // --------------------------------------------------------
    // CÔTE DE PAILHEROLS
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Côte de Pailherols',

      distanceStart: 65.0,
      distanceEnd: 68.0,

      columnStart: 65,
      columnEnd: 68,

      category: 3,

      length: 3,

      gradient: 7.2
    },

    // --------------------------------------------------------
    // COL DE LA GRIFFOUL
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Col de la Griffoul',

      distanceStart: 91.4,
      distanceEnd: 97.3,

      columnStart: 91,
      columnEnd: 97,

      category: 2,

      length: 5.9,

      gradient: 6.7
    },

    // --------------------------------------------------------
    // COL DE PRAT DE BOUC
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Col de Prat de Bouc',

      distanceStart: 100.7,
      distanceEnd: 103.8,

      columnStart: 101,
      columnEnd: 104,

      category: 3,

      length: 3.1,

      gradient: 6.5
    },

    // --------------------------------------------------------
    // CÔTE DE MURAT
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Côte de Murat',

      distanceStart: 113.6,
      distanceEnd: 118.8,

      columnStart: 114,
      columnEnd: 119,

      category: 3,

      length: 5.2,

      gradient: 5.3
    },

    // --------------------------------------------------------
    // PUY MARY - PAS DE PEYROL
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Puy Mary - Pas de Peyrol',

      distanceStart: 127.9,
      distanceEnd: 135.7,

      columnStart: 128,
      columnEnd: 136,

      category: 1,

      length: 7.8,

      gradient: 6.0
    },

    // --------------------------------------------------------
    // COL DE PERTUS
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Col de Pertus',

      distanceStart: 147.7,
      distanceEnd: 152.1,

      columnStart: 148,
      columnEnd: 152,

      category: 1,

      length: 4.4,

      gradient: 8.5
    },

    // --------------------------------------------------------
    // COL DE FONT DE CÈRE
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Col de Font de Cère',

      distanceStart: 160.8,
      distanceEnd: 163.9,

      columnStart: 161,
      columnEnd: 164,

      category: 3,

      length: 3.1,

      gradient: 5.8
    }
  ]
}),

// ============================================================
// ÉTAPE 11
// Vichy → Nevers
// Plat — 161,3 km
// ============================================================

11: checkStage({
  number: 11,

  name: 'Vichy → Nevers',

  type: 'flat',

  // Distance officielle
  distance: 161.3,

  // 1 case ≈ 1 km
  length: 161,

  // Largeur : 5 voies
  width: 5,

  scale: 1,

  terrain: terrainFromSegments([
    // Vichy → Côte de Billonnière
    [32, P],

    // Côte de Billonnière
    // 1,1 km à 5,8 % — catégorie 4
    [1, M],

    // Billonnière → Côte de Billy-Chevannes
    [89, P],

    // Côte de Billy-Chevannes
    // 1,5 km à 5 % — catégorie 4
    [2, M],

    // Billy-Chevannes → Nevers
    [37, P]
  ]),

  features: [

    // --------------------------------------------------------
    // SPRINT INTERMÉDIAIRE — SAINT-POURÇAIN-SUR-SIOULE
    // --------------------------------------------------------

    {
      type: 'sprint',

      name: 'Saint-Pourçain-sur-Sioule',

      distance: 27.9,

      column: 28
    },

    // --------------------------------------------------------
    // CÔTE DE BILLONNIÈRE
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Côte de Billonnière',

      distanceStart: 31.8,
      distanceEnd: 32.9,

      columnStart: 32,
      columnEnd: 33,

      category: 4,

      length: 1.1,

      gradient: 5.8
    },

    // --------------------------------------------------------
    // CÔTE DE BILLY-CHEVANNES
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Côte de Billy-Chevannes',

      distanceStart: 121.9,
      distanceEnd: 123.4,

      columnStart: 122,
      columnEnd: 123,

      category: 4,

      length: 1.5,

      gradient: 5.0
    }
  ]
}),

// ============================================================
// ÉTAPE 12
// Circuit Nevers Magny-Cours → Chalon-sur-Saône
// Plat — 179,1 km
// ============================================================

12: checkStage({
  number: 12,

  name: 'Circuit Nevers Magny-Cours → Chalon-sur-Saône',

  type: 'flat',

  // Distance officielle
  distance: 179.1,

  // 1 case ≈ 1 km
  length: 179,

  // Largeur : 5 voies
  width: 5,

  scale: 1,

  terrain: terrainFromSegments([
    // Approche de la Côte de Lanty
    [74, P],

    // Côte de Lanty
    [2, M],

    // Lanty → Côte de Cuzy
    [19, P],

    // Côte de Cuzy
    [3, M],

    // Cuzy → Côte de Montagny-lès-Buxy
    [59, P],

    // Côte de Montagny-lès-Buxy
    [3, M],

    // Montagny-lès-Buxy → Chalon-sur-Saône
    [19, P]
  ]),

  features: [

    // --------------------------------------------------------
    // SPRINT INTERMÉDIAIRE — DECIZE
    // --------------------------------------------------------

    {
      type: 'sprint',

      name: 'Decize',

      distance: 42.3,

      column: 42
    },

    // --------------------------------------------------------
    // CÔTE DE LANTY
    // Km 76,5
    // 2,1 km à 4 % — catégorie 4
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Côte de Lanty',

      distanceStart: 74.4,
      distanceEnd: 76.5,

      columnStart: 74,
      columnEnd: 77,

      category: 4,

      length: 2.1,

      gradient: 4.0
    },

    // --------------------------------------------------------
    // CÔTE DE CUZY
    // Km 97,8
    // 2,5 km à 4,5 % — catégorie 4
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Côte de Cuzy',

      distanceStart: 95.3,
      distanceEnd: 97.8,

      columnStart: 95,
      columnEnd: 98,

      category: 4,

      length: 2.5,

      gradient: 4.5
    },

    // --------------------------------------------------------
    // CÔTE DE MONTAGNY-LÈS-BUXY
    // Km 159,4
    // 2,7 km à 4,3 % — catégorie 4
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Côte de Montagny-lès-Buxy',

      distanceStart: 156.7,
      distanceEnd: 159.4,

      columnStart: 157,
      columnEnd: 159,

      category: 4,

      length: 2.7,

      gradient: 4.3
    },

    // --------------------------------------------------------
    // ARRIVÉE — CHALON-SUR-SAÔNE
    // --------------------------------------------------------

    {
      type: 'sprint',

      name: 'Chalon-sur-Saône',

      distance: 179.1,

      column: 179
    }
  ]
}),

// ============================================================
// ÉTAPE 13
// Dole → Belfort
// Accidentée — 205,8 km
// ============================================================

13: checkStage({
  number: 13,

  name: 'Dole → Belfort',

  type: 'hilly',

  // Distance officielle
  distance: 205.8,

  // 1 case ≈ 1 km
  length: 206,

  // Largeur : 5 voies
  width: 5,

  scale: 1,

  terrain: terrainFromSegments([
    // Dole → début du relief vosgien
    [138, P],

    // Approche du Col des Croix
    [20, V],

    // Col des Croix
    // 5,2 km à 4,8 % — catégorie 3
    [5, M],

    // Col des Croix → pied du Ballon d'Alsace
    [13, V],

    // Ballon d'Alsace
    // 8,8 km à 6,9 % — catégorie 1
    [9, M],

    // Descente du Ballon d'Alsace → Belfort
    [21, V]
  ]),

  features: [

    // --------------------------------------------------------
    // SPRINT INTERMÉDIAIRE — MÉLISEY
    // --------------------------------------------------------

    {
      type: 'sprint',

      name: 'Mélisey',

      distance: 137.8,

      column: 138
    },

    // --------------------------------------------------------
    // COL DES CROIX
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Col des Croix',

      distanceStart: 152.2,
      distanceEnd: 157.4,

      columnStart: 152,
      columnEnd: 157,

      category: 3,

      length: 5.2,

      gradient: 4.8
    },

    // --------------------------------------------------------
    // BALLON D'ALSACE
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Ballon d’Alsace',

      distanceStart: 167.1,
      distanceEnd: 175.9,

      columnStart: 167,
      columnEnd: 176,

      category: 1,

      length: 8.8,

      gradient: 6.9
    }
  ]
}),

// ============================================================
// ÉTAPE 14
// Mulhouse → Le Markstein Fellering
// Montagne — 155,3 km
// ============================================================

14: checkStage({
  number: 14,

  name: 'Mulhouse → Le Markstein Fellering',

  type: 'mountain',

  // Distance officielle
  distance: 155.3,

  // 1 case ≈ 1 km
  length: 155,

  // Largeur : 5 voies
  width: 5,

  scale: 1,

  terrain: terrainFromSegments([
    // Mulhouse → pied du Grand Ballon
    [15, P],

    // Grand Ballon
    // 21,6 km à 4,7 % — catégorie 1
    [22, M],

    // Grand Ballon → pied du Col du Page
    [25, V],

    // Col du Page
    // 9,8 km à 4,7 % — catégorie 2
    [10, M],

    // Col du Page → pied du Ballon d'Alsace
    [14, V],

    // Ballon d'Alsace
    // 8,9 km à 6,9 % — catégorie 1
    [9, M],

    // Ballon d'Alsace → pied du Col du Haag
    [43, V],

    // Col du Haag
    // 11,2 km à 7,3 % — catégorie 1
    [12, M],

    // Col du Haag → arrivée au Markstein
    [5, V]
  ]),

  features: [

    // --------------------------------------------------------
    // SPRINT INTERMÉDIAIRE — WATTWILLER
    // --------------------------------------------------------

    {
      type: 'sprint',

      name: 'Wattwiller',

      distance: 12.7,

      column: 13
    },

    // --------------------------------------------------------
    // GRAND BALLON
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Grand Ballon',

      distanceStart: 15.0,
      distanceEnd: 36.6,

      columnStart: 15,
      columnEnd: 37,

      category: 1,

      length: 21.6,

      gradient: 4.7
    },

    // --------------------------------------------------------
    // COL DU PAGE
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Col du Page',

      distanceStart: 61.5,
      distanceEnd: 71.3,

      columnStart: 62,
      columnEnd: 71,

      category: 2,

      length: 9.8,

      gradient: 4.7
    },

    // --------------------------------------------------------
    // BALLON D'ALSACE
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Ballon d’Alsace',

      distanceStart: 85.5,
      distanceEnd: 94.4,

      columnStart: 86,
      columnEnd: 94,

      category: 1,

      length: 8.9,

      gradient: 6.9
    },

    // --------------------------------------------------------
    // COL DU HAAG
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Col du Haag',

      distanceStart: 138.2,
      distanceEnd: 149.4,

      columnStart: 138,
      columnEnd: 149,

      category: 1,

      length: 11.2,

      gradient: 7.3
    }
  ]
}),

// ============================================================
// ÉTAPE 15
// Champagnole → Plateau de Solaison
// Montagne — 183,9 km
// ============================================================

15: checkStage({
  number: 15,

  name: 'Champagnole → Plateau de Solaison',

  type: 'mountain',

  // Distance officielle
  distance: 183.9,

  // 1 case ≈ 1 km
  length: 184,

  // Largeur : 5 voies
  width: 5,

  scale: 1,

  terrain: terrainFromSegments([
    // Champagnole → Côte des Rousses
    [30, P],

    // Côte des Rousses
    // 6,6 km à 5,1 % — catégorie 3
    [7, M],

    // Côte des Rousses → approche du Salève
    [94, V],

    // Le Salève - Col de la Croisette
    // 4,7 km à 11,2 % — catégorie 1
    [5, M],

    // Salève → Côte du Mont
    [8, V],

    // Côte du Mont
    // 2,1 km à 8,3 % — catégorie 3
    [3, M],

    // Côte du Mont → pied de la montée finale
    [26, V],

    // Plateau de Solaison
    // 11,3 km à 9 % — catégorie HC
    [11, M]
  ]),

  features: [

    // --------------------------------------------------------
    // SPRINT INTERMÉDIAIRE — SAINT-LAURENT-EN-GRANDVAUX
    // --------------------------------------------------------

    {
      type: 'sprint',

      name: 'Saint-Laurent-en-Grandvaux',

      distance: 16.8,

      column: 17
    },

    // --------------------------------------------------------
    // CÔTE DES ROUSSES
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Côte des Rousses',

      distanceStart: 30.2,
      distanceEnd: 36.8,

      columnStart: 30,
      columnEnd: 37,

      category: 3,

      length: 6.6,

      gradient: 5.1
    },

    // --------------------------------------------------------
    // LE SALÈVE - COL DE LA CROISETTE
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Le Salève - Col de la Croisette',

      distanceStart: 131.3,
      distanceEnd: 136.0,

      columnStart: 131,
      columnEnd: 136,

      category: 1,

      length: 4.7,

      gradient: 11.2
    },

    // --------------------------------------------------------
    // CÔTE DU MONT
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Côte du Mont',

      distanceStart: 143.9,
      distanceEnd: 146.0,

      columnStart: 144,
      columnEnd: 146,

      category: 3,

      length: 2.1,

      gradient: 8.3
    },

    // --------------------------------------------------------
    // PLATEAU DE SOLAISON
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Plateau de Solaison',

      distanceStart: 172.6,
      distanceEnd: 183.9,

      columnStart: 173,
      columnEnd: 184,

      category: 'HC',

      length: 11.3,

      gradient: 9.0
    }
  ]
}),

// ============================================================
// ÉTAPE 16
// Évian-les-Bains → Thonon-les-Bains
// Contre-la-montre individuel — 26,1 km
// ============================================================

16: checkStage({
  number: 16,

  name: 'Évian-les-Bains → Thonon-les-Bains',

  type: 'timetrial',

  // Distance officielle
  distance: 26.1,

  // CLM : 1 case = 0,5 km
  length: 52,

  // Largeur fixée à 3 voies pour un contre-la-montre
  width: 3,

  // Échelle du plateau
  scale: 0.5,

  terrain: terrainFromSegments([
    // Évian-les-Bains → Thonon-les-Bains
    // Parcours vallonné avec la Côte de Larringes
    [10, V],

    // Côte de Larringes
    // 9,7 km à 4,3 % — catégorie 2
    [19, M],

    // Larringes → Thonon-les-Bains
    [23, V]
  ]),

  features: [

    // --------------------------------------------------------
    // POINT CHRONO INTERMÉDIAIRE N°1
    // L'X — km 4,8
    // --------------------------------------------------------

    {
      type: 'chrono',

      name: "L'X",

      distance: 4.8,

      column: 10
    },

    // --------------------------------------------------------
    // CÔTE DE LARRINGES
    // Km 9,7 — 9,7 km à 4,3 % — catégorie 2
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Côte de Larringes',

      distanceStart: 0,

      distanceEnd: 9.7,

      columnStart: 0,

      columnEnd: 19,

      category: 2,

      length: 9.7,

      gradient: 4.3
    },

    // --------------------------------------------------------
    // POINT CHRONO INTERMÉDIAIRE N°3
    // THONON-LES-BAINS — km 18,1
    // --------------------------------------------------------

    {
      type: 'chrono',

      name: 'Thonon-les-Bains - Bords de Dranse',

      distance: 18.1,

      column: 36
    }
  ]
}),

// ============================================================
// ÉTAPE 17
// Chambéry → Voiron
// Plat — 174,7 km
// ============================================================

17: checkStage({
  number: 17,

  name: 'Chambéry → Voiron',

  type: 'flat',

  // Distance officielle
  distance: 174.7,

  // 1 case ≈ 1 km
  length: 175,

  // Largeur : 5 voies
  width: 5,

  scale: 1,

  terrain: terrainFromSegments([
    // Chambéry → Côte de Bassa
    [19, P],

    // Côte de Bassa
    // 1,6 km à 5,5 % — catégorie 4
    [2, M],

    // Bassa → Côte de Rossillon
    [14, V],

    // Côte de Rossillon
    // 1,7 km à 4,6 % — catégorie 4
    [2, M],

    // Rossillon → Col des Près
    [12, V],

    // Col des Près
    // 3,6 km à 6,8 % — catégorie 3
    [4, M],

    // Col des Près → Côte de Saint-Jean-d'Arvey
    [6, V],

    // Côte de Saint-Jean-d'Arvey
    // 1,2 km à 5,7 % — catégorie 4
    [1, M],

    // Saint-Jean-d'Arvey → Voiron
    [115, P]
  ]),

  features: [

    // --------------------------------------------------------
    // CÔTE DE BASSA
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Côte de Bassa',

      distanceStart: 17.6,
      distanceEnd: 19.2,

      columnStart: 18,
      columnEnd: 19,

      category: 4,

      length: 1.6,

      gradient: 5.5
    },

    // --------------------------------------------------------
    // CÔTE DE ROSSILLON
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Côte de Rossillon',

      distanceStart: 33.8,
      distanceEnd: 35.5,

      columnStart: 34,
      columnEnd: 36,

      category: 4,

      length: 1.7,

      gradient: 4.6
    },

    // --------------------------------------------------------
    // COL DES PRÈS
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Col des Près',

      distanceStart: 46.0,
      distanceEnd: 49.6,

      columnStart: 46,
      columnEnd: 50,

      category: 3,

      length: 3.6,

      gradient: 6.8
    },

    // --------------------------------------------------------
    // CÔTE DE SAINT-JEAN-D'ARVEY
    // --------------------------------------------------------

    {
      type: 'climb',

      name: "Côte de Saint-Jean-d'Arvey",

      distanceStart: 58.3,
      distanceEnd: 59.5,

      columnStart: 58,
      columnEnd: 60,

      category: 4,

      length: 1.2,

      gradient: 5.7
    },

    // --------------------------------------------------------
    // SPRINT INTERMÉDIAIRE — COLOMBE
    // --------------------------------------------------------

    {
      type: 'sprint',

      name: 'Colombe',

      distance: 147.5,

      column: 148
    }
  ]
}),

// ============================================================
// ÉTAPE 18
// Voiron → Orcières-Merlette
// Montagne — 185,2 km
// ============================================================

18: checkStage({
  number: 18,

  name: 'Voiron → Orcières-Merlette',

  type: 'mountain',

  // Distance officielle
  distance: 185.2,

  // 1 case ≈ 1 km
  length: 185,

  // Largeur : 5 voies
  width: 5,

  scale: 1,

  terrain: terrainFromSegments([
    // Voiron → Côte d'Engins
    [37, M],

    // Côte d'Engins → Côte de Monteynard
    [55, V],

    // Côte de Monteynard
    [10, M],

    // Monteynard → Côte des Terrasses
    [20, V],

    // Côte des Terrasses
    [3, M],

    // Terrasses → Côte de Saint-Léger-les-Mélèzes
    [50, V],

    // Côte de Saint-Léger-les-Mélèzes
    [3, M],

    // Saint-Léger-les-Mélèzes → Orcières-Merlette
    [7, M]
  ]),

  features: [

    // --------------------------------------------------------
    // CÔTE D'ENGINS
    // Km 36,7 — 11,5 km à 5,4 % — catégorie 1
    // --------------------------------------------------------

    {
      type: 'climb',

      name: "Côte d'Engins",

      distanceStart: 25.2,
      distanceEnd: 36.7,

      columnStart: 25,
      columnEnd: 37,

      category: 1,

      length: 11.5,

      gradient: 5.4
    },

    // --------------------------------------------------------
    // SPRINT INTERMÉDIAIRE — CORPS
    // Km 129,0
    // --------------------------------------------------------

    {
      type: 'sprint',

      name: 'Corps',

      distance: 129.0,

      column: 129
    },

    // --------------------------------------------------------
    // CÔTE DE MONTEYNARD
    // Km 92,2 — 9,7 km à 5 % — catégorie 2
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Côte de Monteynard',

      distanceStart: 82.5,
      distanceEnd: 92.2,

      columnStart: 83,
      columnEnd: 92,

      category: 2,

      length: 9.7,

      gradient: 5.0
    },

    // --------------------------------------------------------
    // CÔTE DES TERRASSES
    // Km 112,8 — 3,4 km à 6,6 % — catégorie 3
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Côte des Terrasses',

      distanceStart: 109.4,
      distanceEnd: 112.8,

      columnStart: 109,
      columnEnd: 113,

      category: 3,

      length: 3.4,

      gradient: 6.6
    },

    // --------------------------------------------------------
    // CÔTE DE SAINT-LÉGER-LES-MÉLÈZES
    // Km 166,2 — 2,5 km à 6,9 % — catégorie 3
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Côte de Saint-Léger-les-Mélèzes',

      distanceStart: 163.7,
      distanceEnd: 166.2,

      columnStart: 164,
      columnEnd: 166,

      category: 3,

      length: 2.5,

      gradient: 6.9
    },

    // --------------------------------------------------------
    // ARRIVÉE — ORCIÈRES-MERLETTE
    // Km 185,2 — 7,1 km à 6,7 % — catégorie 1
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Orcières-Merlette',

      distanceStart: 178.1,
      distanceEnd: 185.2,

      columnStart: 178,
      columnEnd: 185,

      category: 1,

      length: 7.1,

      gradient: 6.7
    }
  ]
}),

// ============================================================
// ÉTAPE 19
// Gap → Alpe d'Huez
// Montagne — 127,9 km
// ============================================================

19: checkStage({
  number: 19,

  name: 'Gap → Alpe d’Huez',

  type: 'mountain',

  // Distance officielle
  distance: 127.9,

  // 1 case ≈ 1 km
  length: 128,

  // Largeur : 5 voies
  width: 5,

  scale: 1,

  terrain: terrainFromSegments([
    // Gap → Col Bayard
    // 4,8 km à 7,2 % — catégorie 2
    [5, M],

    // Col Bayard → pied du Col du Noyer
    [13, V],

    // Col du Noyer
    // 7,2 km à 8,5 % — catégorie 1
    [7, M],

    // Col du Noyer → pied du Col d'Ornon
    [69, V],

    // Col d'Ornon
    // 5,4 km à 6,4 % — catégorie 2
    [5, M],

    // Col d'Ornon → pied de l'Alpe d'Huez
    [15, V],

    // Montée finale vers l'Alpe d'Huez
    // 13,7 km à 8,1 % — catégorie HC
    [14, M]
  ]),

  features: [

    // --------------------------------------------------------
    // COL BAYARD
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Col Bayard',

      distanceStart: 0,
      distanceEnd: 4.8,

      columnStart: 0,
      columnEnd: 5,

      category: 2,

      length: 4.8,

      gradient: 7.2
    },

    // --------------------------------------------------------
    // COL DU NOYER
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Col du Noyer',

      distanceStart: 18.0,
      distanceEnd: 25.2,

      columnStart: 18,
      columnEnd: 25,

      category: 1,

      length: 7.2,

      gradient: 8.5
    },

    // --------------------------------------------------------
    // SPRINT INTERMÉDIAIRE — LE PÉRIER
    // --------------------------------------------------------

    {
      type: 'sprint',

      name: 'Le Périer',

      distance: 89.4,

      column: 89
    },

    // --------------------------------------------------------
    // COL D'ORNON
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Col d’Ornon',

      distanceStart: 93.8,
      distanceEnd: 99.2,

      columnStart: 94,
      columnEnd: 99,

      category: 2,

      length: 5.4,

      gradient: 6.4
    },

    // --------------------------------------------------------
    // ALPE D'HUEZ
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Alpe d’Huez',

      distanceStart: 114.2,
      distanceEnd: 127.9,

      columnStart: 114,
      columnEnd: 128,

      category: 'HC',

      length: 13.7,

      gradient: 8.1
    }
  ]
}),

// ============================================================
// ÉTAPE 20
// Le Bourg d'Oisans → Alpe d'Huez
// Montagne — 170,9 km
// ============================================================

20: checkStage({
  number: 20,

  name: "Le Bourg d'Oisans → Alpe d'Huez",

  type: 'mountain',

  // Distance officielle
  distance: 170.9,

  // 1 case ≈ 1 km
  length: 171,

  // Largeur : 5 voies
  width: 5,

  scale: 1,

  terrain: terrainFromSegments([
    // Le Bourg d'Oisans → pied de la Croix de Fer
    [10, P],

    // Col de la Croix de Fer
    // 24 km à 5,2 % — catégorie HC
    [24, M],

    // Croix de Fer → pied du Télégraphe
    [42, V],

    // Col du Télégraphe
    // 11,9 km à 7,1 % — catégorie 1
    [12, M],

    // Télégraphe → pied du Galibier
    [5, V],

    // Col du Galibier
    // 17,7 km à 6,9 % — catégorie HC
    [18, M],

    // Galibier → pied du Col de Sarenne
    [33, V],

    // Col de Sarenne
    // 12,8 km à 7,3 % — catégorie HC
    [13, M],

    // Sarenne → Alpe d'Huez
    [14, V]
  ]),

  features: [

    // --------------------------------------------------------
    // SPRINT INTERMÉDIAIRE — SAINT-JULIEN-MONT-DENIS
    // --------------------------------------------------------

    {
      type: 'sprint',

      name: 'Saint-Julien-Mont-Denis',

      distance: 66.5,

      column: 67
    },

    // --------------------------------------------------------
    // COL DE LA CROIX DE FER
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Col de la Croix de Fer',

      distanceStart: 9.7,
      distanceEnd: 33.7,

      columnStart: 10,
      columnEnd: 34,

      category: 'HC',

      length: 24,

      gradient: 5.2
    },

    // --------------------------------------------------------
    // COL DU TÉLÉGRAPHE
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Col du Télégraphe',

      distanceStart: 75.7,
      distanceEnd: 87.6,

      columnStart: 76,
      columnEnd: 88,

      category: 1,

      length: 11.9,

      gradient: 7.1
    },

    // --------------------------------------------------------
    // COL DU GALIBIER
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Col du Galibier',

      distanceStart: 92.8,
      distanceEnd: 110.5,

      columnStart: 93,
      columnEnd: 111,

      category: 'HC',

      length: 17.7,

      gradient: 6.9
    },

    // --------------------------------------------------------
    // COL DE SARENNE
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Col de Sarenne',

      distanceStart: 143.7,
      distanceEnd: 156.5,

      columnStart: 144,
      columnEnd: 157,

      category: 'HC',

      length: 12.8,

      gradient: 7.3
    }
  ]
}),


// ============================================================
// ÉTAPE 21
// Thoiry → Paris Champs-Élysées
// Plat — 88,7 km
// ============================================================

21: checkStage({
  number: 21,

  name: 'Thoiry → Paris Champs-Élysées',

  type: 'flat',

  // Distance officielle
  distance: 88.7,

  // 1 case ≈ 1 km
  length: 89,

  // Largeur : 5 voies
  width: 5,

  scale: 1,

  terrain: terrainFromSegments([
    // Thoiry → première ascension de Montmartre
    [46, P],

    // Côte de la Butte Montmartre
    [1, M],

    // Premier passage → deuxième ascension
    [15, P],

    // Côte de la Butte Montmartre
    [1, M],

    // Deuxième passage → troisième ascension
    [15, P],

    // Côte de la Butte Montmartre
    [1, M],

    // Dernier passage → Champs-Élysées
    [10, P]
  ]),

  features: [

    // --------------------------------------------------------
    // CÔTE DE LA BUTTE MONTMARTRE — 1er PASSAGE
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Côte de la Butte Montmartre',

      distanceStart: 45.4,
      distanceEnd: 46.4,

      columnStart: 45,
      columnEnd: 46,

      category: 4,

      length: 1,

      gradient: 6.5
    },

    // --------------------------------------------------------
    // CÔTE DE LA BUTTE MONTMARTRE — 2e PASSAGE
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Côte de la Butte Montmartre',

      distanceStart: 61.4,
      distanceEnd: 62.4,

      columnStart: 61,
      columnEnd: 62,

      category: 4,

      length: 1,

      gradient: 6.5
    },

    // --------------------------------------------------------
    // CÔTE DE LA BUTTE MONTMARTRE — 3e PASSAGE
    // --------------------------------------------------------

    {
      type: 'climb',

      name: 'Côte de la Butte Montmartre',

      distanceStart: 77.4,
      distanceEnd: 78.4,

      columnStart: 77,
      columnEnd: 78,

      category: 4,

      length: 1,

      gradient: 6.5
    },

    // --------------------------------------------------------
    // SPRINT / ARRIVÉE — PARIS CHAMPS-ÉLYSÉES
    // --------------------------------------------------------

    {
      type: 'sprint',

      name: 'Paris Champs-Élysées',

      distance: 88.7,

      column: 89
    }
  ]
}),
  }
};


/**
 * Renvoie les informations d'une étape.
 */
export function getTourStage(stageNumber) {
  const stage = TOUR_2026.stages[stageNumber];

  if (!stage) {
    throw new Error(`Étape ${stageNumber} du Tour 2026 non définie.`);
  }

  return stage;
}


/**
 * Renvoie le nombre de cases correspondant à une distance.
 */
export function distanceToCases(distance, scale) {
  return Math.round(distance / scale);
}