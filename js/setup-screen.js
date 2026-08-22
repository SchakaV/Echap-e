// setup-screen.js — écran de configuration de la course (catégorie,
// format, plateau, mode de jeu) et transition vers la composition des
// équipes.

import { $ } from './dom.js';
import { SPECIALIZATIONS } from './rider.js';
import * as ui from './ui.js';
import { App } from './state.js';
import { nav } from './nav.js';
import { buildDefaultTeams } from './teams-screen.js';

export function bindSetupForm() {
  const categorySel = $('#race-category');
  const formatSel = $('#race-format');

  const raceFormatField = $('#field-race-format');
  const stageCountField = $('#field-stage-count');
  const ttStageField = $('#field-tt-stage');
  const ttStageSelect = $('#tt-stage-select');
  const widthInput = $('#track-width');
  const lengthInput = $('#track-length');
  const terrainProfileInput = $('#terrain-profile');

  /* ----------------------------------------------------------
   * Nombre d'étapes et sélecteur « CLM à l'étape »
   * ---------------------------------------------------------- */

  function rebuildTTStageOptions() {
    const count = parseInt($('#stage-count').value, 10) || 2;
    const current = ttStageSelect.value;

    ttStageSelect.innerHTML =
      '<option value="0">Aucun</option>' +
      Array.from({ length: count }, (_, i) => `<option value="${i + 1}">Étape ${i + 1}</option>`).join('');

    if (Array.from(ttStageSelect.options).some(o => o.value === current)) {
      ttStageSelect.value = current;
    }
  }

  /* ----------------------------------------------------------
   * Champs affichés selon le type d'épreuve classique
   * ---------------------------------------------------------- */

  function syncFormatFields() {
    const isStage = formatSel.value === 'stage';
    const isTimeTrial = formatSel.value === 'timetrial' || formatSel.value === 'team-timetrial';

    stageCountField.style.display = isStage ? 'flex' : 'none';
    ttStageField.style.display = isStage ? 'flex' : 'none';

    if (isStage) rebuildTTStageOptions();

    if (isTimeTrial) {
      // Largeur fixée à 3 voies pour un contre-la-montre.
      widthInput.value = 3;
      widthInput.disabled = true;
      $('#width-val').textContent = 3;
    } else {
      widthInput.disabled = false;
    }
  }

  /* ----------------------------------------------------------
   * Catégorie de course (classique / Tour de France 2026)
   * ---------------------------------------------------------- */

  function syncRaceCategory() {
    const isTour = categorySel.value === 'tour2026';
    const twoDiceField = document.getElementById('two-dice-field');
    const twoDiceCheckbox = document.getElementById('two-dice-checkbox');

    if (isTour) {
      // Le Tour possède toujours 21 étapes.
      $('#stage-count').value = 21;

      // Les paramètres du parcours sont définis dans tour2026.js.
      lengthInput.disabled = true;
      widthInput.disabled = true;
      terrainProfileInput.disabled = true;

      // Les paramètres généraux de course ne sont pas nécessaires pour le Tour.
      raceFormatField.style.display = 'none';
      stageCountField.style.display = 'none';
      ttStageField.style.display = 'none';

      // Afficher l'option des 2 dés spécifiquement pour le Tour de France.
      twoDiceField.style.display = 'block';

      // Valeurs purement indicatives dans l'interface.
      $('#length-val').textContent = 'Automatique';
      $('#width-val').textContent = 'Automatique';
    } else {
      // Retour au fonctionnement normal.
      raceFormatField.style.display = 'flex';

      // Masquer l'option des 2 dés et la décocher par sécurité.
      twoDiceField.style.display = 'none';
      twoDiceCheckbox.checked = false;

      lengthInput.disabled = false;
      widthInput.disabled = false;
      terrainProfileInput.disabled = false;

      syncFormatFields();
    }
  }

  /* ----------------------------------------------------------
   * Mode de jeu (hotseat / IA / mixte)
   * ---------------------------------------------------------- */

  function syncModeFields() {
    const mode = modeSel.value;

    humanField.style.display = (mode === 'hotseat' || mode === 'mixed') ? 'flex' : 'none';
    aiField.style.display = (mode === 'ai' || mode === 'mixed') ? 'flex' : 'none';

    if (mode === 'ai') {
      $('#human-count').value = 1;
    }
  }

  /* ----------------------------------------------------------
   * Écouteurs
   * ---------------------------------------------------------- */

  categorySel.addEventListener('change', syncRaceCategory);
  formatSel.addEventListener('change', syncFormatFields);
  $('#stage-count').addEventListener('input', rebuildTTStageOptions);

  $('#track-length').addEventListener('input', e => {
    $('#length-val').textContent = e.target.value;
  });
  $('#track-width').addEventListener('input', e => {
    $('#width-val').textContent = e.target.value;
  });
  $('#human-count').addEventListener('input', e => {
    $('#human-count-val').textContent = e.target.value;
  });
  $('#ai-count').addEventListener('input', e => {
    $('#ai-count-val').textContent = e.target.value;
  });

  const modeSel = $('#game-mode');
  const humanField = $('#field-human-count');
  const aiField = $('#field-ai-count');

  modeSel.addEventListener('change', syncModeFields);

  /* ----------------------------------------------------------
   * Initialisation des champs
   * ---------------------------------------------------------- */

  syncFormatFields();
  syncRaceCategory();
  syncModeFields();

  /* ----------------------------------------------------------
   * Bouton « Composer les équipes »
   * ---------------------------------------------------------- */

  $('#btn-go-teams').addEventListener('click', () => {
    // Catégorie de course.
    App.config.raceCategory = categorySel.value;

    if (App.config.raceCategory === 'tour2026') {
      // Le Tour possède toujours 21 étapes ; le reste du parcours est
      // déterminé automatiquement par tour2026.js pour chaque étape.
      App.config.raceFormat = 'tour';
      App.config.stageCount = 21;
      App.config.ttStageNumber = 0;
      App.config.terrainProfile = 'fixed';
      App.config.trackLength = 0;
      App.config.trackWidth = 0;
      App.totalStages = 21;
    } else {
      // Course classique.
      App.config.raceFormat = formatSel.value;
      App.config.stageCount = parseInt($('#stage-count').value, 10);
      App.config.ttStageNumber =
        formatSel.value === 'stage' ? parseInt(ttStageSelect.value, 10) : 0;
      App.config.terrainProfile = $('#terrain-profile').value;
      App.config.trackLength = parseInt($('#track-length').value, 10);
      App.config.trackWidth = parseInt($('#track-width').value, 10);
      App.totalStages = App.config.raceFormat === 'stage' ? App.config.stageCount : 1;
    }

    // Mode de jeu.
    App.config.gameMode = modeSel.value;
    App.config.humanCount =
      App.config.gameMode === 'ai' ? 1 : parseInt($('#human-count').value, 10);
    App.config.aiCount =
      App.config.gameMode === 'hotseat' ? 0 : parseInt($('#ai-count').value, 10);

    // Événements.
    App.config.eventsEnabled = $('#enable-events').checked;

    // Mode « Grand Tour Rapide » (2 dés). Le champ n'est visible (et
    // cochable) que pour le Tour de France 2026 ; syncRaceCategory() le
    // décoche déjà par sécurité pour les autres catégories, on peut donc
    // lire sa valeur sans condition ici.
    App.config.twoDice = $('#two-dice-checkbox').checked;

    // Équipes.
    buildDefaultTeams();
    ui.renderTeams($('#teams-container'), App.teams);
    ui.renderSpecReference($('#spec-reference-list'), SPECIALIZATIONS);

    nav('screen-teams');
  });
}
