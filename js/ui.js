// ui.js — rendu DOM (plateau, équipes, résultats)

import { SPECIALIZATIONS } from './rider.js';
import { randomFirstName } from './names.js';

// Couleurs d'équipe — les maillots distinctifs (vert/jaune) se distinguent
// par un halo autour du vélo, pas par la couleur de fond, donc aucun besoin
// d'exclure le vert ou le jaune de cette palette.
export const TEAM_COLORS = [
  '#f4c430', '#3fae67', '#e0453a', '#4a90d9', '#c25fd6', '#e08a3c', '#3fd6c6', '#d9457e',
];

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
        <span class="team-swatch" style="background:${team.color}"></span>
        <input type="text" value="${team.name}" data-role="team-name" style="background:transparent;border:none;color:inherit;font-family:inherit;font-size:inherit;font-weight:inherit;width:200px;">
      </div>
      <span class="team-tag">${team.isAI ? 'IA' : 'Joueur'}</span>
    `;
    head.querySelector('[data-role="team-name"]').addEventListener('input', e => {
      team.name = e.target.value;
      onChange && onChange();
    });
    card.appendChild(head);

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
 * Dessine le plateau, en "pavage" décalé (une voie sur deux est décalée
 * d'une demi-case, façon pavé autobloquant).
 *
 * viewState: { board, riders, finishColumn }
 * opts:
 *   - highlightCells: [{column,lane}]  cases d'arrivée possibles pour le dé en cours
 *   - placeableCells: [{column,lane}]  cases libres cliquables pendant le placement
 *   - onCellClick(column, lane)
 */
export function renderBoard(boardEl, viewState, opts = {}) {
  boardEl.innerHTML = '';
  const { board, riders, finishColumn } = viewState;
  const { highlightCells = [], placeableCells = [], onCellClick, activeCell = null, autoScroll = false, jerseys = null } = opts;
  const startDepth = board.startDepth || 0;

  const byCell = new Map();
  riders.forEach(r => {
    if (r.finished || r.column === null || r.column === undefined) return;
    byCell.set(`${r.column}-${r.lane}`, r);
  });
  const highlightSet = new Set(highlightCells.map(c => `${c.column}-${c.lane}`));
  const placeableSet = new Set(placeableCells.map(c => `${c.column}-${c.lane}`));
  const activeKey = activeCell ? `${activeCell.column}-${activeCell.lane}` : null;

  const firstCol = -startDepth;
  let activeCellEl = null;

  // Ligne de repère des colonnes
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

      const key = `${c}-${lane}`;
      if (highlightSet.has(key)) cls += ' highlight';
      if (placeableSet.has(key)) cls += ' placeable';
      if (activeKey === key) cls += ' active-cell';
      cell.className = cls;
      cell.dataset.col = c;
      cell.dataset.lane = lane;

      if ((highlightSet.has(key) || placeableSet.has(key)) && onCellClick) {
        cell.addEventListener('click', () => onCellClick(c, lane));
      }

      const rider = byCell.get(key);
      if (rider) {
        const token = document.createElement('div');
        let tokenCls = 'rider-token';
        let jerseyBadge = '';
        if (jerseys && jerseys.yellow === rider.id) { tokenCls += ' jersey-yellow'; jerseyBadge = '🟡'; }
        else if (jerseys && jerseys.green === rider.id) { tokenCls += ' jersey-green'; jerseyBadge = '🟢'; }
        token.className = tokenCls;
        token.style.setProperty('--rider-color', rider.teamColor);
        token.title = `${rider.name} (${rider.spec.label})${jerseyBadge ? ' ' + jerseyBadge : ''}`;
        token.innerHTML = cyclistIconSVG() + `<span class="rider-badge">${rider.spec.short}</span>`
          + (jerseyBadge ? `<span class="jersey-flag">${jerseyBadge}</span>` : '');
        cell.appendChild(token);
      }
      row.appendChild(cell);
      if (activeKey === key) activeCellEl = cell;
    }
    boardEl.appendChild(row);
  }

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

export function renderRoster(container, riders, board, jerseys = null) {
  const sorted = [...riders].sort((a, b) => {
    if (a.finished !== b.finished) return a.finished ? -1 : 1;
    if (a.finished && b.finished) return (a.finishRank || 0) - (b.finishRank || 0);
    return b.column - a.column;
  });
  container.innerHTML = sorted.map(r => {
    let status;
    if (r.finished) status = `Arrivé — ${r.finishRank}${r.finishRank === 1 ? 'er' : 'e'}`;
    else if (r.column === null || r.column === undefined) status = 'En attente';
    else status = `Case ${r.column} / ${board.length}`;
    let jerseyBadge = '';
    if (jerseys && jerseys.yellow === r.id) jerseyBadge = '🟡 ';
    else if (jerseys && jerseys.green === r.id) jerseyBadge = '🟢 ';
    return `
      <div class="roster-row">
        <span class="team-swatch" style="background:${r.teamColor}"></span>
        <span class="roster-name">${jerseyBadge}${r.name}</span>
        <span class="roster-spec">${r.spec.short}</span>
        <span class="roster-status">${status}</span>
      </div>`;
  }).join('');
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
    // Maillot jaune : classement au nombre de manches perdues sur le vainqueur
    // de chaque étape (le plus petit total gagne, comme un classement au temps).
    html += '<h3 style="font-family:var(--font-display);letter-spacing:.03em;margin-top:28px;color:var(--maillot-jaune)">🟡 Classement général — maillot jaune (au temps)</h3>';
    html += '<table><thead><tr><th>Rang</th><th>Coureur</th><th>Équipe</th><th>Manches de retard</th></tr></thead><tbody>';
    const yellowSorted = [...gc].sort((a, b) => (a.yellowPoints || 0) - (b.yellowPoints || 0));
    yellowSorted.forEach((r, i) => {
      const jersey = i === 0 ? '🟡 ' : '';
      html += `<tr><td>${i + 1}</td><td>${jersey}${r.name}</td><td style="color:${r.teamColor}">●</td><td>${r.yellowPoints || 0}</td></tr>`;
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
    html += '<table><thead><tr><th>Rang</th><th>Équipe</th><th>Retard cumulé (manches)</th></tr></thead><tbody>';
    const teamSorted = [...teamStandings].sort((a, b) => a.yellowPoints - b.yellowPoints);
    teamSorted.forEach((t, i) => {
      html += `<tr><td>${i + 1}</td><td style="color:${t.color}">● ${t.name}</td><td>${t.yellowPoints}</td></tr>`;
    });
    html += '</tbody></table>';
  }

  container.innerHTML = html;
}

/* ============================= TOP 3 GÉNÉRAL (écran de course) ============================= */

export function renderTopThree(container, gcEntries) {
  if (!gcEntries || !gcEntries.length) {
    container.innerHTML = '<p class="top3-empty">Disponible à partir de la 2ᵉ étape.</p>';
    return;
  }
  const sorted = [...gcEntries].sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 3);
  container.innerHTML = sorted.map((r, i) => `
    <div class="top3-row">
      <span class="top3-rank">${i + 1}</span>
      <span class="team-swatch" style="background:${r.teamColor}"></span>
      <span class="top3-name">${i === 0 ? '🟢 ' : ''}${r.name}</span>
      <span class="top3-pts">${r.totalPoints} pts</span>
    </div>
  `).join('');
}

export function renderTopThreeYellow(container, gcEntries) {
  if (!gcEntries || !gcEntries.length) {
    container.innerHTML = '<p class="top3-empty">Disponible à partir de la 2ᵉ étape.</p>';
    return;
  }
  const sorted = [...gcEntries].sort((a, b) => (a.yellowPoints || 0) - (b.yellowPoints || 0)).slice(0, 3);
  container.innerHTML = sorted.map((r, i) => `
    <div class="top3-row yellow">
      <span class="top3-rank">${i + 1}</span>
      <span class="team-swatch" style="background:${r.teamColor}"></span>
      <span class="top3-name">${i === 0 ? '🟡 ' : ''}${r.name}</span>
      <span class="top3-pts">${i === 0 ? '0' : '+' + (r.yellowPoints || 0)} m.</span>
    </div>
  `).join('');
}
