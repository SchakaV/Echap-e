// online.js — mode multijoueur en ligne : connexion au serveur, salon
// d'attente, puis course pilotée entièrement par le serveur (qui fait
// autorité sur les dés et les déplacements). Ce module s'appuie sur les
// mêmes fonctions de rendu que le mode solo (ui.js), mais sur des écrans
// dédiés pour ne jamais interférer avec la boucle de jeu locale.

import { NetClient } from './net.js';
import { SPECIALIZATIONS } from './rider.js';
import { TEAM_COLORS } from './colors.js';
import { TOUR_2026 } from './tour2026.js';
import * as engine from './engine.js';
import * as ui from './ui.js';

const $ = sel => document.querySelector(sel);

const TOKEN_KEY = 'velo-jeu-player-token';
function getOrCreateToken() {
  let t = null;
  try { t = localStorage.getItem(TOKEN_KEY); } catch { /* stockage indisponible */ }
  if (!t) {
    t = Math.random().toString(36).slice(2) + Date.now().toString(36);
    try { localStorage.setItem(TOKEN_KEY, t); } catch { /* tant pis */ }
  }
  return t;
}
function saveToken(t) {
  try { localStorage.setItem(TOKEN_KEY, t); } catch { /* tant pis */ }
}

const Net = {
  client: null,
  clientId: null,
  code: null,
  room: null,
  pendingDice: null, // { riderId, rollInfo, cells }
  // Dernières cases proposées (avec leur chemin) pour CHAQUE coureur ayant
  // lancé son dé — sert à animer le déplacement quand l'état suivant arrive.
  pendingMoves: new Map(), // riderId -> [{column, lane, path}]
  // Positions actuellement affichées sur le plateau (riderId -> "col-lane").
  currentPos: new Map(),
};

function myTeam() {
  return Net.room ? Net.room.teams.find(t => t.ownerId === Net.clientId) || null : null;
}

function isHost() {
  return Net.room && Net.room.hostId === Net.clientId;
}

/* ============================= CONNEXION ============================= */

/** Devine l'adresse WebSocket du serveur : si le jeu est lui-même servi
 *  par ce serveur (déploiement en ligne), c'est la même origine — sinon
 *  (développement local via Live Server), on propose localhost:8080. */
function guessServerUrl() {
  const { protocol, host, hostname } = window.location;
  if (protocol === 'http:' || protocol === 'https:') {
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Le jeu est ouvert via Live Server (souvent sur un autre port que le
      // serveur de jeu) : on propose l'adresse locale par défaut du serveur.
      return 'ws://localhost:8080';
    }
    // Le jeu est hébergé quelque part : le serveur multijoueur tourne très
    // probablement à la même adresse (c'est lui qui sert cette page).
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${host}`;
  }
  return 'ws://localhost:8080';
}

function bindConnectScreen(nav) {
  $('#btn-go-online').addEventListener('click', () => {
    const input = $('#online-server-url');
    if (!input.value) input.value = guessServerUrl();
    nav('screen-online-connect');
  });

  $('#btn-online-connect').addEventListener('click', async () => {
    const url = $('#online-server-url').value.trim();
    const name = $('#online-player-name').value.trim() || 'Joueur';
    const code = $('#online-room-code').value.trim().toUpperCase();
    const errEl = $('#online-connect-error');
    errEl.textContent = '';

    if (!url) { errEl.textContent = 'Adresse du serveur manquante.'; return; }

    const btn = $('#btn-online-connect');
    btn.disabled = true;
    btn.textContent = 'Connexion…';

    try {
      const client = new NetClient(url);
      await client.connect();
      Net.client = client;

      client.on('joined', (msg) => {
        Net.clientId = msg.clientId;
        Net.code = msg.code;
        if (msg.token) saveToken(msg.token);
      });
      client.on('room', (msg) => {
        Net.room = msg.room;
        onRoomUpdate(nav);
      });
      client.on('diceRolled', (msg) => {
        Net.pendingDice = msg;
        Net.pendingMoves.set(msg.riderId, msg.cells || []);
        onDiceRolled();
      });
      client.on('error', (msg) => {
        errEl.textContent = msg.message;
      });
      client.on('close', () => {
        errEl.textContent = 'Connexion au serveur perdue.';
      });

      client.send({ type: 'join', name, code: code || undefined, token: getOrCreateToken() });
      nav('screen-online-lobby');
    } catch (e) {
      errEl.textContent = e.message || 'Connexion impossible.';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Se connecter';
    }
  });

  $('#btn-online-leave').addEventListener('click', () => leaveOnline(nav));
  $('#btn-online-results-leave').addEventListener('click', () => leaveOnline(nav));
}

function leaveOnline(nav) {
  if (Net.client) Net.client.close();
  Net.client = null;
  Net.room = null;
  Net.clientId = null;
  Net.code = null;
  Net.pendingDice = null;
  Net.pendingMoves.clear();
  Net.currentPos.clear();
  nav('screen-home');
}

/* ============================= SALON D'ATTENTE ============================= */

function bindLobbyScreen() {
  ui.renderSpecReference($('#online-spec-reference-list'), SPECIALIZATIONS);

  // Liste des étapes du Tour de France 2026.
  const stageSelect = $('#online-tour-stage');
  stageSelect.innerHTML = Object.values(TOUR_2026.stages).map(s =>
    `<option value="${s.number}">${s.number} — ${s.name}${s.type === 'team-time-trial' ? ' (CLM par équipe)' : ''}</option>`
  ).join('');

  ['online-track-length', 'online-track-width', 'online-ai-count'].forEach(id => {
    $(`#${id}`).addEventListener('input', sendConfigFromForm);
  });
  ['online-events-enabled', 'online-two-dice', 'online-race-category', 'online-tour-stage', 'online-terrain-profile'].forEach(id => {
    $(`#${id}`).addEventListener('change', sendConfigFromForm);
  });
  $('#btn-online-start').addEventListener('click', () => {
    Net.client && Net.client.send({ type: 'startRace' });
  });
}

