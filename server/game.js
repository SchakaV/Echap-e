// game.js — logique d'une salle de jeu multijoueur.
// Réutilise telles quelles les mêmes règles que la version solo
// (../js/board.js, engine.js, ai.js, rider.js, scoring.js) : le serveur
// fait autorité sur l'état de la course, les clients ne font qu'afficher
// ce qu'il leur envoie et lui transmettre les actions du joueur.

import { generateBoard, setStartDepth } from '../js/board.js';
import { createRider, SPECIALIZATIONS } from '../js/rider.js';
import * as engine from '../js/engine.js';
import { pointsForRank } from '../js/scoring.js';
import { randomFirstName } from '../js/names.js';
import { TEAM_COLORS } from '../js/colors.js';

let roomIdCounter = 1;

function makeRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function makeToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function defaultRiders(isAI) {
  const specKeys = Object.keys(SPECIALIZATIONS);
  const used = [];
  return [0, 1, 2].map(i => {
    const name = randomFirstName(used);
    used.push(name);
    return { name, specKey: specKeys[i % specKeys.length] };
  });
}

export class Room {
  constructor() {
    this.code = makeRoomCode();
    this.id = roomIdCounter++;
    this.clients = new Map();   // clientId -> ws
    this.players = new Map();   // clientId -> { name, teamId }
    this.teams = [];            // { id, name, color, isAI, ownerId, ownerToken, riders: [{name, specKey}] }
    this.phase = 'lobby';       // lobby | racing | results
    this.config = { trackLength: 40, trackWidth: 3, terrainProfile: 'random', aiCount: 0 };
    this.hostId = null;
    this.log = [];

    // état de course (une fois la partie démarrée)
    this.board = null;
    this.allRiders = null;
    this.state = null;          // état moteur (engine.createRaceState)
    this.order = [];
    this.orderIdx = 0;
    this.pendingRoll = null;
  }

  addLog(message) {
    this.log.push(message);
    if (this.log.length > 200) this.log.shift();
  }

  usedColors(excludeTeamId) {
    return new Set(this.teams.filter(t => t.id !== excludeTeamId).map(t => t.color));
  }

  nextFreeColor() {
    const used = this.usedColors();
    return TEAM_COLORS.find(c => !used.has(c)) || TEAM_COLORS[this.teams.length % TEAM_COLORS.length];
  }

  /**
   * Ajoute un joueur. Si `token` correspond à une équipe existante encore
   * marquée IA (reconnexion après déconnexion en cours de course), lui rend
   * la main au lieu de créer une nouvelle équipe. Retourne le token à
   * mémoriser côté client.
   */
  addPlayer(clientId, ws, name, token) {
    this.clients.set(clientId, ws);

    if (token) {
      const team = this.teams.find(t => t.ownerToken === token);
      if (team) {
        // Reprise de contrôle (l'équipe existe déjà, humaine ou repassée IA).
        team.ownerId = clientId;
        team.isAI = false;
        if (team.riderObjs) team.riderObjs.forEach(r => { r.isAI = false; });
        this.players.set(clientId, { name, teamId: team.id });
        if (!this.hostId) this.hostId = clientId;
        this.addLog(`${name} a repris le contrôle de ${team.name}.`);
        return token;
      }
    }

    if (this.phase !== 'lobby') {
      // Pas de token valide et la course est déjà en cours : impossible de
      // rejoindre en tant que nouvelle équipe à ce stade.
      this.clients.delete(clientId);
      return null;
    }

    const assignedToken = token || makeToken();
    const teamId = `team-${this.teams.length + 1}-${this.id}`;
    const color = this.nextFreeColor();
    const team = { id: teamId, name: `Équipe de ${name}`, color, isAI: false, ownerId: clientId, ownerToken: assignedToken, riders: defaultRiders(false) };
    this.teams.push(team);
    this.players.set(clientId, { name, teamId });
    if (!this.hostId) this.hostId = clientId;
    this.addLog(`${name} a rejoint la salle.`);
    return assignedToken;
  }

