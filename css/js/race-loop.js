// race-loop.js — boucle de jeu tour par tour d'une étape
// (mode solo/hotseat/IA) : ordre de passage, tour humain,
// tour IA, animation de déplacement, simulation jusqu'à l'arrivée.
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
// ACTIVATION DES ÉVÉNEMENTS
// ============================================================
//
// Les événements ne peuvent se déclencher que lorsque TOUS
// les coureurs ont atteint la première case de course (column 0).
//
// Tant qu'un seul coureur possède une column négative,
// aucun événement n'est lancé.

function areEventsActive(state) {
  return state.riders.every(
    rider => rider.column >= 0
  );
}

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

  $('#btn-sim-race').addEventListener(
    'click',
    simulateToEnd
  );

  $('#btn-toggle-rules').addEventListener(
    'click',
    () => {
      $('#rules-panel').classList.toggle('hidden');
    }
  );

  ui.renderSpecReference(
    $('#race-spec-reference'),
    SPECIALIZATIONS
  );
}


// ============================================================
// ÉQUIPE
// ============================================================

export function teamOf(rider) {
  return App.teams.find(
    t => t.id === rider.teamId
  );
}


// ============================================================
// DÉBUT D'UNE MANCHE
// ============================================================

export function startRound() {

  const rt = App.runtime;

  rt.state.round++;

  if (rt.isTimeTrial) {

    // En CLM par équipe, les équipes s'élancent avec
    // 2 manches d'écart.
    const interval =
      rt.isTeamTimeTrial
        ? (rt.state.ttStartInterval || 1)
        : 1;

    const due =
      (rt.state.round - 1) % interval === 0;

    const pending =
      rt.state.ttPendingStart === true;

    const introduce =
      due || pending;

    const introduced =
      introduce
        ? (
            rt.isTeamTimeTrial
              ? engine.introduceNextTeamTT(rt.state)
              : engine.introduceNextTTRider(rt.state)
          )
        : null;

    rt.state.ttPendingStart =
      introduce && !introduced;

    if (introduced) {

      const label =
        rt.isTeamTimeTrial
          ? teamOf(introduced[0]).name
          : introduced.name;

      ui.appendLog(
        $('#log-content'),
        `<b>${label}</b> s'élance !`
      );

      renderRosterNow();
    }

    rt.order =
      engine.ttRoundOrder(rt.state);

  } else {

    rt.order =
      engine.roundOrder(rt.state);
  }

  rt.orderIdx = 0;

  advanceTurn();
}


// ============================================================
// FIN DE MANCHE
// ============================================================

export function endRoundAndContinue() {

  const rt = App.runtime;

  engine.updateDraftBonuses(
    rt.state
  );

  let allDone;

  if (rt.isTimeTrial) {

    allDone =
      engine.allTTFinished(
        rt.state
      );

    if (allDone) {
      engine.rankTimeTrialResults(
        rt.state
      );
    }

  } else {

    const finishers =
      rt.state.riders.filter(
        r =>
          r.finished &&
          r.finishRound === rt.state.round
      );

    if (finishers.length) {

      engine.rankFinishersOfRound(
        rt.state,
        finishers
      );
    }

    allDone =
      engine.allFinished(
        rt.state
      );
  }


  renderRaceBoard(
    rt.state
  );

  renderRosterNow();


  if (allDone) {

    finishStage();

    return;
  }


  ui.showToast(
    `Manche ${rt.state.round} terminée — tout le monde a joué`
  );

  ui.appendLog(
    $('#log-content'),
    `<b>— Fin de la manche ${rt.state.round} —</b>`
  );


  setTimeout(
    startRound,
    400
  );
}


// ============================================================
// AVANCE AU COUREUR SUIVANT
// ============================================================

