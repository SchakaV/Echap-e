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
