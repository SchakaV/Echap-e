// race-loop.js — boucle de jeu tour par tour d'une étape (mode
// solo/hotseat/IA) : ordre de passage, tour humain (dé + choix de case),
// tour IA, animation de déplacement, simulation jusqu'à l'arrivée.

import { $ } from './dom.js';
import * as engine from './engine.js';
import { aiChooseCell } from './ai.js';
import { SPECIALIZATIONS } from './rider.js';
import * as ui from './ui.js';
import { App } from './state.js';
import { renderRaceBoard, renderRosterNow } from './race-render.js';
import { finishStage } from './results-screen.js';

export function setTurnPanel(color, text) {
  $('#turn-swatch').style.background = color;
  $('#turn-text').textContent = text;
}

export function bindRaceScreen() {
  $('#btn-sim-race').addEventListener('click', simulateToEnd);
  $('#btn-toggle-rules').addEventListener('click', () => {
    $('#rules-panel').classList.toggle('hidden');
  });
  ui.renderSpecReference($('#race-spec-reference'), SPECIALIZATIONS);
}

export function teamOf(rider) {
  return App.teams.find(t => t.id === rider.teamId);
}

export function startRound() {
  const rt = App.runtime;
  rt.state.round++;
  if (rt.isTimeTrial) {
    const introduced = engine.introduceNextTTRider(rt.state);
    if (introduced) {
      ui.appendLog($('#log-content'), `<b>${introduced.name}</b> s'élance !`);
      renderRosterNow();
    }
    rt.order = engine.ttRoundOrder(rt.state);
  } else {
    rt.order = engine.roundOrder(rt.state);
  }
  rt.orderIdx = 0;
  advanceTurn();
}

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