export function advanceTurn() {

  const rt = App.runtime;

  if (!rt) return;


  if (
    rt.orderIdx >=
    rt.order.length
  ) {

    endRoundAndContinue();

    return;
  }


  const rider =
    rt.order[rt.orderIdx];


  if (rider.finished) {

    rt.orderIdx++;

    advanceTurn();

    return;
  }


  const team =
    teamOf(rider);


  setTurnPanel(
    rider.teamColor,
    `${team.name} — ${rider.name} (${rider.spec.label})`
  );


  $('#dice-breakdown').textContent = '';


  ui.renderBoard(
    $('#board'),
    rt.state,
    {
      activeCell: {
        column: rider.column,
        lane: rider.lane
      },

      autoScroll: true,

      jerseys: App.jerseys,
    }
  );


  // ----------------------------------------------------------
  // COUREUR IA
  // ----------------------------------------------------------

  if (rider.isAI) {

    runAiTurn(rider);

  }

  // ----------------------------------------------------------
  // JOUEUR HUMAIN
  // ----------------------------------------------------------

  else {

    startHumanTurn(rider);
  }
}


// ============================================================
// PRÉPARATION DES EFFETS D'ÉVÉNEMENTS
// ============================================================

/**
 * Prépare les effets provenant d'une manche précédente.
 *
 * Exemple :
 *
 * Fringale :
 *   manche N  → événement
 *   manche N+1 → -2
 *
 * Le malus "prochaine manche" devient donc
 * le malus "manche actuelle".
 */
function prepareEventEffects(rider) {

  // Le malus prévu pour cette manche
  // devient le malus actuel.
  rider.eventCurrentPenalty =
    rider.eventNextPenalty || 0;

  rider.eventNextPenalty = 0;
}


/**
 * Termine la consommation des effets d'événement
 * de la manche.
 *
 * IMPORTANT :
 * Le compteur de perte de bonus est décrémenté APRÈS
 * la manche pendant laquelle il a été actif.
 */
function finishEventTurn(rider) {

  if (
    rider.eventNoBonusRounds &&
    rider.eventNoBonusRounds > 0
  ) {

    rider.eventNoBonusRounds--;

  }


  // Le malus actuel ne doit pas rester
  // pour la manche suivante.
  rider.eventCurrentPenalty = 0;
}


// ============================================================
// TEXTE DU DÉ
// ============================================================

