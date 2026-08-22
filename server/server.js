// server.js — serveur multijoueur en ligne pour Échappée.
//
// Lancement : npm install && npm start   (dans ce dossier server/)
// Port par défaut : 8080 (variable d'environnement PORT pour changer).
//
// Ce serveur fait DEUX choses à la fois :
//  1) il sert le site du jeu lui-même (index.html, css/, js/) comme un
//     petit serveur web classique — ainsi, un ami n'a besoin de rien
//     d'autre qu'un navigateur : il ouvre l'adresse du serveur et le jeu
//     s'affiche, sans VSCode ni aucune installation ;
//  2) il arbitre les parties multijoueur via WebSocket (dés, déplacements,
//     classement — les clients ne font qu'afficher ce qu'il leur envoie).
//
// Chaque salle (room) a un code à 5 lettres/chiffres. Un client rejoint une
// salle existante avec ce code, ou en crée une nouvelle s'il n'en donne
// aucun.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { Room } from './game.js';
import { aiChooseCell } from '../js/ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(__dirname, '..'); // dossier velo-jeu/ (parent de server/)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

/** Petit serveur de fichiers statiques : sert index.html, css/ et js/
 *  depuis la racine du projet (le dossier au-dessus de server/). */
function serveStatic(req, res) {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';

  const filePath = path.normalize(path.join(SITE_ROOT, reqPath));
  // Sécurité : interdit de sortir du dossier du site.
  if (!filePath.startsWith(SITE_ROOT)) {
    res.writeHead(403); res.end('Interdit'); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Fichier introuvable.');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const PORT = process.env.PORT || 8080;
const httpServer = http.createServer(serveStatic);
const wss = new WebSocketServer({ server: httpServer });

const rooms = new Map(); // code -> Room
let clientIdCounter = 1;

function send(ws, msg) {
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function broadcastRoom(room) {
  const snap = room.snapshot();
  room.clients.forEach(ws => send(ws, { type: 'room', room: snap }));
}

function broadcast(room, msg) {
  room.clients.forEach(ws => send(ws, msg));
}

/** Fait avancer la boucle de course tant que c'est au tour d'une IA ; rend
 *  la main dès qu'un joueur humain doit lancer le dé. Un jeton de tour
 *  protège contre un double traitement si processTurn est relancé (ex :
 *  reconnexion) pendant qu'une IA est déjà en train de jouer. */
function processTurn(room) {
  if (!room.state || room.phase !== 'racing') return;
  room.turnToken = (room.turnToken || 0) + 1;
  const myTurnToken = room.turnToken;

  const rider = room.currentRider();
  if (!rider) {
    const finished = room.endRoundIfNeeded();
    broadcastRoom(room);
    if (!finished) setTimeout(() => processTurn(room), 350);
    return;
  }

  // Début de tour commun : préparation des effets de la manche précédente
  // puis d20 événement (chute collective, crevaison…), comme en solo.
  room.startOfTurn(rider);
  if (rider.eventCurrentImmobile) {
    // Immobilisé (problème de chaîne, chute…) : on journalise et on passe
    // au coureur suivant, sans jet de dé.
    room.applyImmobility(rider);
    broadcastRoom(room);
    setTimeout(() => processTurn(room), 350);
    return;
  }

  if (rider.isAI) {
    setTimeout(() => {
      if (room.phase !== 'racing' || room.turnToken !== myTurnToken) return;
      const { rollInfo, target } = room.rollDice(rider);
      broadcast(room, { type: 'diceRolled', riderId: rider.id, rollInfo, cells: target.cells, blocked: target.blocked, finishing: target.finishing });
      setTimeout(() => {
        if (room.phase !== 'racing' || room.turnToken !== myTurnToken) return;
        const cell = aiChooseCell(room.state, rider, target.cells);
        room.applyChoice(rider, rollInfo, target, cell.column, cell.lane);
        broadcastRoom(room);
        setTimeout(() => processTurn(room), 200);
      }, 550);
    }, 300);
  } else {
    // On attend l'action du joueur concerné (message 'rollDice').
    broadcastRoom(room);
  }
}

function getRoom(code) {
  return code ? rooms.get(String(code).toUpperCase()) : null;
}

wss.on('connection', (ws) => {
  const clientId = `c${clientIdCounter++}`;
  let room = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    try {
      switch (msg.type) {
        case 'join': {
          const name = String(msg.name || 'Joueur').slice(0, 20);
          const token = typeof msg.token === 'string' && msg.token ? msg.token : null;
          if (msg.code) {
            room = getRoom(msg.code);
            if (!room) { send(ws, { type: 'error', message: `Salle "${msg.code}" introuvable.` }); return; }
            if (room.phase !== 'lobby' && !(token && room.teams.some(t => t.ownerToken === token))) {
              send(ws, { type: 'error', message: 'La course a déjà commencé dans cette salle.' });
              return;
            }
          } else {
            room = new Room();
            rooms.set(room.code, room);
          }
          const assignedToken = room.addPlayer(clientId, ws, name, token);
          if (!assignedToken) {
            send(ws, { type: 'error', message: 'Impossible de rejoindre cette salle maintenant.' });
            room = null;
            return;
          }
          send(ws, { type: 'joined', clientId, code: room.code, token: assignedToken });
          broadcastRoom(room);
          if (room.phase === 'racing') processTurn(room);
          break;
        }

        case 'updateRoster':
          if (room) { room.updateRoster(clientId, msg.riders); broadcastRoom(room); }
          break;

        case 'updateColor':
          if (room) { room.updateColor(clientId, msg.color); broadcastRoom(room); }
          break;

        case 'updateConfig':
          if (room) { room.updateConfig(clientId, msg.config || {}); broadcastRoom(room); }
          break;

        case 'startRace':
          if (room) { room.startRace(clientId); broadcastRoom(room); processTurn(room); }
          break;

        case 'rollDice': {
          if (!room || !room.state) return;
          const rider = room.currentRider();
          if (!room.isClientsTurn(clientId, rider) || room.pendingRoll) return;
          const { rollInfo, target } = room.rollDice(rider);
          room.pendingRoll = { riderId: rider.id, rollInfo, target };
          broadcast(room, { type: 'diceRolled', riderId: rider.id, rollInfo, cells: target.cells, blocked: target.blocked, finishing: target.finishing });
          break;
        }

        case 'chooseCell': {
          if (!room || !room.state) return;
          const rider = room.currentRider();
          if (!room.isClientsTurn(clientId, rider)) return;
          if (!room.pendingRoll || room.pendingRoll.riderId !== rider.id) return;
          const { rollInfo, target } = room.pendingRoll;
          room.applyChoice(rider, rollInfo, target, msg.column, msg.lane);
          room.pendingRoll = null;
          broadcastRoom(room);
          setTimeout(() => processTurn(room), 250);
          break;
        }

        case 'backToLobby':
          if (room && clientId === room.hostId && room.phase === 'results') {
            room.phase = 'lobby';
            room.state = null;
            room.board = null;
            room.allRiders = null;
            room.teams = room.teams.filter(t => !t.isAI);
            room.teams.forEach(t => { delete t.riderObjs; });
            broadcastRoom(room);
          }
          break;

        default:
          break;
      }
    } catch (err) {
      send(ws, { type: 'error', message: err.message });
    }
  });

  ws.on('close', () => {
    if (room) {
      room.removePlayer(clientId);
      if (room.isEmpty()) {
        rooms.delete(room.code);
      } else {
        broadcastRoom(room);
        if (room.phase === 'racing') processTurn(room);
      }
    }
  });
});

console.log(`Échappée — serveur multijoueur en écoute sur le port ${PORT}`);
httpServer.listen(PORT);
