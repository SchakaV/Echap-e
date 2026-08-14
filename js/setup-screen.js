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

  function rebuildTTStageOptions() {
    const count = parseInt($('#stage-count').value, 10) || 2;
    const current = ttStageSelect.value;

    ttStageSelect.innerHTML =
      '<option value="0">Aucun</option>' +
      Array.from(
        { length: count },
        (_, i) => `<option value="${i + 1}">Étape ${i + 1}</option>`
      ).join('');

    if (
      Array.from(ttStageSelect.options)
        .some(o => o.value === current)
    ) {
      ttStageSelect.value = current;
    }
  }

  /*
   * Gestion des champs selon le type d'épreuve classique.
   */
  function syncFormatFields() {

    const isStage = formatSel.value === 'stage';
    const isTimeTrial = formatSel.value === 'timetrial';

    stageCountField.style.display = isStage ? 'flex' : 'none';
    ttStageField.style.display = isStage ? 'flex' : 'none';

    if (isStage) {
      rebuildTTStageOptions();
    }

    if (isTimeTrial) {

      // Largeur fixée à 3 voies pour un contre-la-montre.
      widthInput.value = 3;
      widthInput.disabled = true;

      $('#width-val').textContent = 3;

    } else {

      widthInput.disabled = false;
    }
  }

  /*
   * Gestion de la catégorie de course.
   *
   * Pour le Tour de France 2026 :
   * - le nombre d'étapes est fixé à 21 ;
   * - la longueur est imposée par chaque étape ;
   * - la largeur est imposée par chaque plateau ;
   * - le terrain est imposé par le parcours réel ;
   * - le type d'épreuve est également imposé par l'étape.
   */
  function syncRaceCategory() {

    const isTour = categorySel.value === 'tour2026';

    if (isTour) {

      // Le Tour possède toujours 21 étapes.
      $('#stage-count').value = 21;

      // Les paramètres du parcours sont définis dans tour2026.js.
      lengthInput.disabled = true;
      widthInput.disabled = true;
      terrainProfileInput.disabled = true;

      // Les paramètres généraux de course ne sont pas nécessaires
      // pour le Tour.
      raceFormatField.style.display = 'none';
      stageCountField.style.display = 'none';
      ttStageField.style.display = 'none';

      // Valeurs purement indicatives dans l'interface.
      $('#length-val').textContent = 'Automatique';
      $('#width-val').textContent = 'Automatique';

    } else {

      // Retour au fonctionnement normal.
      raceFormatField.style.display = 'flex';

      lengthInput.disabled = false;
      widthInput.disabled = false;
      terrainProfileInput.disabled = false;

      syncFormatFields();
    }
  }

  /*
   * Changement de catégorie.
   */
  categorySel.addEventListener('change', syncRaceCategory);

  /*
   * Changement du format classique.
   */
  formatSel.addEventListener('change', syncFormatFields);

  /*
   * Nombre d'étapes pour une course classique.
   */
  $('#stage-count').addEventListener(
    'input',
    rebuildTTStageOptions
  );

  /*
   * Initialisation des champs.
   */
  syncFormatFields();
  syncRaceCategory();

  /*
   * Affichage des valeurs des curseurs.
   */
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

  /*
   * Mode de jeu.
   */
  const modeSel = $('#game-mode');
  const humanField = $('#field-human-count');
  const aiField = $('#field-ai-count');

  function syncModeFields() {

    const mode = modeSel.value;

    humanField.style.display =
      (mode === 'hotseat' || mode === 'mixed')
        ? 'flex'
        : 'none';

    aiField.style.display =
      (mode === 'ai' || mode === 'mixed')
        ? 'flex'
        : 'none';

    if (mode === 'ai') {
      $('#human-count').value = 1;
    }
  }

  modeSel.addEventListener('change', syncModeFields);
  syncModeFields();

  /*
   * Bouton "Composer les équipes".
   */
  
  $('#btn-go-teams').addEventListener('click', () => {

    // ============================================================
    // CATÉGORIE DE COURSE
    // ============================================================

    App.config.raceCategory = categorySel.value;

    // ============================================================
    // TOUR DE FRANCE 2026
    // ============================================================

    if (App.config.raceCategory === 'tour2026') {

        // Le Tour possède toujours 21 étapes.
        App.config.raceFormat = 'tour';
        App.config.stageCount = 21;
        App.config.ttStageNumber = 0;

        // Ces paramètres seront déterminés automatiquement
        // par tour2026.js pour chaque étape.
        App.config.terrainProfile = 'fixed';
        App.config.trackLength = 0;
        App.config.trackWidth = 0;

        App.totalStages = 21;

    }

    // ============================================================
    // COURSE CLASSIQUE
    // ============================================================

    else {

        App.config.raceFormat = formatSel.value;

        App.config.stageCount =
            parseInt($('#stage-count').value, 10);

        App.config.ttStageNumber =
            formatSel.value === 'stage'
                ? parseInt(ttStageSelect.value, 10)
                : 0;

        App.config.terrainProfile =
            $('#terrain-profile').value;

        App.config.trackLength =
            parseInt($('#track-length').value, 10);

        App.config.trackWidth =
            parseInt($('#track-width').value, 10);

        App.totalStages =
            App.config.raceFormat === 'stage'
                ? App.config.stageCount
                : 1;
    }

    // ============================================================
    // MODE DE JEU
    // ============================================================

    App.config.gameMode = modeSel.value;

    App.config.humanCount =
        App.config.gameMode === 'ai'
            ? 1
            : parseInt($('#human-count').value, 10);

    App.config.aiCount =
        App.config.gameMode === 'hotseat'
            ? 0
            : parseInt($('#ai-count').value, 10);

    // ============================================================
    // ÉQUIPES
    // ============================================================

    buildDefaultTeams();

    ui.renderTeams(
        $('#teams-container'),
        App.teams
    );

    ui.renderSpecReference(
        $('#spec-reference-list'),
        SPECIALIZATIONS
    );

    nav('screen-teams');
});
}