export function advanceTurn() {
  const rt = App.runtime;
  if (!rt) return;

  if (rt.orderIdx >= rt.order.length) {
    endRoundAndContinue();
    return;
  }

  const rider = rt.order[rt.orderIdx];
  if (rider.finished) { rt.orderIdx++; advanceTurn(); return; }

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

export function breakdownText(rollInfo) {
  const bits = [`dé ${rollInfo.roll}${rollInfo.rerolled ? ' (relance)' : ''}`];
  if (rollInfo.terrainBonus) bits.push(`terrain ${rollInfo.terrainBonus > 0 ? '+' : ''}${rollInfo.terrainBonus}`);
  if (rollInfo.sprintBonus) bits.push(`sprint +${rollInfo.sprintBonus}`);
  if (rollInfo.inBreakaway) bits.push(`échappée +${rollInfo.breakawayBonus}`);
  if (rollInfo.draftBonus) bits.push(`aspiration +${rollInfo.draftBonus}`);
  if (rollInfo.windBonus) bits.push(`protection du vent +${rollInfo.windBonus}`);
  return `${bits.join(' · ')} = <b>${rollInfo.total}</b> case(s). Cliquez une case en surbrillance.`;
}

export function startHumanTurn(rider) {
  const rt = App.runtime;
  const btn = $('#btn-roll-dice');
  btn.style.display = 'inline-block';
  btn.disabled = false;
  $('#die-face').textContent = '';
  $('#dice-breakdown').textContent = '';

  btn.onclick = () => {
    btn.disabled = true;
    const rollInfo = engine.computeRoll(rt.state, rider);
    const target = engine.resolveTarget(rt.state, rider, rollInfo.total);

    ui.animateDice($('#die-face'), rollInfo.roll, {
      onDone: () => {
        $('#dice-breakdown').innerHTML = breakdownText(rollInfo);
        ui.renderBoard($('#board'), rt.state, {
          highlightCells: target.cells,
          activeCell: { column: rider.column, lane: rider.lane },
          jerseys: App.jerseys,
          onCellClick: (col, lane) => {
            const chosen = target.cells.find(c => c.column === col && c.lane === lane);
            const path = chosen ? chosen.path : [{ column: col, lane }];
            $('#dice-breakdown').textContent = '';
            animateRiderAlongPath(rider, path, () => {
              engine.applyMove(rt.state, rider, col, lane, rollInfo);
              logMove(rider, rollInfo, target);
              renderRaceBoard(rt.state);
              renderRosterNow();
              rt.orderIdx++;
              setTimeout(advanceTurn, 250);
            });
          },
        });
      },
    });
  };
}

export function runAiTurn(rider) {
  const rt = App.runtime;
  $('#btn-roll-dice').style.display = 'none';
  const rollInfo = engine.computeRoll(rt.state, rider);
  const target = engine.resolveTarget(rt.state, rider, rollInfo.total);

  ui.animateDice($('#die-face'), rollInfo.roll, {
    duration: 400,
    onDone: () => {
      const cell = aiChooseCell(rt.state, rider, target.cells);
      animateRiderAlongPath(rider, cell.path, () => {
        engine.applyMove(rt.state, rider, cell.column, cell.lane, rollInfo);
        logMove(rider, rollInfo, target);
        renderRaceBoard(rt.state);
        renderRosterNow();
        rt.orderIdx++;
        setTimeout(advanceTurn, 200);
      });
    },
  });
}

export function animateRiderAlongPath(rider, path, onDone) {
  const rt = App.runtime;
  if (!path || !path.length) { onDone(); return; }
  let i = 0;
  const stepDuration = 220;

  function step() {
    if (i >= path.length) { onDone(); return; }
    const { column, lane } = path[i];
    const tempRiders = rt.state.riders.map(r => (r.id === rider.id ? { ...r, column, lane, finished: false } : r));
    ui.renderBoard($('#board'), { board: rt.state.board, riders: tempRiders, finishColumn: rt.state.finishColumn }, {
      activeCell: { column, lane },
      autoScroll: 'edge',
      jerseys: App.jerseys,
    });
    i++;
    setTimeout(step, stepDuration);
  }
  step();
}

export function resolveRiderAuto(rider) {
  const state = App.runtime.state;
  const rollInfo = engine.computeRoll(state, rider);
  const target = engine.resolveTarget(state, rider, rollInfo.total);
  const cell = aiChooseCell(state, rider, target.cells);
  engine.applyMove(state, rider, cell.column, cell.lane, rollInfo);
  logMove(rider, rollInfo, target);
}

export function logMove(rider, rollInfo, target) {
  const bonusBits = [];
  if (rollInfo.terrainBonus) bonusBits.push(`terrain ${rollInfo.terrainBonus > 0 ? '+' : ''}${rollInfo.terrainBonus}`);
  if (rollInfo.sprintBonus) bonusBits.push(`sprint +${rollInfo.sprintBonus}`);
  if (rollInfo.inBreakaway) bonusBits.push(`échappée +${rollInfo.breakawayBonus}`);
  if (rollInfo.draftBonus) bonusBits.push(`aspiration +${rollInfo.draftBonus}`);
  if (rollInfo.windBonus) bonusBits.push(`protection du vent +${rollInfo.windBonus}`);
  const bonusStr = bonusBits.length ? ` (${bonusBits.join(', ')})` : '';
  const rerollStr = rollInfo.rerolled ? ' [relance rouleur]' : '';
  const blockedStr = target.blocked ? ' — bouchon dans le peloton !' : '';
  const finishStr = rider.finished ? ' 🏁 franchit la ligne !' : '';

  ui.appendLog($('#log-content'),
    `<b>${rider.name}</b> (${rider.spec.short}) : dé ${rollInfo.roll}${rerollStr}${bonusStr} → ${rollInfo.total} case(s)${blockedStr}${finishStr}`
  );
}

export function simulateToEnd() {
  const rt = App.runtime;
  if (!rt || rt.resultsProcessed) return;

  if (rt.isTimeTrial) {
    simulateTimeTrialToEnd(rt);
    return;
  }

  if (engine.allFinished(rt.state)) { finishStage(); return; }

  if (rt.order && rt.orderIdx < rt.order.length) {
    for (let i = rt.orderIdx; i < rt.order.length; i++) {
      const r = rt.order[i];
      if (!r.finished) resolveRiderAuto(r);
    }
    engine.updateDraftBonuses(rt.state);
    const finishers = rt.state.riders.filter(r => r.finished && r.finishRound === rt.state.round);
    if (finishers.length) engine.rankFinishersOfRound(rt.state, finishers);
  }

  while (!engine.allFinished(rt.state)) {
    rt.state.round++;
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

export function simulateTimeTrialToEnd(rt) {
  if (engine.allTTFinished(rt.state)) { engine.rankTimeTrialResults(rt.state); finishStage(); return; }

  // Termine la manche en cours (coureurs déjà partis, restants dans la file).
  if (rt.order && rt.orderIdx < rt.order.length) {
    for (let i = rt.orderIdx; i < rt.order.length; i++) {
      const r = rt.order[i];
      if (!r.finished) resolveRiderAuto(r);
    }
    engine.updateDraftBonuses(rt.state);
  }

  while (!engine.allTTFinished(rt.state)) {
    rt.state.round++;
    engine.introduceNextTTRider(rt.state);
    const order = engine.ttRoundOrder(rt.state);
    order.forEach(resolveRiderAuto);
    engine.updateDraftBonuses(rt.state);
  }

  engine.rankTimeTrialResults(rt.state);
  renderRaceBoard(rt.state);
  renderRosterNow();
  finishStage();
}
