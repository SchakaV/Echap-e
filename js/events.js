// events.js — système optionnel d'événements de course
//
// Le système est volontairement indépendant du moteur de déplacement.
//
// À chaque début de tour d'un coureur :
//   1. D20
//   2. Si 1 → événement
//   3. D6 pour déterminer l'événement
//   4. Application immédiate ou différée de la conséquence
//
// Les numéros des événements peuvent être modifiés directement dans EVENTS.
//
// Événements par défaut :
//   1 = Problème de chaîne
//   2 = Crevaison
//   3 = Bris de matériel
//   4 = Fringale
//   5 = Déshydratation
//   6 = Chute

import * as ui from './ui.js';


// ============================================================
// CONFIGURATION
// ============================================================

export const EVENT_CONFIG = {
  // zone de déclenchement : 1 sur le d20, pour ajouter d'autres valeurs, modifier le tableau ci-dessous. (partie entre crochets et séparée par des virgules)
  triggerValues: [1],

  eventDieSides: 6,

  crashPropagationDieSides: 6,

  crashPropagationValues: [5, 6],
};


// ============================================================
// ÉVÉNEMENTS
// ============================================================

export const EVENTS = {

  1: {
    id: 'chain',
    name: 'Problème de chaîne',
    category: 'material',
    icon: '⛓️',
  },

  2: {
    id: 'puncture',
    name: 'Crevaison',
    category: 'material',
    icon: '🛞',
  },

  3: {
    id: 'equipment',
    name: 'Bris de matériel',
    category: 'material',
    icon: '🔧',
  },

  4: {
    id: 'hunger',
    name: 'Fringale',
    category: 'physical',
    icon: '🍌',
  },

  5: {
    id: 'dehydration',
    name: 'Déshydratation',
    category: 'physical',
    icon: '💧',
  },

  6: {
    id: 'crash',
    name: 'Chute',
    category: 'physical',
    icon: '💥',
  },

};

// Référence stable à l'événement Chute, quel que soit son numéro dans
// EVENTS : la chute collective doit appliquer la conséquence CHUTE aux
// coureurs entraînés, pas un autre événement (EVENTS[4] était la Fringale).
const CRASH_EVENT = Object.values(EVENTS).find(e => e.id === 'crash');


// ============================================================
// INITIALISATION
// ============================================================

/**
 * Initialise les variables d'événement d'un coureur.
 *
 * À appeler lors de la création de l'état de course.
 */
export function initializeRider(rider) {

  rider.eventCurrentPenalty = 0;

  rider.eventCurrentImmobile = false;

  rider.eventNextPenalty = 0;

  rider.eventNoBonusRounds = 0;

  // Indicateur visuel « coureur tombé » (jeton couché au centre de sa
  // case pendant toute la manche de la chute, voir CSS .rider-token.crashed).
  rider.hasCrashed = false;

}


// ============================================================
// DÉS
// ============================================================

export function rollD20() {
  return Math.floor(Math.random() * 20) + 1;
}


export function rollD6() {
  return Math.floor(Math.random() * 6) + 1;
}


// ============================================================
// DÉCLENCHEMENT D'UN ÉVÉNEMENT
// ============================================================

/**
 * Lance le d20 au début du tour du coureur.
 */
export function checkEventTrigger(rider) {

  const roll = rollD20();

  const triggered =
    EVENT_CONFIG.triggerValues.includes(roll);

  return {
    roll,
    triggered,
  };
}


/**
 * Lance le d6 qui détermine l'incident.
 */
export function drawEvent() {

  const roll = rollD6();
  const event = EVENTS[roll];

  return {
    roll,
    event,
  };
}


// ============================================================
// CONSÉQUENCES
// ============================================================

/**
 * Applique la conséquence d'un événement au coureur.
 */
