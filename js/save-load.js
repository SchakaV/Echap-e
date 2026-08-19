// save-load.js — sauvegarde et reprise d'une partie en cours, sous forme
// de fichier JSON local (aucun serveur impliqué — mode solo/hotseat/IA
// uniquement ; le multijoueur en ligne est piloté par le serveur et n'a
// pas besoin de ce mécanisme).
//
// Format de fichier : un objet JSON contenant tout ce qu'il faut pour
// reconstruire App (config, équipes, coureurs, classement général,
// maillots) et App.runtime (plateau, occupation des cases, manche en
// cours, ordre de jeu, franchissements de features…), afin de reprendre
// une étape EXACTEMENT là où elle a été interrompue (même manche, même
// coureur à jouer).
//
// Emplacement du fichier : quand le navigateur le permet (API File System
// Access — Chrome/Edge), on ouvre directement un sélecteur qui démarre
// dans le dossier "Documents" du profil (`startIn: 'documents'`). Les
// navigateurs qui ne supportent pas cette API (Firefox, Safari) n'offrent
// aucun moyen, pour une page web, d'imposer un dossier par défaut : on
// utilise alors un téléchargement classique, qui atterrit dans le dossier
// de téléchargements habituel du navigateur.

import { App } from './state.js';
import { setRiderIdCounterAtLeast } from './rider.js';
import { $ } from './dom.js';
import * as ui from './ui.js';
import { renderRaceBoard, renderRosterNow } from './race-render.js';
import { renderTopThreeNow } from './race-setup.js';
import { advanceTurn } from './race-loop.js';

const SAVE_VERSION = 1;

const FILE_TYPES = [{
  description: 'Sauvegarde Échappée',
  accept: { 'application/json': ['.json'] },
}];

function suggestedFileName() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  return `echappee-sauvegarde-${stamp}.json`;
}

/* ============================= SÉRIALISATION ============================= */

function serializeGame() {
  const rt = App.runtime;
  const state = rt ? rt.state : null;

  return {
    kind: 'echappee-save',
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),

    config: App.config,
    stageIndex: App.stageIndex,
    totalStages: App.totalStages,
    stageLabel: $('#stage-label') ? $('#stage-label').textContent : '',

    // Équipes : uniquement la composition déclarée (riderObjs est dérivé
    // des coureurs ci-dessous et reconstruit au chargement).
    teams: App.teams.map(t => ({
      id: t.id, name: t.name, color: t.color, isAI: t.isAI, riders: t.riders,
    })),
    // Coureurs (spec incluse : ce sont des données pures, sans fonction,
    // donc sérialisables telles quelles).
    allRiders: App.allRiders,

    gc: Array.from(App.gc.entries()),
    jerseys: App.jerseys,

    runtime: state ? {
      isTimeTrial: !!rt.isTimeTrial,
      isTeamTimeTrial: !!rt.isTeamTimeTrial,
      resultsProcessed: !!rt.resultsProcessed,
      order: (rt.order || []).map(r => r.id),
      orderIdx: rt.orderIdx || 0,
      state: {
        board: state.board,
        round: state.round,
        moveSeq: state.moveSeq,
        finishColumn: state.finishColumn,
        log: state.log,
        occupancy: Array.from(state.occupancy.entries()),
        finishedCount: state.finishedCount,
        featureCrossings: Array.from((state.featureCrossings || new Map()).entries()),
        isTimeTrial: !!state.isTimeTrial,
        ttNextStartIdx: state.ttNextStartIdx,
        ttStartInterval: state.ttStartInterval,
        ttPendingStart: state.ttPendingStart,
        ttStartOrder: state.ttStartOrder
          ? (rt.isTeamTimeTrial
              ? state.ttStartOrder.map(team => team.map(r => r.id))
              : state.ttStartOrder.map(r => r.id))
          : null,
      },
    } : null,
  };
}

/* ============================= RESTAURATION ============================= */