  /** Déconnexion : en lobby, l'équipe disparaît ; en course, l'IA prend le
   *  relais (l'équipe reste, pour qu'on puisse la reprendre en revenant
   *  avec le même token). */
  removePlayer(clientId) {
    const player = this.players.get(clientId);
    const team = this.teams.find(t => t.ownerId === clientId);
    this.clients.delete(clientId);
    this.players.delete(clientId);

    if (this.phase === 'lobby') {
      this.teams = this.teams.filter(t => t.ownerId !== clientId);
    } else if (team) {
      team.isAI = true;
      team.ownerId = null;
      if (team.riderObjs) team.riderObjs.forEach(r => { r.isAI = true; });
      this.addLog(`${team.name} est déconnectée — l'IA prend le relais.`);
    }

    if (player) this.addLog(`${player.name} a quitté la salle.`);
    if (this.hostId === clientId) {
      this.hostId = this.players.size ? this.players.keys().next().value : null;
    }
  }

  isEmpty() {
    return this.clients.size === 0;
  }

  updateRoster(clientId, riders) {
    const team = this.teams.find(t => t.ownerId === clientId);
    if (!team || this.phase !== 'lobby') return;
    if (!Array.isArray(riders) || riders.length < 1 || riders.length > 6) return;
    team.riders = riders.map(r => ({
      name: String(r.name || '').slice(0, 24) || 'Coureur',
      specKey: SPECIALIZATIONS[r.specKey] ? r.specKey : 'rouleur',
    }));
  }

  updateColor(clientId, color) {
    const team = this.teams.find(t => t.ownerId === clientId);
    if (!team) return;
    if (!TEAM_COLORS.includes(color)) return;
    if (this.usedColors(team.id).has(color)) return; // déjà prise par une autre équipe
    team.color = color;
    if (team.riderObjs) team.riderObjs.forEach(r => { r.teamColor = color; });
  }

  updateConfig(clientId, config) {
    if (clientId !== this.hostId || this.phase !== 'lobby') return;
    const c = this.config;
    if (config.trackLength) c.trackLength = Math.max(24, Math.min(60, config.trackLength | 0));
    if (config.trackWidth) c.trackWidth = Math.max(2, Math.min(5, config.trackWidth | 0));
    if (config.terrainProfile) c.terrainProfile = config.terrainProfile;
    if (config.aiCount !== undefined) c.aiCount = Math.max(0, Math.min(5, config.aiCount | 0));
  }

  /* ============================= DÉMARRAGE ============================= */

  startRace(clientId) {
    if (clientId !== this.hostId || this.phase !== 'lobby') return;
    if (this.teams.length === 0) return;

    for (let i = 0; i < this.config.aiCount; i++) {
      const color = this.nextFreeColor();
      this.teams.push({ id: `cpu-${i}-${this.id}`, name: `Équipe CPU ${i + 1}`, color, isAI: true, ownerId: null, ownerToken: null, riders: defaultRiders(true) });
    }

    this.board = generateBoard({
      length: this.config.trackLength,
      width: this.config.trackWidth,
      profile: this.config.terrainProfile,
    });

    this.allRiders = [];
    this.teams.forEach(team => {
      team.riderObjs = team.riders.map(r => createRider({
        name: r.name, teamId: team.id, teamColor: team.color, specKey: r.specKey, isAI: team.isAI,
      }));
      this.allRiders.push(...team.riderObjs);
    });

    setStartDepth(this.board, this.allRiders.length);
    this.autoPlaceRiders();

    this.state = engine.createRaceState(this.board, this.allRiders);
    this.phase = 'racing';
    this.log = [];
    this.addLog(`Grille de départ tirée au sort — ${this.allRiders.length} coureurs sur ${this.board.startDepth} ligne(s).`);
    this.startRound();
  }

  autoPlaceRiders() {
    const shuffled = [...this.allRiders];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    let idx = 0;
    for (let c = -this.board.startDepth; c < 0 && idx < shuffled.length; c++) {
      for (let l = 0; l < this.board.width && idx < shuffled.length; l++) {
        shuffled[idx].column = c;
        shuffled[idx].lane = l;
        idx++;
      }
    }
  }

  /* ============================= BOUCLE DE COURSE ============================= */

  startRound() {
    this.state.round++;
    this.order = engine.roundOrder(this.state);
    this.orderIdx = 0;
    this.pendingRoll = null;
  }