export function applyEventConsequence(rider, event) {

  switch (event.id) {

    // --------------------------------------------------------
    // 1 — CREVAISON
    // --------------------------------------------------------
    case 'puncture':

      // -2 au jet de la manche en cours
      rider.eventCurrentPenalty =
        (rider.eventCurrentPenalty || 0) - 2;

      break;


    // --------------------------------------------------------
    // 2 — PROBLÈME DE CHAÎNE
    // --------------------------------------------------------
    case 'chain':

      // Le coureur ne joue pas cette manche.
      rider.eventCurrentImmobile = true;

      break;


    // --------------------------------------------------------
    // 3 — BRIS DE MATÉRIEL
    // --------------------------------------------------------
    case 'equipment':

      // -1 au jet de la manche en cours
      rider.eventCurrentPenalty =
        (rider.eventCurrentPenalty || 0) - 1;

      break;


    // --------------------------------------------------------
    // 4 — CHUTE
    // --------------------------------------------------------
    case 'crash':

      // Immobilisation de la manche en cours
      rider.eventCurrentImmobile = true;

      // Perte de tous les bonus à la manche suivante.
      rider.eventNoBonusRounds =
        Math.max(rider.eventNoBonusRounds || 0, 1);

      break;


    // --------------------------------------------------------
    // 5 — FRINGALE
    // --------------------------------------------------------
    case 'hunger':

      // -2 au jet de la prochaine manche
      rider.eventNextPenalty =
        (rider.eventNextPenalty || 0) - 2;

      break;


    // --------------------------------------------------------
    // 6 — DÉSHYDRATATION
    // --------------------------------------------------------
    case 'dehydration':

      // Perte de tous les bonus :
      // - manche actuelle
      // - manche suivante
      rider.eventNoBonusRounds =
        Math.max(rider.eventNoBonusRounds || 0, 2);

      break;
  }
}


// ============================================================
// CHUTE — COUREURS AUTOUR
// ============================================================

/**
 * Retourne les coureurs situés :
 *
 * - case du haut
 * - case du bas
 * - case derrière
 *
 * par rapport au coureur qui chute.
 */
export function getCrashNeighbors(state, rider) {

  const positions = [

    // Case du haut
    {
      column: rider.column,
      lane: rider.lane - 1,
    },

    // Case du bas
    {
      column: rider.column,
      lane: rider.lane + 1,
    },

    // Case derrière
    {
      column: rider.column - 1,
      lane: rider.lane,
    },

  ];

  const neighbors = [];

  for (const position of positions) {

    const other = state.riders.find(r =>
      !r.finished &&
      r.id !== rider.id &&
      r.column === position.column &&
      r.lane === position.lane
    );

    if (
      other &&
      !neighbors.some(r => r.id === other.id)
    ) {
      neighbors.push(other);
    }
  }

  return neighbors;
}


// ============================================================
// PROPAGATION DE LA CHUTE
// ============================================================

/**
 * Un coureur voisin lance un d6.
 *
 * 5 ou 6 = il chute également.
 */
export function testCrashPropagation() {

  const roll = rollD6();

  return {
    roll,
    crashes:
      EVENT_CONFIG.crashPropagationValues.includes(roll),
  };
}


/**
 * Gère la chute et son effet domino.
 */
export function resolveCrash(state, initialRider) {

  const fallen = [];

  const processed = new Set();

  const queue = [initialRider];


  while (queue.length) {

    const rider = queue.shift();

    if (!rider) continue;

    if (processed.has(rider.id)) {
      continue;
    }

    processed.add(rider.id);

    // Indicateur visuel : le jeton reste couché au centre de la case
    // pendant toute la manche de la chute.
    rider.hasCrashed = true;

    // Le premier coureur tombe automatiquement.
    fallen.push({
      rider,
      propagationRoll: null,
      initial: rider.id === initialRider.id,
    });


    // Recherche des coureurs autour de lui.
    const neighbors =
      getCrashNeighbors(state, rider);


    for (const neighbor of neighbors) {

      if (processed.has(neighbor.id)) {
        continue;
      }

      const result =
        testCrashPropagation();


      if (result.crashes) {

        // Le coureur chute à son tour : même conséquence que la
        // chute initiale (immobilisation + perte des bonus).
        applyEventConsequence(
          neighbor,
          CRASH_EVENT
        );

        fallen.push({
          rider: neighbor,
          propagationRoll: result.roll,
          initial: false,
        });

        queue.push(neighbor);

      } else {

        // On mémorise quand même le résultat
        // pour le journal.
        neighbor._lastCrashPropagationRoll =
          result.roll;
      }
    }
  }

  return fallen;
}