export function breakdownText(
  rollInfo
) {

  const bits = [
    `dé ${rollInfo.roll}${rollInfo.rerolled ? ' (relance)' : ''}`
  ];

  bits.push(
    ...engine.rollBonusBits(
      rollInfo
    )
  );


  return (
    `${bits.join(' · ')} = ` +
    `<b>${rollInfo.total}</b> case(s). ` +
    `Cliquez une case en surbrillance.`
  );
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

  const rt = App.runtime;


  // ----------------------------------------------------------
  // 1 — EFFETS DE LA MANCHE PRÉCÉDENTE
  // ----------------------------------------------------------

  prepareEventEffects(
    rider
  );


  // ----------------------------------------------------------
  // 2 — D20 ÉVÉNEMENT
  //
  // Les événements sont activés uniquement lorsque :
  // - l'option événements est activée ;
  // - nous ne sommes pas en CLM ;
  // - TOUS les coureurs ont atteint la colonne 0.
  //
  // C'est volontairement AVANT le dé de déplacement.
  // ----------------------------------------------------------

  const eventsActive =
    !rt.isTimeTrial &&
    App.config?.eventsEnabled &&
    rt.state.riders.every(
      rider => rider.column >= 0
    );

  const eventResult =
    App.config?.eventsEnabled
      ? events.processStartOfTurn(
          rt.state,
          rider,
          $('#log-content')
        )
      : null;

  // ----------------------------------------------------------
  // 2 bis — POP-UP D'ÉVÉNEMENT
  //
  // Si un événement s'est déclenché, le joueur humain doit le voir et
  // cliquer sur OK avant que le tour continue (immobilisation ou dé de
  // déplacement) — la suite du tour est donc dans continueHumanTurn,
  // appelée soit tout de suite (pas d'événement), soit depuis le clic OK.
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // 3 — IMMOBILISATION
  //
  // Problème de chaîne :
  //   immobilisation manche actuelle
  //
  // Chute :
  //   immobilisation manche actuelle
  // ----------------------------------------------------------

  if (
    rider.eventCurrentImmobile
  ) {

    rider.eventCurrentImmobile =
      false;


    ui.appendLog(
      $('#log-content'),

      `<b>${rider.name}</b> ` +
      `est immobilisé pour cette manche ` +
      `et ne se déplace pas.`
    );


    finishEventTurn(
      rider
    );


    rt.orderIdx++;


    setTimeout(
      advanceTurn,
      250
    );


    return;
  }


  // ----------------------------------------------------------
  // 4 — TOUR NORMAL : DÉ DE DÉPLACEMENT
  // ----------------------------------------------------------

  const btn =
    $('#btn-roll-dice');


  btn.style.display =
    'inline-block';

  btn.disabled =
    false;


  $('#die-face').textContent =
    '';

  $('#dice-breakdown').textContent =
    '';


  btn.onclick = () => {

    btn.disabled =
      true;


    const rollInfo =
      engine.computeRoll(
        rt.state,
        rider
      );


    const target =
      engine.resolveTarget(
        rt.state,
        rider,
        rollInfo.total
      );


    ui.animateDice(
      $('#die-face'),
      rollInfo.roll,
      {

        onDone: () => {

          $('#dice-breakdown').innerHTML =
            breakdownText(
              rollInfo
            );


          ui.renderBoard(
            $('#board'),
            rt.state,
            {

              highlightCells:
                target.cells,

              activeCell: {
                column: rider.column,
                lane: rider.lane
              },

              jerseys:
                App.jerseys,

              onCellClick:
                (
                  col,
                  lane
                ) => {

                  const chosen =
                    target.cells.find(
                      c =>
                        c.column === col &&
                        c.lane === lane
                    );


                  const path =
                    chosen
                      ? chosen.path
                      : [
                          {
                            column: col,
                            lane
                          }
                        ];


                  $('#dice-breakdown')
                    .textContent = '';


                  animateRiderAlongPath(
                    rider,
                    path,
                    () => {

                      engine.applyMove(
                        rt.state,
                        rider,
                        col,
                        lane,
                        rollInfo
                      );


                      logMove(
                        rider,
                        rollInfo,
                        target
                      );


                      finishEventTurn(
                        rider
                      );


                      renderRaceBoard(
                        rt.state
                      );

                      renderRosterNow();


                      rt.orderIdx++;


                      setTimeout(
                        advanceTurn,
                        250
                      );
                    }
                  );
                },
            }
          );
        },
      }
    );
  };
}


// ============================================================
// TOUR IA
// ============================================================

export function runAiTurn(rider) {

  const rt =
    App.runtime;


  $('#btn-roll-dice').style.display =
    'none';


  // ----------------------------------------------------------
  // 1 — EFFETS DE LA MANCHE PRÉCÉDENTE
  // ----------------------------------------------------------

  prepareEventEffects(
    rider
  );


  // ----------------------------------------------------------
  // 2 — D20 ÉVÉNEMENT
  // ----------------------------------------------------------

  const eventsActive =
    !rt.isTimeTrial &&
    App.config?.eventsEnabled &&
    rt.state.riders.every(
      rider => rider.column >= 0
    );

if (eventsActive) {

  events.processStartOfTurn(
    rt.state,
    rider,
    $('#log-content')
  );
}


  // ----------------------------------------------------------
  // 3 — IMMOBILISATION
  // ----------------------------------------------------------

  if (
    rider.eventCurrentImmobile
  ) {

    rider.eventCurrentImmobile =
      false;


    ui.appendLog(
      $('#log-content'),

      `<b>${rider.name}</b> ` +
      `est immobilisé pour cette manche ` +
      `et ne se déplace pas.`
    );


    finishEventTurn(
      rider
    );


    rt.orderIdx++;


    setTimeout(
      advanceTurn,
      200
    );


    return;
  }


  // ----------------------------------------------------------
  // 4 — DÉ DE DÉPLACEMENT
  // ----------------------------------------------------------

  const rollInfo =
    engine.computeRoll(
      rt.state,
      rider
    );


  const target =
    engine.resolveTarget(
      rt.state,
      rider,
      rollInfo.total
    );


  ui.animateDice(
    $('#die-face'),
    rollInfo.roll,
    {

      duration: 400,

      onDone: () => {

        const cell =
          aiChooseCell(
            rt.state,
            rider,
            target.cells
          );


        animateRiderAlongPath(
          rider,
          cell.path,
          () => {

            engine.applyMove(
              rt.state,
              rider,
              cell.column,
              cell.lane,
              rollInfo
            );


            logMove(
              rider,
              rollInfo,
              target
            );


            finishEventTurn(
              rider
            );


            renderRaceBoard(
              rt.state
            );

            renderRosterNow();


            rt.orderIdx++;


            setTimeout(
              advanceTurn,
              200
            );
          }
        );
      },
    }
  );
}


