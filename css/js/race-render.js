// race-render.js — rendu du plateau et du roster pendant une course en
// cours (mode solo/hotseat/IA). Séparé de la boucle de jeu (race-loop.js)
// et de la mise en place d'étape (race-setup.js) car utilisé par les deux.

import { $ } from './dom.js';
import { getTourStage } from './tour2026.js';
import * as ui from './ui.js';
import * as engine from './engine.js';
import { App } from './state.js';

export function renderRosterNow() {
  const rt = App.runtime;
  const board = rt ? rt.state.board : null;
  if (!board || !App.allRiders) return;
  // En contre-la-montre (individuel ou par équipe), il n'y a ni peloton ni
  // groupe : on garde l'affichage simple habituel. Sinon (course normale),
  // on calcule les groupes de course et on les affiche dans la fenêtre
  // « Peloton », regroupant les coureurs par échappée / poursuivants /
  // peloton / retardataires au fur et à mesure qu'ils se forment.
  let groups = null;
  let showGroups = false;
  if (!rt.isTimeTrial) {
    groups = engine.computeGroups(rt.state);
    showGroups = true;
  }
  ui.renderRoster($('#roster-panel'), App.allRiders, board, App.jerseys, { groups, showGroups });
}

export function renderRaceBoard(viewState, opts = {}) {

  ui.renderBoard($('#board'), viewState, {
    ...opts,
    jerseys: App.jerseys
  });

  if (App.config.raceCategory === 'tour2026') {

    const stage = getTourStage(App.stageIndex + 1);

    let info = document.getElementById('tour-stage-info');

    if (!info) {
      info = document.createElement('div');
      info.id = 'tour-stage-info';
      info.className = 'tour-stage-info';

      const boardWrap = $('#board-wrap');
      boardWrap.parentElement.insertBefore(info, boardWrap);
    }

    info.innerHTML = `
      <strong>${stage.name}</strong>
      <span>${stage.distance} km</span>
    `;
  }
}