/** Affiche/masque les réglages propres à chaque catégorie de course : en
 *  Tour de France, le parcours (profil, longueur, largeur) est imposé par
 *  l'étape — seul le choix de l'étape reste pertinent. */
function applyCategoryFields() {
  const isTour = $('#online-race-category').value === 'tour2026';
  $('#online-field-tour-stage').style.display = isTour ? 'block' : 'none';
  ['online-field-terrain-profile', 'online-field-track-length', 'online-field-track-width'].forEach(id => {
    $(`#${id}`).style.display = isTour ? 'none' : '';
  });
  // Comme en solo, l'option des 2 dés n'est proposée que pour le Tour de
  // France (les courses classiques en ligne restent à un seul dé).
  const twoDiceField = $('#online-field-two-dice');
  if (isTour) {
    twoDiceField.style.display = 'block';
  } else {
    twoDiceField.style.display = 'none';
    $('#online-two-dice').checked = false;
  }
}

function sendConfigFromForm() {
  if (!Net.client || !isHost()) return;
  $('#online-length-val').textContent = $('#online-track-length').value;
  $('#online-width-val').textContent = $('#online-track-width').value;
  $('#online-ai-val').textContent = $('#online-ai-count').value;
  applyCategoryFields();
  Net.client.send({
    type: 'updateConfig',
    config: {
      raceCategory: $('#online-race-category').value,
      tourStageNumber: parseInt($('#online-tour-stage').value, 10) || 1,
      trackLength: parseInt($('#online-track-length').value, 10),
      trackWidth: parseInt($('#online-track-width').value, 10),
      terrainProfile: $('#online-terrain-profile').value,
      aiCount: parseInt($('#online-ai-count').value, 10),
      eventsEnabled: $('#online-events-enabled').checked,
      twoDice: $('#online-two-dice').checked,
    },
  });
}