// ============================================================
// ANIMATION DU COUREUR
// ============================================================

export function animateRiderAlongPath(
  rider,
  path,
  onDone
) {

  const rt =
    App.runtime;


  if (
    !path ||
    !path.length
  ) {

    onDone();

    return;
  }


  let i = 0;

  const stepDuration =
    220;


  function step() {

    if (
      i >= path.length
    ) {

      onDone();

      return;
    }


    const {
      column,
      lane
    } = path[i];


    const tempRiders =
      rt.state.riders.map(
        r =>
          r.id === rider.id
            ? {
                ...r,
                column,
                lane,
                finished: false
              }
            : r
      );


    ui.renderBoard(
      $('#board'),
      {
        board:
          rt.state.board,

        riders:
          tempRiders,

        finishColumn:
          rt.state.finishColumn
      },
      {

        activeCell: {
          column,
          lane
        },

        autoScroll:
          'edge',

        jerseys:
          App.jerseys,
      }
    );


    i++;

    setTimeout(
      step,
      stepDuration
    );
  }


  step();
}


// ============================================================
// SIMULATION AUTOMATIQUE D'UN COUREUR
// ============================================================

export function resolveRiderAuto(
  rider
) {

  const state =
    App.runtime.state;


  // ----------------------------------------------------------
  // EFFETS DE LA MANCHE PRÉCÉDENTE
  // ----------------------------------------------------------

  prepareEventEffects(
    rider
  );


  // ----------------------------------------------------------
  // D20 ÉVÉNEMENT
  // ----------------------------------------------------------

  const eventsActive =
    !rt.isTimeTrial &&
    App.config?.eventsEnabled &&
    rt.state.riders.every(
      rider => rider.column >= 0
    );

  if (eventsActive) {

    events.processStartOfTurn(
      state,
      rider,
      $('#log-content')
    );
  }


  // ----------------------------------------------------------
  // IMMOBILISATION
  // ----------------------------------------------------------

  if (
    rider.eventCurrentImmobile
  ) {

    rider.eventCurrentImmobile =
      false;


    ui.appendLog(
      $('#log-content'),

      `<b>${rider.name}</b> ` +
      `est immobilisé pour cette manche ` +
      `et ne se déplace pas.`
    );


    finishEventTurn(
      rider
    );


    return;
  }


  // ----------------------------------------------------------
  // DÉPLACEMENT NORMAL
  // ----------------------------------------------------------

  const rollInfo =
    engine.computeRoll(
      state,
      rider
    );


  const target =
    engine.resolveTarget(
      state,
      rider,
      rollInfo.total
    );


  const cell =
    aiChooseCell(
      state,
      rider,
      target.cells
    );


  engine.applyMove(
    state,
    rider,
    cell.column,
    cell.lane,
    rollInfo
  );


  logMove(
    rider,
    rollInfo,
    target
  );


  finishEventTurn(
    rider
  );
}


// ============================================================
// JOURNAL DU DÉPLACEMENT
// ============================================================