// ============================================================
// TRAITEMENT COMPLET DU TOUR
// ============================================================

/**
 * Fonction appelée AU DÉBUT du tour du coureur.
 *
 * C'est volontairement ici que le d20 est lancé.
 */
export function processStartOfTurn(
  state,
  rider,
  logElement
) {

  const result = {
    triggered: false,
    triggerRoll: null,
    eventRoll: null,
    event: null,
    fallen: [],
  };


  const trigger =
    checkEventTrigger(rider);

  result.triggerRoll = trigger.roll;


  // Pas d'événement.
  if (!trigger.triggered) {

    return result;
  }


  // Un événement est déclenché.
  result.triggered = true;


  const drawn =
    drawEvent();

  result.eventRoll = drawn.roll;
  result.event = drawn.event;


  // ----------------------------------------------------------
  // CHUTE
  // ----------------------------------------------------------

  if (drawn.event.id === 'crash') {

    applyEventConsequence(
      rider,
      drawn.event
    );

    result.fallen =
      resolveCrash(
        state,
        rider
      );

  } else {

    // Tous les autres incidents.
    applyEventConsequence(
      rider,
      drawn.event
    );
  }


  // Journal.
  logEvent(
    result,
    logElement
  );


  return result;
}


// ============================================================
// JOURNAL
// ============================================================

export function logEvent(
  result,
  logElement
) {

  if (!result.triggered) {
    return;
  }


  const riderName =
    result.fallen.length
      ? result.fallen[0].rider.name
      : '';


  const event =
    result.event;


  ui.appendLog(
    logElement,

    `<b>⚠️ ÉVÉNEMENT</b> — ` +
    `<b>${riderName}</b> ` +
    `obtient ${result.triggerRoll} au d20 → ` +
    `${event.icon} <b>${event.name}</b> ` +
    `(d6 : ${result.eventRoll}).`
  );


  // Chute.
  if (event.id === 'crash') {

    if (result.fallen.length === 1) {

      ui.appendLog(
        logElement,

        `💥 <b>${riderName}</b> chute seul.`
      );

    } else {

      const names =
        result.fallen
          .map(item =>
            `<b>${item.rider.name}</b>`
          )
          .join(', ');


      ui.appendLog(
        logElement,

        `💥 <b>Chute collective</b> : ${names}.`
      );


      for (
        const item of result.fallen
      ) {

        if (item.initial) {
          continue;
        }

        ui.appendLog(
          logElement,

          `↳ ${item.rider.name} : ` +
          `d6 = ${item.propagationRoll} → chute.`
        );
      }
    }

    return;
  }


  // Autres événements.
  ui.appendLog(
    logElement,

    `↳ Conséquence : ${describeConsequence(event)}`
  );
}


export function describeConsequence(event) {

  switch (event.id) {

    case 'puncture':
      return '-2 au jet de la manche en cours.';

    case 'chain':
      return 'immobilisation pour la manche en cours.';

    case 'equipment':
      return '-1 au jet de la manche en cours.';

    case 'hunger':
      return '-2 au jet de la prochaine manche.';

    case 'dehydration':
      return 'perte de tous les bonus pendant 2 manches.';

    case 'crash':
      return 'immobilisation de la manche en cours + perte des bonus à la manche suivante.';

    default:
      return '';
  }
}