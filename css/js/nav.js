// nav.js — navigation entre écrans, musique d'ambiance associée, et
// câblage des boutons de navigation génériques (data-nav, retour à l'accueil).

import { $, $all } from './dom.js';
import * as audio from './audio.js';
import * as ui from './ui.js';
import { App } from './state.js';

export function applyMusicForScreen(id) {
  if (!audio.isEnabled()) return;
  if (id === 'screen-race') audio.playRaceMusic();
  else audio.playMenuMusic();
}

export function nav(id) {
  ui.showScreen(id);
  applyMusicForScreen(id);
}

export function bindMusicToggle() {
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

/** Remet l'application à zéro et revient à l'écran d'accueil. Utilisé
 *  par le bouton de résultats et par celui de l'écran de course. */
export function goHome() {
  App.stageIndex = 0;
  App.allRiders = null;
  App.gc.clear();
  App.jerseys = null;
  App.runtime = null;
  nav('screen-home');
}

export function bindNav() {
  $all('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => nav(btn.dataset.nav));
  });
  $('#btn-go-setup').addEventListener('click', () => nav('screen-race-setup'));
  $('#btn-back-home').addEventListener('click', goHome);
  const raceHome = $('#btn-race-home');
  if (raceHome) raceHome.addEventListener('click', goHome);
}
