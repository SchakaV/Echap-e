// main.js — orchestration de l'application

import { generateBoard, setStartDepth } from './board.js';
import { createRider, SPECIALIZATIONS } from './rider.js';
import * as engine from './engine.js';
import { aiChooseCell } from './ai.js';
import { pointsForRank } from './scoring.js';
import { randomFirstName } from './names.js';
import * as audio from './audio.js';
import * as ui from './ui.js';
import { initOnline } from './online.js';

const $ = sel => document.querySelector(sel);
const $all = sel => Array.from(document.querySelectorAll(sel));

function applyMusicForScreen(id) {
  if (!audio.isEnabled()) return;
  if (id === 'screen-race') audio.playRaceMusic();
  else audio.playMenuMusic();
}

function nav(id) {
  ui.showScreen(id);
  applyMusicForScreen(id);
}

function bindMusicToggle() {
  const cb = $('#music-toggle');
  cb.checked = audio.loadPreference();
  cb.addEventListener('change', () => {
    audio.setEnabled(cb.checked);
    if (cb.checked) {
      const activeScreen = document.querySelector('.screen.active');
      applyMusicForScreen(activeScreen ? activeScreen.id : 'screen-home');
    }
  });
}

const App = {
  config: {
    raceFormat: 'single',
    stageCount: 3,
    terrainProfile: 'random',
    trackLength: 40,
    trackWidth: 3,
    gameMode: 'hotseat',
    humanCount: 2,
    aiCount: 1,
  },
  teams: [],
  allRiders: null,
  stageIndex: 0,
  totalStages: 1,
  gc: new Map(), // riderId -> { name, teamColor, totalPoints }
  jerseys: null, // { yellow: riderId, green: riderId } — dispo à partir de l'étape 2
  runtime: null, // manche en cours
};

/* ============================= NAVIGATION ============================= */

function bindNav() {
  $all('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => nav(btn.dataset.nav));
  });
  $('#btn-go-setup').addEventListener('click', () => nav('screen-race-setup'));
  $('#btn-back-home').addEventListener('click', () => {
    App.stageIndex = 0;
    App.allRiders = null;
    App.gc.clear();
    App.jerseys = null;
    nav('screen-home');
  });
}

/* ============================= ÉCRAN CONFIGURATION ============================= */

function bindSetupForm() {
  const formatSel = $('#race-format');
  const stageCountField = $('#field-stage-count');
  formatSel.addEventListener('change', () => {
    stageCountField.style.display = formatSel.value === 'stage' ? 'flex' : 'none';
  });

  $('#track-length').addEventListener('input', e => { $('#length-val').textContent = e.target.value; });
  $('#track-width').addEventListener('input', e => { $('#width-val').textContent = e.target.value; });
  $('#human-count').addEventListener('input', e => { $('#human-count-val').textContent = e.target.value; });
  $('#ai-count').addEventListener('input', e => { $('#ai-count-val').textContent = e.target.value; });

  const modeSel = $('#game-mode');
  const humanField = $('#field-human-count');
  const aiField = $('#field-ai-count');
  function syncModeFields() {
    const mode = modeSel.value;
    humanField.style.display = (mode === 'hotseat' || mode === 'mixed') ? 'flex' : 'none';
    aiField.style.display = (mode === 'ai' || mode === 'mixed') ? 'flex' : 'none';
    if (mode === 'ai') $('#human-count').value = 1;
  }
  modeSel.addEventListener('change', syncModeFields);
  syncModeFields();

  $('#btn-go-teams').addEventListener('click', () => {
    App.config.raceFormat = formatSel.value;
    App.config.stageCount = parseInt($('#stage-count').value, 10);
    App.config.terrainProfile = $('#terrain-profile').value;
    App.config.trackLength = parseInt($('#track-length').value, 10);
    App.config.trackWidth = parseInt($('#track-width').value, 10);
    App.config.gameMode = modeSel.value;
    App.config.humanCount = App.config.gameMode === 'ai' ? 1 : parseInt($('#human-count').value, 10);
    App.config.aiCount = App.config.gameMode === 'hotseat' ? 0 : parseInt($('#ai-count').value, 10);

    App.totalStages = App.config.raceFormat === 'stage' ? App.config.stageCount : 1;
    buildDefaultTeams();
    ui.renderTeams($('#teams-container'), App.teams);
    ui.renderSpecReference($('#spec-reference-list'), SPECIALIZATIONS);
    nav('screen-teams');
  });
}