function restoreGame(data) {
  if (!data || data.kind !== 'echappee-save' || !Array.isArray(data.allRiders)) {
    throw new Error("Ce fichier ne ressemble pas à une sauvegarde d'Échappée.");
  }

  App.config = data.config;
  App.stageIndex = data.stageIndex;
  App.totalStages = data.totalStages;
  App.gc = new Map(data.gc);
  App.jerseys = data.jerseys || null;
  App.allRiders = data.allRiders;
  App.teams = data.teams;

  // Repartage les coureurs par équipe (riderObjs), nécessaire pour la mise
  // en place d'une éventuelle étape suivante (ex. contre-la-montre par
  // équipe du Tour de France).
  App.teams.forEach(team => {
    team.riderObjs = App.allRiders.filter(r => r.teamId === team.id);
  });

  // Réattache chaque coureur à l'objet de spécialisation partagé (plutôt
  // que la copie inline issue du JSON), et fait avancer le compteur
  // d'identifiants pour éviter toute collision avec de futurs coureurs.
  let maxId = 0;
  App.allRiders.forEach(r => { if (r.id > maxId) maxId = r.id; });
  setRiderIdCounterAtLeast(maxId);

  const riderById = new Map(App.allRiders.map(r => [r.id, r]));

  if (data.runtime) {
    const rr = data.runtime;
    const s = rr.state;
    const state = {
      board: s.board,
      riders: App.allRiders,
      round: s.round,
      moveSeq: s.moveSeq,
      finishColumn: s.finishColumn,
      log: s.log || [],
      occupancy: new Map(s.occupancy),
      finishedCount: s.finishedCount,
      featureCrossings: new Map(s.featureCrossings),
    };
    if (s.isTimeTrial) {
      state.isTimeTrial = true;
      state.ttNextStartIdx = s.ttNextStartIdx;
      state.ttPendingStart = s.ttPendingStart;
      state.ttStartInterval = s.ttStartInterval;
      state.ttStartOrder = rr.isTeamTimeTrial
        ? s.ttStartOrder.map(team => team.map(id => riderById.get(id)).filter(Boolean))
        : s.ttStartOrder.map(id => riderById.get(id)).filter(Boolean);
    }

    App.runtime = {
      state,
      order: (rr.order || []).map(id => riderById.get(id)).filter(Boolean),
      orderIdx: rr.orderIdx || 0,
      isTimeTrial: rr.isTimeTrial,
      isTeamTimeTrial: rr.isTeamTimeTrial,
      resultsProcessed: rr.resultsProcessed,
    };
  } else {
    App.runtime = null;
  }

  return data;
}

function renderRestoredRace(data) {
  const rt = App.runtime;
  if (!rt) return;

  if ($('#stage-label')) $('#stage-label').textContent = data.stageLabel || '';
  $('#btn-sim-race').disabled = !!rt.resultsProcessed;

  $('#log-content').innerHTML = '';
  (rt.state.log || []).forEach(line => ui.appendLog($('#log-content'), line));

  renderRaceBoard(rt.state);
  renderRosterNow();
  renderTopThreeNow();

  // Reprend la manche exactement là où elle a été interrompue (même ordre
  // de jeu, même coureur à jouer) plutôt que de relancer une manche.
  advanceTurn();
}

/* ============================= ENREGISTREMENT ============================= */

export async function saveGame() {
  if (!App.runtime) {
    ui.showToast('Aucune course en cours à enregistrer.');
    return;
  }

  const json = JSON.stringify(serializeGame(), null, 2);
  const filename = suggestedFileName();

  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        // Ouvre le sélecteur directement dans le dossier "Documents" du
        // profil de l'utilisateur (pris en charge par Chrome/Edge).
        startIn: 'documents',
        types: FILE_TYPES,
      });
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      ui.showToast('Partie enregistrée.');
      return;
    } catch (e) {
      if (e && e.name === 'AbortError') return; // annulé par l'utilisateur
      console.error(e);
      // Repli sur le téléchargement classique si l'API échoue pour une
      // autre raison (permission refusée, etc.).
    }
  }

  // Repli : téléchargement classique. Le navigateur choisit lui-même le
  // dossier (en général celui des téléchargements) — impossible d'imposer
  // "Documents" sans l'API File System Access ci-dessus.
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  ui.showToast('Partie téléchargée.');
}

/* ============================= CHARGEMENT ============================= */

async function pickSaveFileText() {
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        startIn: 'documents',
        types: FILE_TYPES,
        multiple: false,
      });
      const file = await handle.getFile();
      return await file.text();
    } catch (e) {
      if (e && e.name === 'AbortError') return null; // annulé
      console.error(e);
      // Repli sur l'input file classique.
    }
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    });
    input.click();
  });
}

/**
 * Ouvre un sélecteur de fichier, charge la sauvegarde choisie et reprend
 * directement la course sur l'écran de course. `nav` est la fonction de
 * navigation entre écrans (voir nav.js), passée en paramètre pour éviter
 * toute dépendance circulaire avec ce module.
 */
export async function loadGame(nav) {
  let text;
  try {
    text = await pickSaveFileText();
  } catch (e) {
    console.error(e);
    ui.showToast('Impossible de lire ce fichier.');
    return;
  }
  if (!text) return; // annulé

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    ui.showToast('Fichier de sauvegarde invalide.');
    return;
  }

  try {
    restoreGame(data);
  } catch (e) {
    console.error(e);
    ui.showToast(e.message || 'Impossible de charger cette sauvegarde.');
    return;
  }

  if (App.runtime) {
    nav('screen-race');
    renderRestoredRace(data);
    ui.showToast('Partie chargée — reprise en cours.');
  } else {
    // Sauvegarde sans course en cours (ex. juste après une fin de partie) :
    // on revient simplement à l'accueil avec l'état restauré.
    nav('screen-home');
    ui.showToast('Partie chargée.');
  }
}

export function bindSaveLoad(nav) {
  const saveBtn = $('#btn-save-race');
  if (saveBtn) saveBtn.addEventListener('click', saveGame);

  const loadBtn = $('#btn-load-game');
  if (loadBtn) loadBtn.addEventListener('click', () => loadGame(nav));
}