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
// Châteauroux → Châteauroux
// Contre-la-montre individuel — 23,2 km
// ============================================================

12: checkStage({
  number: 12,

  name: 'Châteauroux → Châteauroux',

  type: 'timetrial',

  // Distance officielle
  distance: 23.2,

  // CLM : 1 case = 0,5 km
  length: 46,

  // Largeur fixée à 3 voies pour un contre-la-montre
  width: 3,

  // Échelle du plateau
  scale: 0.5,

  terrain: terrainFromSegments([
    // Parcours essentiellement roulant
    [46, P]
  ]),

  features: []
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
    // ÉTAPES 3 À 21
    // ============================================================
    //
    // Elles seront ajoutées ici au fur et à mesure.
    //
    // Exemple :
    //
    // 3: checkStage({
    //   number: 3,
    //   name: 'Granollers → Les Angles',
    //   type: 'mountain',
    //   distance: 195.9,
    //   length: 196,
    //   width: 3,
    //   scale: 1,
    //   terrain: terrainFromSegments([...]),
    //   features: [...]
    // }),
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