function renderLobby() {
  $('#online-room-code-label').textContent = Net.room.code;
  $('#online-race-code').textContent = Net.room.code;

  $('#online-players-list').innerHTML = Net.room.players.map(p => {
    const team = Net.room.teams.find(t => t.ownerId === p.id);
    const tag = p.id === Net.room.hostId ? ' (hôte)' : '';
    return `<div class="roster-row" style="grid-template-columns:12px 1fr;">
      <span class="team-swatch" style="background:${team ? team.color : '#888'}"></span>
      <span class="roster-name">${p.name}${tag}</span>
    </div>`;
  }).join('');

  const team = myTeam();
  const myTeamEl = $('#online-my-team');
  const editingMyTeam = myTeamEl.contains(document.activeElement);
  if (team && !editingMyTeam) {
    // Ne reconstruit ce bloc que si l'utilisateur n'est pas en train d'y
    // taper — sinon, recréer les champs à chaque frappe (à cause de l'écho
    // renvoyé par le serveur) fait perdre le focus et le curseur après
    // chaque lettre.
    const specOptions = Object.values(SPECIALIZATIONS).map(s => `<option value="${s.key}">${s.label}</option>`).join('');
    const otherColors = new Set(Net.room.teams.filter(t => t.id !== team.id).map(t => t.color));
    const swatches = TEAM_COLORS.map(color => {
      const taken = otherColors.has(color) && color !== team.color;
      const selected = color === team.color;
      return `<button type="button" class="color-swatch${selected ? ' selected' : ''}${taken ? ' taken' : ''}" data-color="${color}" style="background:${color}" ${taken ? 'disabled' : ''} title="${taken ? 'Déjà utilisée' : color}"></button>`;
    }).join('');
    myTeamEl.innerHTML = `
      <div class="team-color-row">
        <button type="button" class="team-swatch team-swatch-btn" data-role="color-btn" style="background:${team.color}" title="Changer la couleur de l'équipe"></button>
        <span style="font-size:13px;color:var(--chalk-dim);">${team.name}</span>
      </div>
      <div class="color-palette hidden" id="online-color-palette">${swatches}</div>
      <div class="riders-row">${team.riders.map((r, i) => `
      <div class="rider-chip">
        <input type="text" data-i="${i}" data-role="name" value="${r.name}">
        <select data-i="${i}" data-role="spec">${specOptions}</select>
      </div>`).join('')}</div>`;
    team.riders.forEach((r, i) => {
      myTeamEl.querySelector(`select[data-i="${i}"]`).value = r.specKey;
    });
    myTeamEl.querySelectorAll('[data-role="name"], [data-role="spec"]').forEach(el => {
      el.addEventListener('change', pushMyRoster);
      el.addEventListener('input', pushMyRoster);
    });
    const palette = myTeamEl.querySelector('#online-color-palette');
    myTeamEl.querySelector('[data-role="color-btn"]').addEventListener('click', () => {
      palette.classList.toggle('hidden');
    });
    palette.querySelectorAll('.color-swatch').forEach(btn => {
      btn.addEventListener('click', () => {
        Net.client.send({ type: 'updateColor', color: btn.dataset.color });
        palette.classList.add('hidden');
      });
    });
  } else if (!team) {
    myTeamEl.innerHTML = '<p class="top3-empty">…</p>';
  }

  const hostConfig = $('#online-host-config');
  const waiting = $('#online-waiting-host');
  if (isHost()) {
    hostConfig.style.display = 'block';
    waiting.style.display = 'none';
    $('#online-race-category').value = Net.room.config.raceCategory || 'classic';
    $('#online-tour-stage').value = Net.room.config.tourStageNumber || 1;
    applyCategoryFields();
    $('#online-terrain-profile').value = Net.room.config.terrainProfile;
    $('#online-track-length').value = Net.room.config.trackLength;
    $('#online-length-val').textContent = Net.room.config.trackLength;
    $('#online-track-width').value = Net.room.config.trackWidth;
    $('#online-width-val').textContent = Net.room.config.trackWidth;
    $('#online-ai-count').value = Net.room.config.aiCount;
    $('#online-ai-val').textContent = Net.room.config.aiCount;
    $('#online-events-enabled').checked = !!Net.room.config.eventsEnabled;
    $('#online-two-dice').checked = !!Net.room.config.twoDice;
  } else {
    hostConfig.style.display = 'none';
    waiting.style.display = 'block';
  }
}

let pushRosterTimer = null;
function pushMyRoster() {
  const team = myTeam();
  if (!team) return;
  clearTimeout(pushRosterTimer);
  pushRosterTimer = setTimeout(() => {
    const rows = Array.from($('#online-my-team').querySelectorAll('.rider-chip'));
    const riders = rows.map(row => ({
      name: row.querySelector('[data-role="name"]').value,
      specKey: row.querySelector('[data-role="spec"]').value,
    }));
    Net.client.send({ type: 'updateRoster', riders });
  }, 250);
}

/* ============================= COURSE ============================= */