  /** Coureur dont c'est le tour, ou null si la manche est terminée. */
  currentRider() {
    if (!this.state) return null;
    while (this.orderIdx < this.order.length && this.order[this.orderIdx].finished) this.orderIdx++;
    return this.orderIdx < this.order.length ? this.order[this.orderIdx] : null;
  }

  ownerOf(rider) {
    const team = this.teams.find(t => t.id === rider.teamId);
    return team ? team.ownerId : null;
  }

  /** true si c'est bien au tour de ce client de jouer (via son équipe). */
  isClientsTurn(clientId, rider) {
    return rider && !rider.isAI && this.ownerOf(rider) === clientId;
  }

  rollDice(rider) {
    const rollInfo = engine.computeRoll(this.state, rider);
    const target = engine.resolveTarget(this.state, rider, rollInfo.total);
    return { rollInfo, target };
  }

  applyChoice(rider, rollInfo, target, column, lane) {
    const chosen = target.cells.find(c => c.column === column && c.lane === lane);
    engine.applyMove(this.state, rider, chosen ? chosen.column : target.cells[0].column, chosen ? chosen.lane : target.cells[0].lane, rollInfo);
    this.logMove(rider, rollInfo, target);
    this.orderIdx++;
    this.pendingRoll = null;
  }

  logMove(rider, rollInfo, target) {
    const bits = [];
    if (rollInfo.terrainBonus) bits.push(`terrain ${rollInfo.terrainBonus > 0 ? '+' : ''}${rollInfo.terrainBonus}`);
    if (rollInfo.sprintBonus) bits.push(`sprint +${rollInfo.sprintBonus}`);
    if (rollInfo.ttPlaineBonus) bits.push(`plaine +${rollInfo.ttPlaineBonus}`);
    if (rollInfo.inBreakaway) bits.push(`échappée +${rollInfo.breakawayBonus}`);
    if (rollInfo.draftBonus) bits.push(`aspiration +${rollInfo.draftBonus}`);
  if (rollInfo.windBonus) bits.push(`protection du vent +${rollInfo.windBonus}`);
    if (rollInfo.leadingGroup) bits.push(`rouler le groupe +${rollInfo.groupLeadBonus}`);
    const bonusStr = bits.length ? ` (${bits.join(', ')})` : '';
    const blockedStr = target.blocked ? ' — bouchon !' : '';
    const finishStr = rider.finished ? ' 🏁' : '';
    this.addLog(`${rider.name} : dé ${rollInfo.roll}${bonusStr} → ${rollInfo.total} case(s)${blockedStr}${finishStr}`);
  }

  /** Fin de manche : aspiration + classement des arrivées, puis manche suivante ou fin de course. */
  endRoundIfNeeded() {
    if (this.orderIdx < this.order.length) return false;
    engine.updateDraftBonuses(this.state);
    const finishers = this.state.riders.filter(r => r.finished && r.finishRound === this.state.round);
    if (finishers.length) engine.rankFinishersOfRound(this.state, finishers);
    this.addLog(`— Fin de la manche ${this.state.round} —`);
    if (engine.allFinished(this.state)) {
      this.phase = 'results';
      return true;
    }
    this.startRound();
    return false;
  }

  resultsPayload() {
    const sorted = [...this.state.riders].sort((a, b) => a.finishRank - b.finishRank);
    return sorted.map(r => ({
      rank: r.finishRank, name: r.name, teamColor: r.teamColor, spec: r.spec.label,
      points: pointsForRank(r.finishRank, this.board.profile),
    }));
  }

  snapshot() {
    return {
      phase: this.phase,
      hostId: this.hostId,
      code: this.code,
      config: this.config,
      colorOptions: TEAM_COLORS,
      players: Array.from(this.players.entries()).map(([id, p]) => ({ id, name: p.name })),
      teams: this.teams.map(t => ({ id: t.id, name: t.name, color: t.color, isAI: t.isAI, ownerId: t.ownerId, riders: t.riders })),
      board: this.board,
      riders: this.allRiders,
      finishColumn: this.board ? this.board.length : 0,
      currentRiderId: this.currentRider() ? this.currentRider().id : null,
      log: this.log.slice(-40),
      results: this.phase === 'results' ? this.resultsPayload() : null,
    };
  }
}
