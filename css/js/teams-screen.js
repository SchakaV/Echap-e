// teams-screen.js — composition par défaut des équipes (noms/spés
// aléatoires) et écran de récapitulatif avant le départ.

import { $ } from './dom.js';
import { SPECIALIZATIONS } from './rider.js';
import { randomFirstName } from './names.js';
import * as ui from './ui.js';
import { App } from './state.js';
import { startStage } from './race-setup.js';

export function buildDefaultTeams() {
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

export function bindTeamsScreen() {
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