function buildDefaultTeams() {
  const teams = [];
  let colorIdx = 0;
  const specKeys = Object.keys(SPECIALIZATIONS);

  function makeTeam(isAI, label) {
    const color = ui.TEAM_COLORS[colorIdx % ui.TEAM_COLORS.length];
    colorIdx++;
    const used = [];
    const riders = [0, 1, 2].map(i => {
      const name = randomFirstName(used);
      used.push(name);
      return { name, specKey: specKeys[i % specKeys.length] };
    });
    return { id: `team-${teams.length + 1}`, name: label, color, isAI, riders };
  }

  for (let i = 0; i < App.config.humanCount; i++) teams.push(makeTeam(false, `Équipe ${i + 1}`));
  for (let i = 0; i < App.config.aiCount; i++) teams.push(makeTeam(true, `Équipe CPU ${i + 1}`));
  App.teams = teams;
}

/* ============================= ÉCRAN ÉQUIPES ============================= */

function bindTeamsScreen() {
  $('#btn-start-race').addEventListener('click', () => {
    const invalid = App.teams.find(t => t.riders.length === 0);
    if (invalid) {
      alert(`L'équipe "${invalid.name}" doit avoir au moins un coureur.`);
      return;
    }
    App.stageIndex = 0;
    App.allRiders = null;
    App.gc.clear();
    App.jerseys = null;
    startStage();
  });
}

/* ============================= CRÉATION D'ÉTAPE ============================= */

function startStage() {
  const board = generateBoard({
    length: App.config.trackLength,
    width: App.config.trackWidth,
    profile: App.config.terrainProfile,
  });

  if (!App.allRiders) {
    App.allRiders = [];
    App.teams.forEach(team => {
      team.riderObjs = team.riders.map(r => createRider({
        name: r.name, teamId: team.id, teamColor: team.color,
        specKey: r.specKey, isAI: team.isAI,
      }));
      App.allRiders.push(...team.riderObjs);
    });
    App.allRiders.forEach(r => App.gc.set(r.id, { name: r.name, teamColor: r.teamColor, teamId: r.teamId, totalPoints: 0, yellowPoints: 0 }));
  }

  // Repart d'une grille de départ vierge à chaque étape.
  App.allRiders.forEach(r => { r.column = null; r.lane = null; });
  setStartDepth(board, App.allRiders.length);
  autoPlaceRiders(board);

  const state = engine.createRaceState(board, App.allRiders);
  App.runtime = { state, order: [], orderIdx: 0 };
  computeJerseys();

  $('#stage-label').textContent = App.totalStages > 1
    ? `Étape ${App.stageIndex + 1}/${App.totalStages}`
    : 'Course';
  $('#log-content').innerHTML = '';
  $('#btn-sim-race').disabled = false;
  ui.appendLog($('#log-content'), `Grille de départ tirée au sort — ${App.allRiders.length} coureurs sur ${board.startDepth} ligne(s).`);
  renderRaceBoard(state);
  renderRosterNow();
  renderTopThreeNow();
  nav('screen-race');
  startRound();
}

function renderTopThreeNow() {
  const wrap = $('#top3-panel-wrap');
  const yellowWrap = $('#top3-yellow-panel-wrap');
  if (App.totalStages <= 1) {
    wrap.style.display = 'none';
    yellowWrap.style.display = 'none';
    return;
  }
  wrap.style.display = 'block';
  yellowWrap.style.display = 'block';
  const entries = App.stageIndex >= 1 ? Array.from(App.gc.values()) : [];
  ui.renderTopThree($('#top3-panel'), entries);
  ui.renderTopThreeYellow($('#top3-yellow-panel'), entries);
}

/**
 * Place tous les coureurs au hasard sur la grille de départ, en remplissant
 * les lignes dans l'ordre (toute une ligne — une position de profondeur,
 * sur toute la largeur — avant de passer à la suivante), afin que le tirage
 * reste équitable et que la grille garde une forme compacte et lisible.
 */
function autoPlaceRiders(board) {
  const shuffled = [...App.allRiders];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  let idx = 0;
  for (let c = -board.startDepth; c < 0 && idx < shuffled.length; c++) {
    for (let l = 0; l < board.width && idx < shuffled.length; l++) {
      shuffled[idx].column = c;
      shuffled[idx].lane = l;
      idx++;
    }
  }
}

