// race-loop.js — boucle de jeu tour par tour d'une étape
// (mode solo/hotseat/IA) : ordre de passage, tour humain, tour IA,
// animation de déplacement, simulation jusqu'à l'arrivée.
//
// Gestion des événements :
// - Le d20 événement est lancé au DÉBUT du tour.
// - Sur 1 ou 20, un événement est déclenché.
// - L'événement est résolu avant le jet de déplacement.
// - Les événements sont optionnels via App.config.eventsEnabled.

import { $ } from './dom.js';
import * as engine from './engine.js';
import { aiChooseCell } from './ai.js';
import { SPECIALIZATIONS } from './rider.js';
import * as ui from './ui.js';
import * as events from './events.js';
import { App } from './state.js';
import { renderRaceBoard, renderRosterNow } from './race-render.js';
import { finishStage } from './results-screen.js';

// ============================================================
// PANNEAU DU TOUR
// ============================================================

export function setTurnPanel(color, text) {
  $('#turn-swatch').style.background = color;
  $('#turn-text').textContent = text;
}

// ============================================================
// ÉCRAN DE COURSE
// ============================================================

export function bindRaceScreen() {
  $('#btn-sim-race').addEventListener('click', simulateToEnd);
  $('#btn-toggle-rules').addEventListener('click', () => {
    $('#rules-panel').classList.toggle('hidden');
  });
  ui.renderSpecReference($('#race-spec-reference'), SPECIALIZATIONS);
}

// ============================================================
// ÉQUIPE
// ============================================================

export function teamOf(rider) {
  return App.teams.find(t => t.id === rider.teamId);
}

// ============================================================
// DÉBUT D'UNE MANCHE
// ============================================================

/** Relève les coureurs tombés à la manche précédente : le jeton ne reste
 *  couché au centre de sa case que pendant la manche où la chute a eu lieu. */
function resetCrashedFlags(rt) {
  rt.state.riders.forEach(rider => {
    rider.hasCrashed = false;
  });
}

export function startRound() {
  const rt = App.runtime;
  rt.state.round++;

  // La manche de la chute est terminée : on relève les coureurs tombés.
  resetCrashedFlags(rt);

  if (rt.isTimeTrial) {
    // En CLM par équipe, les équipes s'élancent avec 2 manches d'écart.
    const interval = rt.isTeamTimeTrial ? (rt.state.ttStartInterval || 1) : 1;
    const due = (rt.state.round - 1) % interval === 0;
    const pending = rt.state.ttPendingStart === true;
    const introduce = due || pending;
    const introduced = introduce
      ? (rt.isTeamTimeTrial
          ? engine.introduceNextTeamTT(rt.state)
          : engine.introduceNextTTRider(rt.state))
      : null;
    // Si aucun départ n'a pu se faire cette manche (pas de voie libre), on
    // réessaiera la manche suivante.
    rt.state.ttPendingStart = introduce && !introduced;

    if (introduced) {
      const label = rt.isTeamTimeTrial ? teamOf(introduced[0]).name : introduced.name;
      ui.appendLog($('#log-content'), `<b>${label}</b> s'élance !`);
      renderRosterNow();
    }

    rt.order = engine.ttRoundOrder(rt.state);
  } else {
    rt.order = engine.roundOrder(rt.state);
  }

  rt.orderIdx = 0;
  advanceTurn();
}

// ============================================================
// FIN DE MANCHE
// ============================================================

export function endRoundAndContinue() {
  const rt = App.runtime;
  engine.updateDraftBonuses(rt.state);

  let allDone;
  if (rt.isTimeTrial) {
    allDone = engine.allTTFinished(rt.state);
    if (allDone) engine.rankTimeTrialResults(rt.state);
  } else {
    const finishers = rt.state.riders.filter(r => r.finished && r.finishRound === rt.state.round);
    if (finishers.length) engine.rankFinishersOfRound(rt.state, finishers);
    allDone = engine.allFinished(rt.state);
  }

  renderRaceBoard(rt.state);
  renderRosterNow();

  if (allDone) {
    finishStage();
    return;
  }

  ui.showToast(`Manche ${rt.state.round} terminée — tout le monde a joué`);
  ui.appendLog($('#log-content'), `<b>— Fin de la manche ${rt.state.round} —</b>`);
  setTimeout(startRound, 400);
}