// Une animation de déplacement en cours ne doit pas être interrompue par
// l'état suivant (les coups des IA arrivent toutes les ~750 ms alors qu'une
// animation dure ~1,3 s) : on la laisse se terminer, puis on re-traite le
// dernier état reçu.
let animating = false;
let pendingRender = false;

function onRoomUpdate(nav) {
  if (!Net.room) return;
  if (Net.room.phase === 'lobby') {
    renderLobby();
  } else if (Net.room.phase === 'racing') {
    nav('screen-online-race');
    if (animating) {
      pendingRender = true;
      return;
    }
    animateMovedRiders(() => {
      animating = false;
      if (pendingRender) {
        pendingRender = false;
        onRoomUpdate(nav);
      } else {
        renderRace();
      }
    });
  } else if (Net.room.phase === 'results') {
    nav('screen-online-results');
    renderResults();
  }
}

/** Anime les déplacements entre l'état précédent et le nouvel état reçu :
 *  chaque coureur qui a changé de case est déplacé pas à pas le long du
 *  chemin annoncé lors de son jet (diceRolled), comme en solo — au lieu
 *  d'être téléporté. Les positions intermédiaires sont rendues dans
 *  #online-board, puis `onDone` fait le rendu final de l'état reçu. */
function animateMovedRiders(onDone) {
  animating = true;
  const room = Net.room;
  if (!room) { animating = false; onDone(); return; }

  const moved = room.riders.filter(r =>
    r.column !== null && r.column !== undefined &&
    Net.currentPos.get(r.id) !== `${r.column}-${r.lane}`
  );

  if (!moved.length) { animating = false; onDone(); return; }

  let i = 0;
  const stepDuration = 220;

  function animateNext() {
    if (i >= moved.length) { onDone(); return; }
    const rider = moved[i];
    const targetKey = `${rider.column}-${rider.lane}`;

    // Premier apparition (départ, CLM) : pas d'animation, on place.
    if (!Net.currentPos.has(rider.id)) {
      Net.currentPos.set(rider.id, targetKey);
      i++;
      animateNext();
      return;
    }

    const targetCell = (Net.pendingMoves.get(rider.id) || []).find(c =>
      c.column === rider.column && c.lane === rider.lane
    );
    const path = targetCell && targetCell.path ? targetCell.path : [];
    if (!path.length) {
      // Pas de chemin connu (reconnexion, téléportation) : on place direct.
      Net.currentPos.set(rider.id, targetKey);
      i++;
      animateNext();
      return;
    }

    let stepIdx = 0;
    const step = () => {
      if (stepIdx >= path.length) {
        Net.currentPos.set(rider.id, targetKey);
        i++;
        animateNext();
        return;
      }
      const { column, lane } = path[stepIdx];
      const tempRiders = room.riders.map(r =>
        r.id === rider.id ? { ...r, column, lane, finished: false } : r
      );
      ui.renderBoard($('#online-board'), {
        board: room.board,
        riders: tempRiders,
        finishColumn: room.finishColumn,
      }, { autoScroll: 'edge' });
      Net.currentPos.set(rider.id, `${column}-${lane}`);
      stepIdx++;
      setTimeout(step, stepDuration);
    };
    step();
  }

  animateNext();
}

function setTurnPanel(color, text) {
  $('#online-turn-swatch').style.background = color;
  $('#online-turn-text').textContent = text;
}

function currentRider() {
  return Net.room.riders.find(r => r.id === Net.room.currentRiderId) || null;
}

function renderRace() {
  const room = Net.room;
  const viewState = { board: room.board, riders: room.riders, finishColumn: room.finishColumn };
  const rider = currentRider();

  ui.renderBoard($('#online-board'), viewState, rider ? {
    activeCell: { column: rider.column, lane: rider.lane },
    autoScroll: true,
  } : {});
  Net.currentPos = new Map(room.riders.map(r => [r.id, `${r.column}-${r.lane}`]));
  ui.renderRoster($('#online-roster-panel'), room.riders, room.board);

  $('#online-log-content').innerHTML = '';
  room.log.slice().reverse().forEach(line => ui.appendLog($('#online-log-content'), line));

  const btn = $('#btn-online-roll-dice');
  if (!rider) {
    setTurnPanel('#888', 'Fin de manche…');
    btn.style.display = 'none';
    return;
  }

  const team = room.teams.find(t => t.id === rider.teamId);
  setTurnPanel(rider.teamColor, `${team ? team.name : ''} — ${rider.name} (${rider.spec.label})`);

  const isMine = !rider.isAI && rider.teamId === (myTeam() ? myTeam().id : null);
  if (isMine) {
    btn.style.display = 'inline-block';
    btn.disabled = false;
    btn.onclick = () => {
      btn.disabled = true;
      Net.client.send({ type: 'rollDice' });
    };
    $('#online-die-face').textContent = '';
    const die2 = $('#online-die-face-2');
    if (die2) die2.classList.add('hidden');
    $('#online-dice-breakdown').textContent = '';
  } else {
    btn.style.display = 'none';
  }
}