/* ============================= BOUCLE DE COURSE ============================= */

function setTurnPanel(color, text) {
  $('#turn-swatch').style.background = color;
  $('#turn-text').textContent = text;
}

function bindRaceScreen() {
  $('#btn-sim-race').addEventListener('click', simulateToEnd);
  $('#btn-toggle-rules').addEventListener('click', () => {
    $('#rules-panel').classList.toggle('hidden');
  });
  ui.renderSpecReference($('#race-spec-reference'), SPECIALIZATIONS);
}

function renderRosterNow() {
  const board = App.runtime ? App.runtime.state.board : null;
  if (!board || !App.allRiders) return;
  ui.renderRoster($('#roster-panel'), App.allRiders, board, App.jerseys);
}

function renderRaceBoard(viewState, opts = {}) {
  ui.renderBoard($('#board'), viewState, { ...opts, jerseys: App.jerseys });
}

/** Détermine qui détient chaque maillot à partir du classement général cumulé
 *  (disponible seulement à partir de la 2e étape d'une course par étapes). */
function computeJerseys() {
  if (App.totalStages <= 1 || App.stageIndex < 1) {
    App.jerseys = null;
    return;
  }
  let yellowId = null;
  let bestYellow = Infinity;
  App.gc.forEach((entry, id) => {
    if ((entry.yellowPoints || 0) < bestYellow) { bestYellow = entry.yellowPoints || 0; yellowId = id; }
  });

  // Maillot vert : meilleur total de points, sauf s'il s'agit du même
  // coureur que le maillot jaune — auquel cas il revient au 2e du
  // classement aux points.
  const byPoints = Array.from(App.gc.entries()).sort((a, b) => (b[1].totalPoints || 0) - (a[1].totalPoints || 0));
  let greenId = byPoints.length ? byPoints[0][0] : null;
  if (greenId === yellowId && byPoints.length > 1) {
    greenId = byPoints[1][0];
  }

  App.jerseys = { yellow: yellowId, green: greenId };
}

function teamOf(rider) {
  return App.teams.find(t => t.id === rider.teamId);
}

function startRound() {
  const rt = App.runtime;
  rt.state.round++;
  rt.order = engine.roundOrder(rt.state);
  rt.orderIdx = 0;
  advanceTurn();
}

function endRoundAndContinue() {
  const rt = App.runtime;
  engine.updateDraftBonuses(rt.state);
  const finishers = rt.state.riders.filter(r => r.finished && r.finishRound === rt.state.round);
  if (finishers.length) engine.rankFinishersOfRound(rt.state, finishers);
  renderRaceBoard(rt.state);
  renderRosterNow();

  if (engine.allFinished(rt.state)) {
    finishStage();
    return;
  }
  ui.showToast(`Manche ${rt.state.round} terminée — tout le monde a joué`);
  ui.appendLog($('#log-content'), `<b>— Fin de la manche ${rt.state.round} —</b>`);
  setTimeout(startRound, 400);
}