export function logMove(
  rider,
  rollInfo,
  target
) {

  const bonusBits =
    engine.rollBonusBits(
      rollInfo
    );


  const bonusStr =
    bonusBits.length
      ? ` (${bonusBits.join(', ')})`
      : '';


  const rerollStr =
    rollInfo.rerolled
      ? ' [relance rouleur]'
      : '';


  const blockedStr =
    target.blocked
      ? ' — bouchon dans le peloton !'
      : '';


  const finishStr =
    rider.finished
      ? ' 🏁 franchit la ligne !'
      : '';


  ui.appendLog(
    $('#log-content'),

    `<b>${rider.name}</b> ` +
    `(${rider.spec.short}) : ` +
    `dé ${rollInfo.roll}` +
    `${rerollStr}` +
    `${bonusStr} → ` +
    `${rollInfo.total} case(s)` +
    `${blockedStr}` +
    `${finishStr}`
  );
}


// ============================================================
// SIMULATION DE LA COURSE
// ============================================================

export function simulateToEnd() {

  const rt =
    App.runtime;


  if (
    !rt ||
    rt.resultsProcessed
  ) {
    return;
  }


  if (rt.isTimeTrial) {

    simulateTimeTrialToEnd(
      rt
    );

    return;
  }


  if (
    engine.allFinished(
      rt.state
    )
  ) {

    finishStage();

    return;
  }


  if (
    rt.order &&
    rt.orderIdx <
    rt.order.length
  ) {

    for (
      let i = rt.orderIdx;
      i < rt.order.length;
      i++
    ) {

      const r =
        rt.order[i];


      if (!r.finished) {

        resolveRiderAuto(
          r
        );
      }
    }


    engine.updateDraftBonuses(
      rt.state
    );


    const finishers =
      rt.state.riders.filter(
        r =>
          r.finished &&
          r.finishRound ===
            rt.state.round
      );


    if (finishers.length) {

      engine.rankFinishersOfRound(
        rt.state,
        finishers
      );
    }
  }


  while (
    !engine.allFinished(
      rt.state
    )
  ) {

    rt.state.round++;


    const order =
      engine.roundOrder(
        rt.state
      );


    order.forEach(
      resolveRiderAuto
    );


    engine.updateDraftBonuses(
      rt.state
    );


    const finishers =
      rt.state.riders.filter(
        r =>
          r.finished &&
          r.finishRound ===
            rt.state.round
      );


    if (finishers.length) {

      engine.rankFinishersOfRound(
        rt.state,
        finishers
      );
    }
  }


  renderRaceBoard(
    rt.state
  );

  renderRosterNow();

  finishStage();
}


// ============================================================
// SIMULATION CLM
// ============================================================

export function simulateTimeTrialToEnd(
  rt
) {

  if (
    engine.allTTFinished(
      rt.state
    )
  ) {

    engine.rankTimeTrialResults(
      rt.state
    );

    finishStage();

    return;
  }


  // Termine la manche en cours.
  if (
    rt.order &&
    rt.orderIdx <
    rt.order.length
  ) {

    for (
      let i = rt.orderIdx;
      i < rt.order.length;
      i++
    ) {

      const r =
        rt.order[i];


      if (!r.finished) {

        resolveRiderAuto(
          r
        );
      }
    }


    engine.updateDraftBonuses(
      rt.state
    );
  }


  while (
    !engine.allTTFinished(
      rt.state
    )
  ) {

    rt.state.round++;


    const interval =
      rt.isTeamTimeTrial
        ? (rt.state.ttStartInterval || 1)
        : 1;


    const due =
      (rt.state.round - 1) %
      interval === 0;


    const pending =
      rt.state.ttPendingStart === true;


    if (
      due ||
      pending
    ) {

      const introduced =
        rt.isTeamTimeTrial
          ? engine.introduceNextTeamTT(
              rt.state
            )
          : engine.introduceNextTTRider(
              rt.state
            );


      rt.state.ttPendingStart =
        !introduced;
    }


    const order =
      engine.ttRoundOrder(
        rt.state
      );


    order.forEach(
      resolveRiderAuto
    );


    engine.updateDraftBonuses(
      rt.state
    );
  }


  engine.rankTimeTrialResults(
    rt.state
  );


  renderRaceBoard(
    rt.state
  );

  renderRosterNow();

  finishStage();
}