function breakdownText(rollInfo) {
  const diceLabel = rollInfo.twoDice
    ? `dés ${rollInfo.roll} + ${rollInfo.roll2}${rollInfo.rerolled ? ' (relance)' : ''}`
    : `dé ${rollInfo.roll}${rollInfo.rerolled ? ' (relance)' : ''}`;
  const bits = [diceLabel, ...engine.rollBonusBits(rollInfo)];
  return `${bits.join(' · ')} = <b>${rollInfo.total}</b> case(s).`;
}

/** Complète le détail du dé selon la situation : arrivée atteignable, ou
 *  bouchon qui empêche d'utiliser tous les pas du dé. (La portée en
 *  colonnes n'est pas affichée : c'est déjà visible sur le plateau.) */
function reachHint(cells, blocked, finishing) {
  if (!cells || !cells.length) return '';
  if (finishing) return ' \u2014 la ligne d\u2019arriv\u00e9e est atteignable !';
  if (blocked) return ' \u2014 bouchon : certains pas du d\u00e9 sont inutilisables.';
  return '';
}

function onDiceRolled() {
  const room = Net.room;
  if (!room) return;
  const { riderId, rollInfo, cells } = Net.pendingDice;
  const rider = room.riders.find(r => r.id === riderId);
  if (!rider) return;

  const mine = myTeam() && rider.teamId === myTeam().id && !rider.isAI;

  const die2El = $('#online-die-face-2');
  const onDone = () => {
    if (!mine) return;
    $('#online-dice-breakdown').innerHTML =
      breakdownText(rollInfo) +
      ' Cliquez une case en surbrillance.' +
      reachHint(cells, Net.pendingDice.blocked, Net.pendingDice.finishing);
    const viewState = { board: room.board, riders: room.riders, finishColumn: room.finishColumn };
    ui.renderBoard($('#online-board'), viewState, {
      highlightCells: cells,
      activeCell: { column: rider.column, lane: rider.lane },
      onCellClick: (column, lane) => {
        $('#online-dice-breakdown').textContent = '';
        Net.client.send({ type: 'chooseCell', column, lane });
      },
    });
  };

  if (rollInfo.twoDice && die2El) {
    die2El.textContent = '';
    die2El.classList.remove('hidden');
    ui.animateTwoDice($('#online-die-face'), die2El, rollInfo.roll, rollInfo.roll2, { duration: mine ? 650 : 400, onDone });
  } else {
    if (die2El) die2El.classList.add('hidden');
    ui.animateDice($('#online-die-face'), rollInfo.roll, { duration: mine ? 650 : 400, onDone });
  }
}

function renderResults() {
  const room = Net.room;
  let html = '<table><thead><tr><th>Rang</th><th>Coureur</th><th>Équipe</th><th>Spécialité</th><th>Points</th></tr></thead><tbody>';
  (room.results || []).forEach(r => {
    html += `<tr><td>${r.rank}</td><td>${r.name}</td><td style="color:${r.teamColor}">●</td><td>${r.spec}</td><td>${r.points}</td></tr>`;
  });
  html += '</tbody></table>';
  $('#online-results-content').innerHTML = html;
  $('#btn-online-back-lobby').style.display = isHost() ? 'inline-block' : 'none';
}

/* ============================= INIT ============================= */

export function initOnline(nav) {
  bindConnectScreen(nav);
  bindLobbyScreen();
  $('#btn-online-back-lobby').addEventListener('click', () => {
    Net.client && Net.client.send({ type: 'backToLobby' });
  });
}