// ============================================================
// AVANCE AU COUREUR SUIVANT
// ============================================================

export function advanceTurn() {
  const rt = App.runtime;
  if (!rt) return;

  if (rt.orderIdx >= rt.order.length) {
    endRoundAndContinue();
    return;
  }

  const rider = rt.order[rt.orderIdx];

  if (rider.finished) {
    rt.orderIdx++;
    advanceTurn();
    return;
  }

  const team = teamOf(rider);
  setTurnPanel(rider.teamColor, `${team.name} — ${rider.name} (${rider.spec.label})`);
  $('#dice-breakdown').textContent = '';

  ui.renderBoard($('#board'), rt.state, {
    activeCell: { column: rider.column, lane: rider.lane },
    autoScroll: true,
    jerseys: App.jerseys,
  });

  if (rider.isAI) {
    runAiTurn(rider);
  } else {
    startHumanTurn(rider);
  }
}

// ============================================================
// EFFETS D'ÉVÉNEMENTS
// ============================================================

/**
 * Prépare les effets provenant d'une manche précédente.
 *
 * Exemple — Fringale :
 *   manche N    → événement
 *   manche N+1  → -2
 *
 * Le malus « prochaine manche » devient donc le malus « manche actuelle ».
 */
function prepareEventEffects(rider) {
  rider.eventCurrentPenalty = rider.eventNextPenalty || 0;
  rider.eventNextPenalty = 0;
}

/**
 * Termine la consommation des effets d'événement de la manche.
 *
 * IMPORTANT : le compteur de perte de bonus est décrémenté APRÈS la manche
 * pendant laquelle il a été actif.
 */
function finishEventTurn(rider) {
  if (rider.eventNoBonusRounds && rider.eventNoBonusRounds > 0) {
    rider.eventNoBonusRounds--;
  }
  // Le malus actuel ne doit pas rester pour la manche suivante.
  rider.eventCurrentPenalty = 0;
}

/** Les événements ne se déclenchent qu'une fois tous les coureurs sur la
 *  première case de course (colonne 0), jamais en contre-la-montre. */
function areEventsActive(rt) {
  return !rt.isTimeTrial &&
    App.config?.eventsEnabled &&
    rt.state.riders.every(r => r.column >= 0);
}

/**
 * Début de tour commun aux trois chemins (humain, IA, simulation) :
 * prépare les effets de la manche précédente, puis lance le d20 événement
 * s'il est actif. Renvoie le résultat de processStartOfTurn (ou null).
 */
function runStartOfTurn(rider) {
  prepareEventEffects(rider);
  if (!areEventsActive(App.runtime)) return null;
  return events.processStartOfTurn(App.runtime.state, rider, $('#log-content'));
}

/**
 * Applique l'immobilisation si le coureur est victime d'un événement
 * (problème de chaîne, chute…). Journalise, consomme les effets d'événement
 * et renvoie true pour que l'appelant termine son tour sans déplacement.
 * Le passage au coureur suivant est à la charge de l'appelant (la
 * simulation itère sa propre liste, sans setTimeout).
 */
function applyImmobility(rider) {
  if (!rider.eventCurrentImmobile) return false;
  rider.eventCurrentImmobile = false;
  ui.appendLog($('#log-content'),
    `<b>${rider.name}</b> est immobilisé pour cette manche et ne se déplace pas.`);
  finishEventTurn(rider);
  return true;
}

/** Termine le tour d'un coureur après son déplacement : mise à jour du
 *  moteur, journal, rendus, puis passage au coureur suivant. */
function completeRiderMove(rider, rollInfo, target, column, lane, delay) {
  const rt = App.runtime;
  engine.applyMove(rt.state, rider, column, lane, rollInfo);
  logMove(rider, rollInfo, target);
  finishEventTurn(rider);
  renderRaceBoard(rt.state);
  renderRosterNow();
  rt.orderIdx++;
  setTimeout(advanceTurn, delay);
}

