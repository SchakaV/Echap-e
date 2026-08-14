// results-screen.js — écran de résultats d'étape/course : calcul des
// points, mise à jour du classement général et des maillots, puis
// affichage. bindResultsScreen() gère le passage à l'étape suivante.

import { $ } from './dom.js';
import * as engine from './engine.js';
import { pointsForRank } from './scoring.js';
import * as ui from './ui.js';
import { App } from './state.js';
import { nav } from './nav.js';
import { startStage } from './race-setup.js';

export function finishStage() {
  const rt = App.runtime;
  if (!rt || rt.resultsProcessed) return; // évite un double comptage des points (ex: double-clic sur "Simuler")
  rt.resultsProcessed = true;
  $('#btn-sim-race').disabled = true;

  const state = rt.state;

  const winner = state.riders.find(r => r.finishRank === 1);
  // En contre-la-montre, les coureurs ne partent pas tous à la même manche :
  // l'écart doit se calculer sur leur temps personnel (nombre de manches
  // réellement courues), pas sur le numéro de manche d'arrivée brut.
  const timeOf = r => (rt.isTimeTrial ? engine.personalRounds(r) : r.finishRound);
  const winnerTime = winner ? timeOf(winner) : state.round;

  const pointsByRiderId = new Map();
  state.riders.forEach(r => {
    const pts = pointsForRank(r.finishRank, state.board.profile);
    pointsByRiderId.set(r.id, pts);
    const gc = App.gc.get(r.id);
    gc.totalPoints += pts;
    gc.yellowPoints = (gc.yellowPoints || 0) + (timeOf(r) - winnerTime);
    if (r.finishRank === 1) gc.stageWins = (gc.stageWins || 0) + 1;
    if (!gc.stageRanks) gc.stageRanks = [];
    gc.stageRanks.push(r.finishRank);
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
  $('#results-title').textContent = (isStageRace
    ? `Résultats — Étape ${App.stageIndex + 1}/${App.totalStages}`
    : 'Résultats de la course') + (rt.isTimeTrial ? ' (contre-la-montre)' : '');

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
  // Même principe d'affichage que le maillot jaune individuel : l'équipe en
  // tête doit toujours afficher 0, les autres un écart par rapport à elle.
  let minTeamYellow = Infinity;
  teamPoints.forEach(t => { if (t.yellowPoints < minTeamYellow) minTeamYellow = t.yellowPoints; });
  if (minTeamYellow !== Infinity && minTeamYellow !== 0) {
    teamPoints.forEach(t => { t.yellowPoints -= minTeamYellow; });
  }

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

export function bindResultsScreen() {
  $('#btn-next-stage').addEventListener('click', () => {
    App.stageIndex++;
    startStage();
  });
}
