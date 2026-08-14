// race-setup.js — mise en place d'une étape (ou d'une course unique) :
// génération/sélection du plateau, création des coureurs au 1er appel,
// grille de départ ou ordre de contre-la-montre, calcul des maillots,
// puis lancement de la boucle de jeu.

import { $ } from './dom.js';
import { generateBoard, createFixedBoard, setStartDepth } from './board.js';
import { TOUR_2026, getTourStage } from './tour2026.js';
import { createRider } from './rider.js';
import * as engine from './engine.js';
import * as ui from './ui.js';
import { App } from './state.js';
import { nav } from './nav.js';
import { renderRaceBoard, renderRosterNow } from './race-render.js';
import { startRound } from './race-loop.js';

export function compareYellow(entryA, entryB) {
  const ya = entryA.yellowPoints || 0;
  const yb = entryB.yellowPoints || 0;
  if (ya !== yb) return ya - yb;
  const ra = entryA.stageRanks || [];
  const rb = entryB.stageRanks || [];
  const n = Math.min(ra.length, rb.length);
  for (let i = 0; i < n; i++) {
    if (ra[i] !== rb[i]) return ra[i] - rb[i];
  }
  return 0;
}

export function computeJerseys() {
  if (App.totalStages <= 1 || App.stageIndex < 1) {
    App.jerseys = null;
    return;
  }
  // Maillot jaune : le plus petit retard cumulé gagne. En cas d'égalité,
  // on compare les classements d'étape un par un pour départager.
  const entries = Array.from(App.gc.entries());
  const sortedYellow = [...entries].sort((a, b) => compareYellow(a[1], b[1]));
  const yellowId = sortedYellow.length ? sortedYellow[0][0] : null;

  // Maillot vert : meilleur total de points, sauf s'il s'agit du même
  // coureur que le maillot jaune — auquel cas il revient au 2e du
  // classement aux points (le jaune prime toujours sur le vert).
  const byPoints = [...entries].sort((a, b) => (b[1].totalPoints || 0) - (a[1].totalPoints || 0));
  let greenId = byPoints.length ? byPoints[0][0] : null;
  if (greenId === yellowId && byPoints.length > 1) {
    greenId = byPoints[1][0];
  }

  App.jerseys = { yellow: yellowId, green: greenId };
}

export function isCurrentStageTT() {

  // Tour de France 2026
  if (App.config.raceCategory === 'tour2026') {
    const stage = getTourStage(App.stageIndex + 1);

    return (
      stage.type === 'time-trial' ||
      stage.type === 'team-time-trial'
    );
  }

  // Fonctionnement actuel
  if (App.config.raceFormat === 'timetrial') {
    return true;
  }

  if (
    App.config.raceFormat === 'stage' &&
    App.config.ttStageNumber > 0
  ) {
    return App.config.ttStageNumber === App.stageIndex + 1;
  }

  return false;
}

export function computeTTStartOrder() {
  const useGC = App.totalStages > 1 && App.stageIndex >= 1;
  if (!useGC) {
    const shuffled = [...App.allRiders];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  return [...App.allRiders].sort((a, b) => compareYellow(App.gc.get(b.id), App.gc.get(a.id)));
}

export function renderTopThreeNow() {
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

export function autoPlaceRiders(board) {
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

export function startStage() {
  const isTT = isCurrentStageTT();
  // Largeur fixée à 3 voies pour un contre-la-montre, quelle que soit la
  // largeur choisie pour les autres étapes.
  

  let board;
  let tourStage = null;

  if (App.config.raceCategory === 'tour2026') {

    tourStage = getTourStage(App.stageIndex + 1);

    board = createFixedBoard(tourStage);

  } else {

    board = generateBoard({
      length: App.config.trackLength,
      width: App.config.trackWidth,
      profile: App.config.terrainProfile,
    });
  }

  if (!App.allRiders) {
    App.allRiders = [];
    App.teams.forEach(team => {
      team.riderObjs = team.riders.map(r => createRider({
        name: r.name, teamId: team.id, teamColor: team.color,
        specKey: r.specKey, isAI: team.isAI,
      }));
      App.allRiders.push(...team.riderObjs);
    });
    App.allRiders.forEach(r => App.gc.set(r.id, { name: r.name, teamColor: r.teamColor, teamId: r.teamId, totalPoints: 0, yellowPoints: 0, stageWins: 0, stageRanks: [] }));
  }

  const stageTitle =
  App.config.raceCategory === 'tour2026'
    ? `Tour de France 2026 — Étape ${tourStage.number}/${TOUR_2026.totalStages}`
    : (
        App.totalStages > 1
          ? `Étape ${App.stageIndex + 1}/${App.totalStages}`
          : 'Course'
      );

  $('#stage-label').textContent =
    stageTitle +
    (isTT ? ' — Contre-la-montre' : '');
  $('#log-content').innerHTML = '';
  $('#btn-sim-race').disabled = false;

  if (isTT) {
    const startOrder = computeTTStartOrder();
    const state = engine.createTimeTrialState(board, App.allRiders, startOrder);
    App.runtime = { state, order: [], orderIdx: 0, isTimeTrial: true };
    computeJerseys();
    const orderNote = (App.totalStages > 1 && App.stageIndex >= 1)
      ? "Ordre de départ : du dernier au premier au classement général au temps (maillot jaune)."
      : 'Ordre de départ tiré au sort.';
    ui.appendLog($('#log-content'), `Contre-la-montre — ${orderNote}`);
    renderRaceBoard(state);
    renderRosterNow();
    renderTopThreeNow();
    nav('screen-race');
    startRound();
    return;
  }

  // Repart d'une grille de départ vierge à chaque étape.
  App.allRiders.forEach(r => { r.column = null; r.lane = null; });
  setStartDepth(board, App.allRiders.length);
  autoPlaceRiders(board);

  const state = engine.createRaceState(board, App.allRiders);
  App.runtime = { state, order: [], orderIdx: 0, isTimeTrial: false };
  computeJerseys();

  ui.appendLog($('#log-content'), `Grille de départ tirée au sort — ${App.allRiders.length} coureurs sur ${board.startDepth} ligne(s).`);
  renderRaceBoard(state);
  renderRosterNow();
  renderTopThreeNow();
  nav('screen-race');
  startRound();
}