/** Anime le ou les dés (selon le mode 2 dés) puis appelle onDone. */
function animateRoll(rollInfo, { duration = 650, onDone }) {
  const die2El = $('#die-face-2');
  if (rollInfo.twoDice) {
    if (die2El) {
      die2El.textContent = '';
      die2El.classList.remove('hidden');
    }
    ui.animateTwoDice($('#die-face'), die2El, rollInfo.roll, rollInfo.roll2, { duration, onDone });
  } else {
    if (die2El) die2El.classList.add('hidden');
    ui.animateDice($('#die-face'), rollInfo.roll, { duration, onDone });
  }
}

// ============================================================
// TEXTE DU DÉ
// ============================================================

export function breakdownText(rollInfo) {
  const diceLabel = rollInfo.twoDice
    ? `dés ${rollInfo.roll} + ${rollInfo.roll2}${rollInfo.rerolled ? ' (relance)' : ''}`
    : `dé ${rollInfo.roll}${rollInfo.rerolled ? ' (relance)' : ''}`;
  const bits = [diceLabel, ...engine.rollBonusBits(rollInfo)];
  return `${bits.join(' · ')} = <b>${rollInfo.total}</b> case(s). Cliquez une case en surbrillance.`;
}

/**
 * Complète le détail du dé avec la PORTÉE réelle des cases proposées : la
 * colonne la plus avancée atteignable. Permet de comprendre immédiatement
 * pourquoi des cases plus loin ne sont pas cliquables (jet trop court, ou
 * bouchon qui empêche d'utiliser tous les pas du dé).
 */
function reachHint(target) {
  if (!target || !target.cells || !target.cells.length) return '';
  const maxColumn = Math.max(...target.cells.map(c => c.column));
  if (target.finishing) return ' \u2014 la ligne d\u2019arriv\u00e9e est atteignable !';
  if (target.blocked) return ` \u2014 bouchon : au plus colonne ${maxColumn}.`;
  return ` \u2014 port\u00e9e max : colonne ${maxColumn}.`;
}

// ============================================================
// TOUR HUMAIN
// ============================================================

/**
 * Construit les lignes affichées dans la pop-up d'événement (jet de dés +
 * conséquence, ou détail de la chute collective le cas échéant) — reprend
 * la même information que le journal de course (voir events.logEvent),
 * mais sous une forme adaptée à une pop-up centrée plutôt qu'à un flux de
 * lignes de journal.
 */
function eventPopupLines(rider, eventResult) {
  const event = eventResult.event;
  const lines = [
    `Jet du d20 : <b>${eventResult.triggerRoll}</b> → jet du d6 : <b>${eventResult.eventRoll}</b>.`,
  ];

  if (event.id === 'crash') {
    const others = eventResult.fallen.filter(f => !f.initial);
    if (!others.length) {
      lines.push(`💥 <b>${rider.name}</b> chute seul.`);
    } else {
      const names = others.map(f => `<b>${f.rider.name}</b>`).join(', ');
      lines.push(`💥 <b>Chute collective</b> — entraîne aussi : ${names}.`);
    }
  }

  lines.push(events.describeConsequence(event));
  return lines;
}

export function startHumanTurn(rider) {
  // 1 — Effets de la manche précédente + d20 événement.
  const eventResult = runStartOfTurn(rider);

  // 2 — Pop-up d'événement : si un événement s'est déclenché, le joueur doit
  // le voir et cliquer sur OK avant que le tour continue (immobilisation ou
  // dé de déplacement) — la suite du tour est dans continueHumanTurn,
  // appelée soit tout de suite (pas d'événement), soit depuis le clic OK.
  if (eventResult && eventResult.triggered) {
    ui.showEventPopup({
      icon: eventResult.event.icon,
      title: `${rider.name} — ${eventResult.event.name}`,
      lines: eventPopupLines(rider, eventResult),
      onClose: () => continueHumanTurn(rider),
    });
    return;
  }

  continueHumanTurn(rider);
}

/**
 * Suite du tour humain, une fois l'éventuelle pop-up d'événement refermée
 * (ou tout de suite s'il n'y avait pas d'événement) : immobilisation puis
 * dé de déplacement.
 */