function advanceTurn() {
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

function breakdownText(rollInfo) {
  const bits = [`dé ${rollInfo.roll}${rollInfo.rerolled ? ' (relance)' : ''}`];
  if (rollInfo.terrainBonus) bits.push(`terrain ${rollInfo.terrainBonus > 0 ? '+' : ''}${rollInfo.terrainBonus}`);
  if (rollInfo.sprintBonus) bits.push(`sprint +${rollInfo.sprintBonus}`);
  if (rollInfo.inBreakaway) bits.push(`échappée +${rollInfo.breakawayBonus}`);
  if (rollInfo.draftBonus) bits.push(`aspiration +${rollInfo.draftBonus}`);
  return `${bits.join(' · ')} = <b>${rollInfo.total}</b> case(s). Cliquez une case en surbrillance.`;
}

function startHumanTurn(rider) {
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

function runAiTurn(rider) {
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

/**
 * Anime visuellement le coureur en train de parcourir, case par case, le
 * chemin choisi (tout droit / diagonale) — sans toucher à l'état du moteur,
 * qui n'est appliqué qu'une fois l'animation terminée via onDone().
 */
function animateRiderAlongPath(rider, path, onDone) {
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

function resolveRiderAuto(rider) {
  const state = App.runtime.state;
  const rollInfo = engine.computeRoll(state, rider);
  const target = engine.resolveTarget(state, rider, rollInfo.total);
  const cell = aiChooseCell(state, rider, target.cells);
  engine.applyMove(state, rider, cell.column, cell.lane, rollInfo);
  logMove(rider, rollInfo, target);
}

function logMove(rider, rollInfo, target) {
  const bonusBits = [];
  if (rollInfo.terrainBonus) bonusBits.push(`terrain ${rollInfo.terrainBonus > 0 ? '+' : ''}${rollInfo.terrainBonus}`);
  if (rollInfo.sprintBonus) bonusBits.push(`sprint +${rollInfo.sprintBonus}`);
  if (rollInfo.inBreakaway) bonusBits.push(`échappée +${rollInfo.breakawayBonus}`);
  if (rollInfo.draftBonus) bonusBits.push(`aspiration +${rollInfo.draftBonus}`);
  const bonusStr = bonusBits.length ? ` (${bonusBits.join(', ')})` : '';
  const rerollStr = rollInfo.rerolled ? ' [relance rouleur]' : '';
  const blockedStr = target.blocked ? ' — bouchon dans le peloton !' : '';
  const finishStr = rider.finished ? ' 🏁 franchit la ligne !' : '';

  ui.appendLog($('#log-content'),
    `<b>${rider.name}</b> (${rider.spec.short}) : dé ${rollInfo.roll}${rerollStr}${bonusStr} → ${rollInfo.total} case(s)${blockedStr}${finishStr}`
  );
}

function simulateToEnd() {
  const rt = App.runtime;
  if (!rt) return;

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

/* ============================= RÉSULTATS ============================= */

function finishStage() {
  const state = App.runtime.state;

  const winner = state.riders.find(r => r.finishRank === 1);
  const winnerRound = winner ? winner.finishRound : state.round;

  const pointsByRiderId = new Map();
  state.riders.forEach(r => {
    const pts = pointsForRank(r.finishRank, state.board.profile);
    pointsByRiderId.set(r.id, pts);
    const gc = App.gc.get(r.id);
    gc.totalPoints += pts;
    gc.yellowPoints = (gc.yellowPoints || 0) + (r.finishRound - winnerRound);
  });

  // Remet le compteur à plat : le porteur du maillot jaune (celui qui a le
  // moins de retard cumulé) doit toujours afficher 0 — les autres, un écart
  // par rapport à LUI (comme au classement général réel), pas par rapport
  // au vainqueur du jour.
  let minYellow = Infinity;
  App.gc.forEach(entry => { if ((entry.yellowPoints || 0) < minYellow) minYellow = entry.yellowPoints || 0; });
  if (minYellow !== Infinity && minYellow !== 0) {
    App.gc.forEach(entry => { entry.yellowPoints = (entry.yellowPoints || 0) - minYellow; });
  }

  const isStageRace = App.totalStages > 1;
  $('#results-title').textContent = isStageRace
    ? `Résultats — Étape ${App.stageIndex + 1}/${App.totalStages}`
    : 'Résultats de la course';

  // Classement par équipe selon la méthode du maillot jaune (somme des
  // retards cumulés de tous les coureurs de l'équipe — le plus petit total
  // gagne), plutôt qu'aux points.
  const teamPoints = new Map(); // teamId -> { name, color, yellowPoints }
  App.gc.forEach(entry => {
    const team = App.teams.find(t => t.id === entry.teamId);
    if (!team) return;
    if (!teamPoints.has(team.id)) teamPoints.set(team.id, { name: team.name, color: team.color, yellowPoints: 0 });
    teamPoints.get(team.id).yellowPoints += (entry.yellowPoints || 0);
  });

  ui.renderStageResults($('#results-content'), state, {
    isStageRace,
    gc: isStageRace ? Array.from(App.gc.values()) : null,
    pointsByRiderId,
    teamStandings: Array.from(teamPoints.values()),
  });

  const nextBtn = $('#btn-next-stage');
  const isLastStage = App.stageIndex >= App.totalStages - 1;
  nextBtn.style.display = isLastStage ? 'none' : 'inline-block';

  nav('screen-results');
}

function bindResultsScreen() {
  $('#btn-next-stage').addEventListener('click', () => {
    App.stageIndex++;
    startStage();
  });
}

/* ============================= INIT ============================= */

function init() {
  bindNav();
  bindSetupForm();
  bindTeamsScreen();
  bindRaceScreen();
  bindResultsScreen();
  bindMusicToggle();
  initOnline(nav);
  nav('screen-home');
}

init();
