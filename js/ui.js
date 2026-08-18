// ui.js — rendu DOM (plateau, équipes, résultats)

import { SPECIALIZATIONS } from './rider.js';
import { randomFirstName } from './names.js';
import { TEAM_COLORS } from './colors.js';

export { TEAM_COLORS };

/** Compare deux entrées de classement général au temps (maillot jaune) : le
 *  plus petit retard cumulé gagne ; à égalité, on compare les classements
 *  d'étape un par un pour départager — mêmes règles que dans main.js. */
function compareYellow(entryA, entryB) {
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

/** Formate un écart en secondes (maillot jaune) en heure/minute/seconde :
 *  les minutes sont notées avec une apostrophe simple (') et les secondes
 *  avec une apostrophe double (''). Les unités nulles supéures sont omises.
 *  Ex. 0 -> "0", 5 -> "5''", 65 -> "1' 05''", 3661 -> "1h 01' 01''". */
function formatYellowTime(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  if (s === 0) return '0';
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  if (hours > 0) return `${hours}h ${mm}' ${ss}''`;
  if (minutes > 0) return `${minutes}' ${ss}''`;
  return `${seconds}''`;
}

/** Icône de cycliste vu de profil, sur son vélo. Le maillot (torse + bras)
 *  est coloré via la variable CSS --rider-color posée sur le token parent ;
 *  le reste (cadre, roues, casque, jambe, peau) reste neutre. */
function cyclistIconSVG() {
  return `
  <svg viewBox="0 0 60 40" class="rider-svg" xmlns="http://www.w3.org/2000/svg">
    <circle cx="13" cy="33" r="7" fill="none" stroke="#c7c8d0" stroke-width="2.4"/>
    <circle cx="47" cy="33" r="7" fill="none" stroke="#c7c8d0" stroke-width="2.4"/>
    <circle cx="13" cy="33" r="1.3" fill="#c7c8d0"/>
    <circle cx="47" cy="33" r="1.3" fill="#c7c8d0"/>
    <path d="M13 33 L28 33 L25 16 Z M28 33 L40 16 L47 33 M40 16 L44 12 L48 12"
          fill="none" stroke="#9a9ba5" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M22 16 L27 15.4" stroke="#9a9ba5" stroke-width="2" stroke-linecap="round"/>
    <path d="M25 17 L31 23 L28 33" fill="none" stroke="#3a3b42" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="28" cy="33" r="1.4" fill="#3a3b42"/>
    <path d="M30 8 L44 12" stroke="var(--rider-color)" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M25 16.5 L32 7" stroke="var(--rider-color)" stroke-width="6.5" stroke-linecap="round"/>
    <circle cx="34.5" cy="4.5" r="3.8" fill="#e2b891"/>
    <path d="M31.3 3.6 A4 4 0 0 1 37.8 3.2" fill="none" stroke="#20212a" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`;
}

export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

/* ============================= ÉQUIPES ============================= */

export function renderTeams(container, teams, { onChange } = {}) {
  container.innerHTML = '';
  teams.forEach((team, tIdx) => {
    const card = document.createElement('div');
    card.className = 'team-card';

    const head = document.createElement('div');
    head.className = 'team-card-head';
    head.innerHTML = `
      <div class="team-name">
        <button type="button" class="team-swatch team-swatch-btn" data-role="color-btn" style="background:${team.color}" title="Changer la couleur de l'équipe"></button>
        <input type="text" value="${team.name}" data-role="team-name" style="background:transparent;border:none;color:inherit;font-family:inherit;font-size:inherit;font-weight:inherit;width:200px;">
      </div>
      <span class="team-tag">${team.isAI ? 'IA' : 'Joueur'}</span>
    `;
    head.querySelector('[data-role="team-name"]').addEventListener('input', e => {
      team.name = e.target.value;
      onChange && onChange();
    });
    card.appendChild(head);

    const palette = document.createElement('div');
    palette.className = 'color-palette hidden';
    const otherColors = new Set(teams.filter((_, i) => i !== tIdx).map(t => t.color));
    TEAM_COLORS.forEach(color => {
      const taken = otherColors.has(color) && color !== team.color;
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'color-swatch' + (color === team.color ? ' selected' : '') + (taken ? ' taken' : '');
      dot.style.background = color;
      dot.disabled = taken;
      dot.title = taken ? 'Déjà utilisée par une autre équipe' : color;
      dot.addEventListener('click', () => {
        team.color = color;
        palette.classList.add('hidden');
        renderTeams(container, teams, { onChange });
        onChange && onChange();
      });
      palette.appendChild(dot);
    });
    card.appendChild(palette);
    head.querySelector('[data-role="color-btn"]').addEventListener('click', () => {
      palette.classList.toggle('hidden');
    });

    const ridersRow = document.createElement('div');
    ridersRow.className = 'riders-row';

    team.riders.forEach((rider, rIdx) => {
      const chip = document.createElement('div');
      chip.className = 'rider-chip';
      const specOptions = Object.values(SPECIALIZATIONS)
        .map(s => `<option value="${s.key}" ${s.key === rider.specKey ? 'selected' : ''}>${s.label}</option>`)
        .join('');
      chip.innerHTML = `
        <input type="text" value="${rider.name}" data-role="rider-name">
        <select data-role="rider-spec">${specOptions}</select>
        <div class="spec-desc">${SPECIALIZATIONS[rider.specKey].desc}</div>
        <div class="chip-actions">
          <button class="btn btn-ghost" data-role="remove-rider" style="padding:4px 10px;font-size:11px;">Retirer</button>
        </div>
      `;
      chip.querySelector('[data-role="rider-name"]').addEventListener('input', e => {
        rider.name = e.target.value;
        onChange && onChange();
      });
      chip.querySelector('[data-role="rider-spec"]').addEventListener('change', e => {
        rider.specKey = e.target.value;
        chip.querySelector('.spec-desc').textContent = SPECIALIZATIONS[rider.specKey].desc;
        onChange && onChange();
      });
      chip.querySelector('[data-role="remove-rider"]').addEventListener('click', () => {
        team.riders.splice(rIdx, 1);
        renderTeams(container, teams, { onChange });
        onChange && onChange();
      });
      ridersRow.appendChild(chip);
    });

    card.appendChild(ridersRow);

    const actions = document.createElement('div');
    actions.className = 'chip-actions';
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-ghost';
    addBtn.textContent = '+ Ajouter un coureur';
    addBtn.disabled = team.riders.length >= 6;
    addBtn.addEventListener('click', () => {
      if (team.riders.length >= 6) return;
      const specKeys = Object.keys(SPECIALIZATIONS);
      const used = team.riders.map(r => r.name);
      team.riders.push({
        name: randomFirstName(used),
        specKey: specKeys[team.riders.length % specKeys.length],
      });
      renderTeams(container, teams, { onChange });
      onChange && onChange();
    });
    actions.appendChild(addBtn);
    card.appendChild(actions);

    container.appendChild(card);
  });
}

/* ============================= PLATEAU ============================= */

/**
 * Construit la grille statique du plateau (cases + repères de colonnes) et
 * la met en cache sur l'élément DOM. Coûteux (crée toutes les cases), donc
 * n'est appelé que quand la structure du plateau change réellement (nouvelle
 * étape) — voir renderBoard() ci-dessous, qui décide quand rebâtir.
 */
function buildStaticGrid(boardEl, board, finishColumn, structureKey) {
  boardEl.innerHTML = '';
  const startDepth = board.startDepth || 0;
  const cellWidth = 58;
  const totalColumns = board.length + startDepth + 1;
  boardEl.style.minWidth = `${totalColumns * cellWidth}px`;

  const firstCol = -startDepth;
  const cellsByKey = new Map();

  const markerRow = document.createElement('div');
  markerRow.className = 'board-row';
  for (let c = firstCol; c <= finishColumn; c++) {
    const m = document.createElement('div');
    m.className = 'col-marker';
    if (c === 0) m.textContent = '▶';
    else if (c === finishColumn) m.textContent = '🏁';
    else if (c > 0 && c % 5 === 0) m.textContent = c;
    markerRow.appendChild(m);
  }
  boardEl.appendChild(markerRow);

  // Élévation : on normalise l'altitude en px pour la translation Z 3D.
  // Les cases hors route (zone de départ / arrivée) restent à l'altitude 0.
  const elevation = board.elevation || [];
  const maxElev = elevation.length ? Math.max(1, Math.max(...elevation.map(Math.abs))) : 1;
  const elevPxAt = (c) => {
    if (c < 0 || c >= board.length) return 0;
    // On amplifie l'amplitude pour un effet visuel marqué (jusqu'à ~46px).
    return Math.round((elevation[c] / maxElev) * 46);
  };

  // Marqueurs de features (sprints & cols) posés sur la première voie, à la
  // colonne correspondante. Pour un col, on prend le sommet (columnEnd).
  const features = board.features || [];
  const featureMarkers = new Map(); // key "col" -> élément marqueur
  for (const f of features) {
    const col = f.type === 'climb' ? (f.columnEnd != null ? f.columnEnd : f.columnStart) : f.column;
    if (col == null || col < 0 || col >= board.length) continue;
    featureMarkers.set(col, f);
  }

  for (let lane = 0; lane < board.width; lane++) {
    const row = document.createElement('div');
    row.className = 'board-row' + (lane % 2 === 1 ? ' offset' : '');
    for (let c = firstCol; c <= finishColumn; c++) {
      const cell = document.createElement('div');
      const isStartZone = c < 0;
      const terrain = (c >= board.length || isStartZone) ? 'plaine' : board.terrain[c];
      let cls = `cell ${terrain}`;
      if (c === finishColumn) cls += ' finish';
      if (isStartZone) cls += ' start-zone';
      if (c === -1) cls += ' start-line';
      cell.className = cls;
      cell.dataset.col = c;
      cell.dataset.lane = lane;
      // Élévation 3D de la case.
      cell.style.setProperty('--elev', `${elevPxAt(c)}px`);
      row.appendChild(cell);
      cellsByKey.set(`${c}-${lane}`, cell);

      // Marqueur de feature sur la première voie uniquement.
      if (lane === 0 && featureMarkers.has(c)) {
        const f = featureMarkers.get(c);
        const mk = document.createElement('div');
        mk.className = `feature-marker ${f.type}`;
        if (f.type === 'sprint') {
          mk.textContent = '🟢 Sprint';
        } else {
          const cat = f.category === null ? 'HC' : (f.category ? 'Cat ' + f.category : '');
          mk.innerHTML = `⛰️ ${f.name ? '' : ''}<span class="cat">${cat}</span>`;
          if (f.name) mk.title = f.name;
        }
        cell.appendChild(mk);
      }
    }
    boardEl.appendChild(row);
  }

  const cache = {
    structureKey,
    cellsByKey,
    tokensByRiderId: new Map(),
    highlightSet: new Set(),
    placeableSet: new Set(),
    activeKey: null,
    onCellClick: null,
  };

  // Un seul écouteur délégué sur le plateau entier, posé une fois pour
  // toutes (au lieu d'un écouteur par case recréé à chaque rendu). Il lit
  // toujours l'état courant (cache vivant sur boardEl), donc reste valide
  // même après une reconstruction de la grille.
  if (!boardEl._hasBoardClickDelegation) {
    boardEl.addEventListener('click', (ev) => {
      const cellEl = ev.target.closest('.cell');
      if (!cellEl) return;
      const live = boardEl._boardCache;
      if (!live || !live.onCellClick) return;
      const key = `${cellEl.dataset.col}-${cellEl.dataset.lane}`;
      if (!live.highlightSet.has(key) && !live.placeableSet.has(key)) return;
      live.onCellClick(Number(cellEl.dataset.col), Number(cellEl.dataset.lane));
    });
    boardEl._hasBoardClickDelegation = true;
  }

  return cache;
}

/** Met à jour les classes dynamiques (surbrillance/case cliquable/case
 *  active) en ne touchant que les cases dont l'état a changé depuis le
 *  dernier rendu, plutôt que de repasser sur toute la grille. */
function updateDynamicCellClasses(cache, highlightSet, placeableSet, activeKey) {
  cache.highlightSet.forEach(key => {
    if (!highlightSet.has(key)) cache.cellsByKey.get(key)?.classList.remove('highlight');
  });
  cache.placeableSet.forEach(key => {
    if (!placeableSet.has(key)) cache.cellsByKey.get(key)?.classList.remove('placeable');
  });
  if (cache.activeKey && cache.activeKey !== activeKey) {
    cache.cellsByKey.get(cache.activeKey)?.classList.remove('active-cell');
  }

  highlightSet.forEach(key => cache.cellsByKey.get(key)?.classList.add('highlight'));
  placeableSet.forEach(key => cache.cellsByKey.get(key)?.classList.add('placeable'));
  if (activeKey) cache.cellsByKey.get(activeKey)?.classList.add('active-cell');

  cache.highlightSet = highlightSet;
  cache.placeableSet = placeableSet;
  cache.activeKey = activeKey;
}

/** Déplace/actualise les jetons des coureurs en place, sans jamais toucher
 *  à la grille. Un jeton déjà créé pour un coureur est simplement rattaché
 *  à sa nouvelle case (déplacement DOM peu coûteux) plutôt que détruit et
 *  recréé ; seuls les coureurs qui ont fini/disparu perdent leur jeton. */
function updateRiderTokens(cache, riders, jerseys) {
  const activeIds = new Set();

  riders.forEach(rider => {
    if (rider.finished || rider.column === null || rider.column === undefined) return;
    const key = `${rider.column}-${rider.lane}`;
    const cellEl = cache.cellsByKey.get(key);
    if (!cellEl) return;
    activeIds.add(rider.id);

    let token = cache.tokensByRiderId.get(rider.id);
    if (!token) {
      token = document.createElement('div');
      token.innerHTML = cyclistIconSVG() + '<span class="rider-badge"></span><span class="jersey-flag"></span>';
      cache.tokensByRiderId.set(rider.id, token);
    }

    let tokenCls = 'rider-token';
    let jerseyBadge = '';
    if (jerseys && jerseys.yellow === rider.id) { tokenCls += ' jersey-yellow'; jerseyBadge = '🟡'; }
    else if (jerseys && jerseys.green === rider.id) { tokenCls += ' jersey-green'; jerseyBadge = '🟢'; }
    else if (jerseys && jerseys.polka === rider.id) { tokenCls += ' jersey-polka'; jerseyBadge = '🔴'; }
    token.className = tokenCls;
    token.style.setProperty('--rider-color', rider.teamColor);
    token.title = `${rider.name} (${rider.spec.label})${jerseyBadge ? ' ' + jerseyBadge : ''}`;
    const badgeEl = token.querySelector('.rider-badge');
    if (badgeEl) badgeEl.textContent = rider.spec.short;
    const flagEl = token.querySelector('.jersey-flag');
    if (flagEl) flagEl.textContent = jerseyBadge;

    if (token.parentElement !== cellEl) cellEl.appendChild(token);
  });

  for (const [riderId, token] of cache.tokensByRiderId) {
    if (!activeIds.has(riderId)) {
      token.remove();
      cache.tokensByRiderId.delete(riderId);
    }
  }
}

/**
 * Dessine le plateau, en "pavage" décalé (une voie sur deux est décalée
 * d'une demi-case, façon pavé autobloquant).
 *
 * viewState: { board, riders, finishColumn }
 * opts:
 *   - highlightCells: [{column,lane}]  cases d'arrivée possibles pour le dé en cours
 *   - placeableCells: [{column,lane}]  cases libres cliquables pendant le placement
 *   - onCellClick(column, lane)
 *
 * La grille (cases + repères) n'est reconstruite que quand la structure du
 * plateau change réellement (dimensions ou terrain différents — donc en
 * pratique au changement d'étape) ; les appels suivants ne font que déplacer
 * les jetons des coureurs et basculer quelques classes CSS, au lieu de
 * détruire/recréer des centaines d'éléments à chaque case franchie.
 */
export function renderBoard(boardEl, viewState, opts = {}) {
  const { board, riders, finishColumn } = viewState;
  const { highlightCells = [], placeableCells = [], onCellClick = null, activeCell = null, autoScroll = false, jerseys = null } = opts;

  const structureKey = `${board.length}|${board.width}|${board.startDepth || 0}|${finishColumn}|${board.terrain.join(',')}`;
  let cache = boardEl._boardCache;
  if (!cache || cache.structureKey !== structureKey) {
    cache = buildStaticGrid(boardEl, board, finishColumn, structureKey);
    boardEl._boardCache = cache;
  }
  cache.onCellClick = onCellClick;

  const highlightSet = new Set(highlightCells.map(c => `${c.column}-${c.lane}`));
  const placeableSet = new Set(placeableCells.map(c => `${c.column}-${c.lane}`));
  const activeKey = activeCell ? `${activeCell.column}-${activeCell.lane}` : null;

  updateDynamicCellClasses(cache, highlightSet, placeableSet, activeKey);
  updateRiderTokens(cache, riders, jerseys);

  const activeCellEl = activeKey ? cache.cellsByKey.get(activeKey) : null;
  if (activeCellEl) {
    if (autoScroll === true) {
      scrollBoardToFraction(boardEl, activeCellEl, 0.25);
    } else if (autoScroll === 'edge') {
      scrollBoardIfNearEdge(boardEl, activeCellEl, 0.10, 0.25);
    }
  }
}

/** Fait défiler le conteneur du plateau pour placer `cellEl` à `fraction`
 *  (0 = tout à gauche, 0.5 = centré) de la largeur visible, au lieu de
 *  toujours centrer. */
function scrollBoardToFraction(boardEl, cellEl, fraction) {
  const wrap = boardEl.closest('#board-wrap') || boardEl.parentElement;
  if (!wrap) return;
  const wrapRect = wrap.getBoundingClientRect();
  const cellRect = cellEl.getBoundingClientRect();
  const delta = (cellRect.left + cellRect.width / 2) - (wrapRect.left + wrapRect.width * fraction);
  wrap.scrollTo({ left: wrap.scrollLeft + delta, behavior: 'smooth' });
}

/** Ne fait défiler que si la case s'approche à moins de `threshold` (fraction
 *  de la largeur visible) du bord gauche ou droit — utilisé pendant
 *  l'animation d'un déplacement, pour ne suivre la caméra que sur les
 *  tout derniers pas si besoin, sans la faire bouger à chaque case. */
function scrollBoardIfNearEdge(boardEl, cellEl, threshold, targetFraction) {
  const wrap = boardEl.closest('#board-wrap') || boardEl.parentElement;
  if (!wrap) return;
  const wrapRect = wrap.getBoundingClientRect();
  const cellRect = cellEl.getBoundingClientRect();
  const leftEdge = wrapRect.left + wrapRect.width * threshold;
  const rightEdge = wrapRect.right - wrapRect.width * threshold;
  const cellCenter = cellRect.left + cellRect.width / 2;
  if (cellCenter < leftEdge || cellCenter > rightEdge) {
    scrollBoardToFraction(boardEl, cellEl, targetFraction);
  }
}

/* ============================= ROSTER (noms des coureurs) ============================= */

/** Construit le libellé d'un groupe de course (échappée, poursuivant n,
 *  peloton, retardataire n) à partir de sa description { type, rank, count }. */
function groupLabel(g) {
  const n = g.count;
  const word = n > 1 ? `${n} coureurs` : '1 coureur';
  if (g.type === 'echappee') return `Échappée (${word})`;
  if (g.type === 'peloton') return `Peloton (${word})`;
  if (g.type === 'poursuivant') return `Poursuivant ${g.rank} (${word})`;
  if (g.type === 'retardataire') return `Retardataire ${g.rank} (${word})`;
  return `${n} coureur(s)`;
}


export function renderRoster(container, riders, board, jerseys = null, opts = {}) {
  const { groups = null, showGroups = false } = opts;

  function rosterRow(r) {
    let status;
    if (r.finished) status = `Arriv\u00e9 \u2014 ${r.finishRank}${r.finishRank === 1 ? 'er' : 'e'}`;
    else if (r.column === null || r.column === undefined) status = 'En attente';
    else status = `Case ${r.column} / ${board.length}`;
    let jerseyBadge = '';
    if (jerseys && jerseys.yellow === r.id) jerseyBadge = '\ud83d\udfe1 ';
    else if (jerseys && jerseys.green === r.id) jerseyBadge = '\ud83d\udfe2 ';
    else if (jerseys && jerseys.polka === r.id) jerseyBadge = '\ud83d\udd34 ';
    return `
      <div class="roster-row">
        <span class="team-swatch" style="background:${r.teamColor}"></span>
        <span class="roster-name">${jerseyBadge}${r.name}</span>
        <span class="roster-spec">${r.spec.short}</span>
        <span class="roster-status">${status}</span>
      </div>`;
  }

  const sorted = [...riders].sort((a, b) => {
    if (a.finished !== b.finished) return a.finished ? -1 : 1;
    if (a.finished && b.finished) return (a.finishRank || 0) - (b.finishRank || 0);
    return b.column - a.column;
  });
  // Course normale : on regroupe les coureurs encore en course par groupe
  // de course (échappée / poursuivants / peloton / retardataires), calculé
  // par engine.computeGroups. Les coureurs arrivés restent affichés à part
  // en fin de liste. En contre-la-montre, `groups` est null : on garde
  // l'affichage simple habituel (pas de peloton ni de groupe).
  if (showGroups && groups && groups.length) {
    const riderById = new Map(riders.map(r => [r.id, r]));
    const finishedRows = sorted.filter(r => r.finished).map(rosterRow).join('');
    const groupBlocks = groups.map(g => {
      const rows = g.riders
        .map(id => riderById.get(id))
        .filter(Boolean)
        .sort((a, b) => b.column - a.column)
        .map(rosterRow)
        .join('');
      return `
        <div class="group-block group-${g.type}">
          <div class="group-head">${groupLabel(g)}</div>
          ${rows}
        </div>`;
    }).join('');
    const finishedHead = finishedRows ? '<div class="group-head group-head-finished">Arrivés</div>' : '';
    container.innerHTML = groupBlocks + finishedHead + finishedRows;
    return;
  }

  container.innerHTML = sorted.map(rosterRow).join('');
}

/* ============================= RÉFÉRENCE DES BONUS ============================= */

export function renderSpecReference(container, specs) {
  container.innerHTML = Object.values(specs).map(s => `
    <div class="spec-ref-row">
      <span class="spec-ref-label">${s.label}</span>
      <span class="spec-ref-desc">${s.desc}</span>
    </div>
  `).join('');
}

/* ============================= NOTIFICATIONS ============================= */

export function showToast(message, { duration = 2200 } = {}) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function appendLog(logEl, html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  logEl.prepend(div);
}

/* ============================= DÉ ============================= */

const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

/** Anime le dé (valeurs aléatoires qui défilent) puis se fixe sur finalValue. */
export function animateDice(faceEl, finalValue, { duration = 650, onDone } = {}) {
  const start = Date.now();
  const tick = () => {
    const elapsed = Date.now() - start;
    if (elapsed >= duration) {
      faceEl.textContent = DICE_FACES[finalValue];
      faceEl.classList.remove('rolling');
      onDone && onDone();
      return;
    }
    faceEl.textContent = DICE_FACES[1 + Math.floor(Math.random() * 6)];
    setTimeout(tick, 60);
  };
  faceEl.classList.add('rolling');
  tick();
}

/* ============================= RÉSULTATS ============================= */

export function renderStageResults(container, state, { isStageRace, gc, pointsByRiderId, teamStandings } = {}) {
  const sorted = [...state.riders].sort((a, b) => a.finishRank - b.finishRank);
  let html = '<table><thead><tr><th>Rang</th><th>Coureur</th><th>Équipe</th><th>Spécialité</th><th>Points</th></tr></thead><tbody>';
  sorted.forEach(r => {
    const pts = pointsByRiderId ? (pointsByRiderId.get(r.id) || 0) : '—';
    html += `<tr><td>${r.finishRank}</td><td>${r.name}</td><td style="color:${r.teamColor}">●</td><td>${r.spec.label}</td><td>${pts}</td></tr>`;
  });
  html += '</tbody></table>';

  if (isStageRace && gc) {
    // Maillot jaune : classement au temps. L'écart se mesure en secondes :
    // 1 manche d'écart = 10 s ; dans la même manche, chaque case d'écart = 1 s
    // (le plus petit total gagne, comme un classement au temps réel).
    html += '<h3 style="font-family:var(--font-display);letter-spacing:.03em;margin-top:28px;color:var(--maillot-jaune)">🟡 Classement général — maillot jaune (au temps)</h3>';
    html += '<table><thead><tr><th>Rang</th><th>Coureur</th><th>Équipe</th><th>Retard</th></tr></thead><tbody>';
    const yellowSorted = [...gc].sort(compareYellow);
    yellowSorted.forEach((r, i) => {
      const jersey = i === 0 ? '🟡 ' : '';
      html += `<tr><td>${i + 1}</td><td>${jersey}${r.name}</td><td style="color:${r.teamColor}">●</td><td>${i === 0 ? '0' : '+' + formatYellowTime(r.yellowPoints || 0)}</td></tr>`;
    });
    html += '</tbody></table>';

    // Maillot vert : classement aux points cumulés (le plus grand total gagne).
    html += '<h3 style="font-family:var(--font-display);letter-spacing:.03em;margin-top:28px;color:var(--maillot-vert)">🟢 Classement général — maillot vert (aux points)</h3>';
    html += '<table><thead><tr><th>Rang</th><th>Coureur</th><th>Équipe</th><th>Points cumulés</th></tr></thead><tbody>';
    const gcSorted = [...gc].sort((a, b) => b.totalPoints - a.totalPoints);
    gcSorted.forEach((r, i) => {
      const jersey = i === 0 ? '🟢 ' : '';
      html += `<tr><td>${i + 1}</td><td>${jersey}${r.name}</td><td style="color:${r.teamColor}">●</td><td>${r.totalPoints}</td></tr>`;
    });
    html += '</tbody></table>';
  }

  if (teamStandings && teamStandings.length) {
    const label = isStageRace ? 'Classement général par équipe (méthode maillot jaune)' : 'Classement par équipe (méthode maillot jaune)';
    html += `<h3 style="font-family:var(--font-display);letter-spacing:.03em;margin-top:28px;color:var(--maillot-jaune)">${label}</h3>`;
    html += '<table><thead><tr><th>Rang</th><th>Équipe</th><th>Retard cumulé</th></tr></thead><tbody>';
    const teamSorted = [...teamStandings].sort((a, b) => a.yellowPoints - b.yellowPoints);
    teamSorted.forEach((t, i) => {
      html += `<tr><td>${i + 1}</td><td style="color:${t.color}">● ${t.name}</td><td>${i === 0 ? '0' : '+' + formatYellowTime(t.yellowPoints)}</td></tr>`;
    });
    html += '</tbody></table>';
  }

  container.innerHTML = html;
}

/* ============================= TOP 3 GÉNÉRAL (écran de course) ============================= */

/** Ligne de classement général (format commun au top 3 visible et à la
 *  liste déroulante complète). */
function gcRow(r, i, { jersey, value, cls }) {
  return `
    <div class="top3-row${cls ? ' ' + cls : ''}">
      <span class="top3-rank">${i + 1}</span>
      <span class="team-swatch" style="background:${r.teamColor}"></span>
      <span class="top3-name">${i === 0 && jersey ? jersey + ' ' : ''}${r.name}</span>
      <span class="top3-pts">${value}</span>
    </div>`;
}

/** Construit un encart de classement général : le top 3 est visible
 *  directement, le reste du classement se déroule via un <details>. */
function renderTopThreeWithDropdown(container, gcEntries, { sortFn, valueFn, jersey, rowCls }) {
  if (!gcEntries || !gcEntries.length) {
    container.innerHTML = '<p class="top3-empty">Disponible à partir de la 2ᵉ étape.</p>';
    return;
  }
  const sorted = [...gcEntries].sort(sortFn);
  const top = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  let html = top.map((r, i) => gcRow(r, i, { jersey, value: valueFn(r, i), cls: rowCls })).join('');
  if (rest.length) {
    html += `<details class="gc-dropdown"><summary>Voir tout le classement (${sorted.length})</summary>`;
    html += rest.map((r, i) => gcRow(r, i + 3, { jersey, value: valueFn(r, i + 3), cls: rowCls })).join('');
    html += `</details>`;
  }
  container.innerHTML = html;
}

export function renderTopThree(container, gcEntries) {
  renderTopThreeWithDropdown(container, gcEntries, {
    sortFn: (a, b) => b.totalPoints - a.totalPoints,
    valueFn: r => `${r.totalPoints} pts`,
    jersey: '🟢',
  });
}

export function renderTopThreeYellow(container, gcEntries) {
  renderTopThreeWithDropdown(container, gcEntries, {
    sortFn: compareYellow,
    valueFn: (r, i) => i === 0 ? '0' : '+' + formatYellowTime(r.yellowPoints || 0),
    jersey: '🟡',
    rowCls: 'yellow',
  });
}

/** Classement du maillot à pois (meilleur grimpeur) : trié par polkaPoints
 *  décroissant. N'affiche rien tant qu'aucun col n'a été franchi. */
export function renderTopThreePolka(container, gcEntries) {
  const hasPolka = gcEntries && gcEntries.some(e => (e.polkaPoints || 0) > 0);
  if (!hasPolka) {
    container.innerHTML = '<p class="top3-empty">Disponible après le 1er col franchi.</p>';
    return;
  }
  renderTopThreeWithDropdown(container, gcEntries, {
    sortFn: (a, b) => (b.polkaPoints || 0) - (a.polkaPoints || 0),
    valueFn: r => `${r.polkaPoints || 0} pts`,
    jersey: '🔴',
    rowCls: 'polka',
  });
}