function continueHumanTurn(rider) {
  const rt = App.runtime;

  // 3 — Immobilisation (problème de chaîne, chute…).
  if (applyImmobility(rider)) {
    rt.orderIdx++;
    setTimeout(advanceTurn, 250);
    return;
  }

  // 4 — Tour normal : dé de déplacement.
  const btn = $('#btn-roll-dice');
  btn.style.display = 'inline-block';
  btn.disabled = false;

  $('#die-face').textContent = '';
  const die2El = $('#die-face-2');
  if (die2El) {
    die2El.textContent = '';
    die2El.classList.add('hidden');
  }
  $('#dice-breakdown').textContent = '';

  btn.onclick = () => {
    btn.disabled = true;

    const rollInfo = engine.computeRoll(rt.state, rider);
    const target = engine.resolveTarget(rt.state, rider, rollInfo.total);

    animateRoll(rollInfo, {
      onDone: () => {
        $('#dice-breakdown').innerHTML = breakdownText(rollInfo) + reachHint(target);

        ui.renderBoard($('#board'), rt.state, {
          highlightCells: target.cells,
          activeCell: { column: rider.column, lane: rider.lane },
          jerseys: App.jerseys,
          onCellClick: (col, lane) => {
            const chosen = target.cells.find(c => c.column === col && c.lane === lane);
            const path = chosen ? chosen.path : [{ column: col, lane }];

            $('#dice-breakdown').textContent = '';
            animateRiderAlongPath(rider, path, () => {
              completeRiderMove(rider, rollInfo, target, col, lane, 250);
            });
          },
        });
      },
    });
  };
}

// ============================================================
// TOUR IA
// ============================================================

export function runAiTurn(rider) {
  const rt = App.runtime;
  $('#btn-roll-dice').style.display = 'none';

  // 1 — Effets de la manche précédente + d20 événement (résultat ignoré :
  // l'IA ne reçoit pas de pop-up, seul le journal relate l'incident).
  runStartOfTurn(rider);

  // 2 — Immobilisation.
  if (applyImmobility(rider)) {
    rt.orderIdx++;
    setTimeout(advanceTurn, 200);
    return;
  }

  // 3 — Dé de déplacement.
  const rollInfo = engine.computeRoll(rt.state, rider);
  const target = engine.resolveTarget(rt.state, rider, rollInfo.total);

  animateRoll(rollInfo, {
    duration: 400,
    onDone: () => {
      const cell = aiChooseCell(rt.state, rider, target.cells);
      animateRiderAlongPath(rider, cell.path, () => {
        completeRiderMove(rider, rollInfo, target, cell.column, cell.lane, 200);
      });
    },
  });
}

// ============================================================
// ANIMATION DU COUREUR
// ============================================================

export function animateRiderAlongPath(rider, path, onDone) {
  const rt = App.runtime;

  if (!path || !path.length) {
    onDone();
    return;
  }

  let i = 0;
  const stepDuration = 220;

  function step() {
    if (i >= path.length) {
      onDone();
      return;
    }

    const { column, lane } = path[i];

    // Rendu intermédiaire : le coureur est déplacé sur la case courante du
    // chemin, sans être marqué comme arrivé avant la fin de l'animation.
    const tempRiders = rt.state.riders.map(r =>
      r.id === rider.id ? { ...r, column, lane, finished: false } : r
    );

    ui.renderBoard($('#board'), {
      board: rt.state.board,
      riders: tempRiders,
      finishColumn: rt.state.finishColumn,
    }, {
      activeCell: { column, lane },
      autoScroll: 'edge',
      jerseys: App.jerseys,
    });

    i++;
    setTimeout(step, stepDuration);
  }

  step();
}

// ============================================================
// SIMULATION AUTOMATIQUE D'UN COUREUR
// ============================================================

export function resolveRiderAuto(rider) {
  const rt = App.runtime;
  const state = rt.state;

  // 1 — Effets de la manche précédente + d20 événement.
  runStartOfTurn(rider);

  // 2 — Immobilisation : pas de déplacement, la boucle de simulation passe
  // directement au coureur suivant (pas de setTimeout ni d'incrément ici).
  if (applyImmobility(rider)) return;

  // 3 — Déplacement normal.
  const rollInfo = engine.computeRoll(state, rider);
  const target = engine.resolveTarget(state, rider, rollInfo.total);
  const cell = aiChooseCell(state, rider, target.cells);

  engine.applyMove(state, rider, cell.column, cell.lane, rollInfo);
  logMove(rider, rollInfo, target);
  finishEventTurn(rider);
}

