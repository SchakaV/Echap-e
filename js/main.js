// main.js — point d'entrée : câble tous les écrans au chargement de la
// page. Toute la logique vit dans les modules dédiés (nav.js, state.js,
// setup-screen.js, teams-screen.js, race-setup.js, race-loop.js,
// race-render.js, results-screen.js, online.js) ; ce fichier ne fait plus
// qu'orchestrer leur initialisation.

import { bindNav, bindMusicToggle, nav } from './nav.js';
import { bindSetupForm } from './setup-screen.js';
import { bindTeamsScreen } from './teams-screen.js';
import { bindRaceScreen } from './race-loop.js';
import { bindResultsScreen } from './results-screen.js';
import { initOnline } from './online.js';
import { bindSaveLoad } from './save-load.js';

function init() {
  bindNav();
  bindSetupForm();
  bindTeamsScreen();
  bindRaceScreen();
  bindResultsScreen();
  bindMusicToggle();
  initOnline(nav);
  bindSaveLoad(nav);
  nav('screen-home');
}

init();