// ============================================================
// JOURNAL DU DÉPLACEMENT
// ============================================================

export function logMove(rider, rollInfo, target) {
  const bonusBits = engine.rollBonusBits(rollInfo);
  const bonusStr = bonusBits.length ? ` (${bonusBits.join(', ')})` : '';
  const rerollStr = rollInfo.rerolled ? ' [relance rouleur]' : '';
  const blockedStr = target.blocked ? ' — bouchon dans le peloton !' : '';
  const finishStr = rider.finished ? ' 🏁 franchit la ligne !' : '';
  const diceStr = rollInfo.twoDice
    ? `dés ${rollInfo.roll}+${rollInfo.roll2}`
    : `dé ${rollInfo.roll}`;

  ui.appendLog($('#log-content'),
    `<b>${rider.name}</b> (${rider.spec.short}) : ${diceStr}${rerollStr}${bonusStr} → ` +
    `${rollInfo.total} case(s)${blockedStr}${finishStr}`);
}

// ============================================================
// SIMULATION DE LA COURSE
// ============================================================

export function simulateToEnd() {
  const rt = App.runtime;
  if (!rt || rt.resultsProcessed) return;

  if (rt.isTimeTrial) {
    simulateTimeTrialToEnd(rt);
    return;
  }

  if (engine.allFinished(rt.state)) {
    finishStage();
    return;
  }

  // Termine la manche en cours.
  if (rt.order && rt.orderIdx < rt.order.length) {
    for (let i = rt.orderIdx; i < rt.order.length; i++) {
      const r = rt.order[i];
      if (!r.finished) resolveRiderAuto(r);
    }
    engine.updateDraftBonuses(rt.state);
    const finishers = rt.state.riders.filter(r => r.finished && r.finishRound === rt.state.round);
    if (finishers.length) engine.rankFinishersOfRound(rt.state, finishers);
  }

  // Simule les manches suivantes jusqu'à l'arrivée de tout le monde.
  while (!engine.allFinished(rt.state)) {
    rt.state.round++;
    resetCrashedFlags(rt);
    const order = engine.roundOrder(rt.state);
    order.forEach(resolveRiderAuto);
    engine.updateDraftBonuses(rt.state);
    const finishers = rt.state.riders.filter(r => r.finished && r.finishRound === rt.state.round);
    if (finishers.length) engine.rankFinishersOfRound(rt.state, finishers);
  }

  renderRaceBoard(rt.state);
  renderRosterNow();
  finishStage();
}

// ============================================================
// SIMULATION CLM
// ============================================================

export function simulateTimeTrialToEnd(rt) {
  if (engine.allTTFinished(rt.state)) {
    engine.rankTimeTrialResults(rt.state);
    finishStage();
    return;
  }

  // Termine la manche en cours.
  if (rt.order && rt.orderIdx < rt.order.length) {
    for (let i = rt.orderIdx; i < rt.order.length; i++) {
      const r = rt.order[i];
      if (!r.finished) resolveRiderAuto(r);
    }
    engine.updateDraftBonuses(rt.state);
  }

  // Simule les manches suivantes : chaque manche fait s'élancer les nouveaux
  // coureurs prévus (toutes les `ttStartInterval` manches en CLM par équipe),
  // puis tout le monde joue, jusqu'à ce que tous soient partis ET arrivés.
  while (!engine.allTTFinished(rt.state)) {
    rt.state.round++;
    resetCrashedFlags(rt);

    const interval = rt.isTeamTimeTrial ? (rt.state.ttStartInterval || 1) : 1;
    const due = (rt.state.round - 1) % interval === 0;
    const pending = rt.state.ttPendingStart === true;

    if (due || pending) {
      const introduced = rt.isTeamTimeTrial
        ? engine.introduceNextTeamTT(rt.state)
        : engine.introduceNextTTRider(rt.state);
      rt.state.ttPendingStart = !introduced;
    }

    const order = engine.ttRoundOrder(rt.state);
    order.forEach(resolveRiderAuto);
    engine.updateDraftBonuses(rt.state);
  }

  engine.rankTimeTrialResults(rt.state);
  renderRaceBoard(rt.state);
  renderRosterNow();
  finishStage();
}
