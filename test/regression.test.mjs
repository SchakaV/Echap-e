// test/regression.test.mjs
// Test de non-régression : verrouille le comportement actuel du moteur de jeu
// (bonus baroudeur, groupes, updateDraftBonuses, computeRoll) pour garantir
// qu'aucun refactor ne modifie le comportement en jeu.
//
// Exécuter : node test/regression.test.mjs

import assert from 'node:assert/strict';
import { createRider } from '../js/rider.js';
import { generateBoard } from '../js/board.js';
import { computeGroups } from '../js/groups.js';
import {
  createRaceState,
  createTimeTrialState,
  computeRoll,
  updateDraftBonuses,
  applyMove,
  resolveTarget,
  collectFeaturePoints,
} from '../js/engine.js';

let passed = 0;
function check(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    process.exitCode = 1;
  }
}

// Plateau tout plaine, longueur 60, largeur 3.
function freshBoard() {
  return generateBoard({ length: 60, width: 3, profile: 'plaine' });
}

// Place les coureurs et construit l'occupancy.
function place(state, placements) {
  for (const { rider, column, lane } of placements) {
    rider.column = column;
    rider.lane = lane;
    state.occupancy.set(`${column}-${lane}`, rider.id);
  }
}

console.log('--- Bonus baroudeur "faire rouler le groupe" ---');

check('Retardataires : baroudeur + grimpeur → baroudeur "faire rouler le groupe", autre "roule en groupe"', () => {
  const board = freshBoard();
  const riders = [
    createRider({ name: 'P1', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
    createRider({ name: 'P2', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
    createRider({ name: 'P3', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
    createRider({ name: 'P4', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
    createRider({ name: 'BAR', teamId: 2, teamColor: '#00f', specKey: 'baroudeur', isAI: true }),
    createRider({ name: 'GRIM', teamId: 2, teamColor: '#00f', specKey: 'grimpeur', isAI: true }),
  ];
  const state = createRaceState(board, riders);
  place(state, [
    { rider: riders[0], column: 20, lane: 0 },
    { rider: riders[1], column: 20, lane: 1 },
    { rider: riders[2], column: 20, lane: 2 },
    { rider: riders[3], column: 19, lane: 0 },
    { rider: riders[4], column: 5, lane: 0 }, // baroudeur retardataire
    { rider: riders[5], column: 5, lane: 1 }, // grimpeur retardataire
  ]);

  const groups = computeGroups(state);
  const retGroup = groups.find(g => g.type === 'retardataire');
  assert.ok(retGroup, 'un groupe retardataire doit exister');
  assert.equal(retGroup.count, 2);

  updateDraftBonuses(state);
  assert.equal(riders[4].groupLeadBonus, 1);
  assert.equal(riders[4].groupBonusName, 'faire rouler le groupe');
  assert.equal(riders[5].groupLeadBonus, 1);
  assert.equal(riders[5].groupBonusName, 'roule en groupe');
  // Le peloton ne reçoit aucun bonus.
  for (const r of riders.slice(0, 4)) {
    assert.equal(r.groupLeadBonus, 0);
    assert.equal(r.groupBonusName, null);
  }
});

check('Retardataires : baroudeur PAS en tête du groupe profite quand même', () => {
  const board = freshBoard();
  const riders = [
    createRider({ name: 'P1', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
    createRider({ name: 'P2', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
    createRider({ name: 'P3', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
    createRider({ name: 'P4', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
    createRider({ name: 'GRIM', teamId: 2, teamColor: '#00f', specKey: 'grimpeur', isAI: true }),
    createRider({ name: 'BAR', teamId: 2, teamColor: '#00f', specKey: 'baroudeur', isAI: true }),
  ];
  const state = createRaceState(board, riders);
  place(state, [
    { rider: riders[0], column: 20, lane: 0 },
    { rider: riders[1], column: 20, lane: 1 },
    { rider: riders[2], column: 20, lane: 2 },
    { rider: riders[3], column: 19, lane: 0 },
    { rider: riders[4], column: 6, lane: 0 }, // grimpeur en tête du groupe retardataire
    { rider: riders[5], column: 5, lane: 0 }, // baroudeur DERRIÈRE
  ]);

  updateDraftBonuses(state);
  assert.equal(riders[5].groupLeadBonus, 1, 'le baroudeur profite même pas en tête');
  assert.equal(riders[5].groupBonusName, 'faire rouler le groupe');
  assert.equal(riders[4].groupLeadBonus, 1, 'le grimpeur profite du baroudeur');
  assert.equal(riders[4].groupBonusName, 'roule en groupe');
});

check('Poursuivants : baroudeur en tête → "roule sur l\'échappée", autre coureur rien', () => {
  const board = freshBoard();
  const riders = [
    createRider({ name: 'Echap', teamId: 1, teamColor: '#f00', specKey: 'sprinteur', isAI: true }),
    createRider({ name: 'BAR-Pours', teamId: 2, teamColor: '#00f', specKey: 'baroudeur', isAI: true }),
    createRider({ name: 'GRIM-Pours', teamId: 2, teamColor: '#00f', specKey: 'grimpeur', isAI: true }),
    createRider({ name: 'Pelo1', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
    createRider({ name: 'Pelo2', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
    createRider({ name: 'Pelo3', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
    createRider({ name: 'Pelo4', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
  ];
  const state = createRaceState(board, riders);
  place(state, [
    { rider: riders[0], column: 35, lane: 0 }, // échappée
    { rider: riders[1], column: 25, lane: 0 }, // baroudeur poursuivant (tête)
    { rider: riders[2], column: 24, lane: 0 }, // grimpeur poursuivant
    { rider: riders[3], column: 10, lane: 0 }, // peloton
    { rider: riders[4], column: 10, lane: 1 },
    { rider: riders[5], column: 10, lane: 2 },
    { rider: riders[6], column: 9, lane: 0 },
  ]);

  const groups = computeGroups(state);
  const pursGroup = groups.find(g => g.type === 'poursuivant');
  assert.ok(pursGroup, 'un groupe poursuivant doit exister');
  assert.equal(pursGroup.count, 2);

  updateDraftBonuses(state);
  assert.equal(riders[1].groupLeadBonus, 1, 'baroudeur en tête de poursuivants');
  assert.equal(riders[1].groupBonusName, "roule sur l'échappée");
  assert.equal(riders[2].groupLeadBonus, 0, 'non-baroudeur poursuivant : pas de bonus');
  assert.equal(riders[2].groupBonusName, null);
});

check('Baroudeur seul (count=1) dans un groupe retardataire : pas de bonus', () => {
  const board = freshBoard();
  const riders = [
    createRider({ name: 'P1', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
    createRider({ name: 'P2', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
    createRider({ name: 'P3', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
    createRider({ name: 'BAR', teamId: 2, teamColor: '#00f', specKey: 'baroudeur', isAI: true }),
  ];
  const state = createRaceState(board, riders);
  place(state, [
    { rider: riders[0], column: 20, lane: 0 },
    { rider: riders[1], column: 20, lane: 1 },
    { rider: riders[2], column: 19, lane: 0 },
    { rider: riders[3], column: 5, lane: 0 }, // baroudeur seul retardataire
  ]);

  updateDraftBonuses(state);
  assert.equal(riders[3].groupLeadBonus, 0, 'baroudeur seul : count<2 → pas de bonus');
  assert.equal(riders[3].groupBonusName, null);
});

check('Fin de course (>= moitié arrivés) : tous les groupes sont retardataires', () => {
  const board = freshBoard();
  const riders = [
    createRider({ name: 'F1', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
    createRider({ name: 'F2', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
    createRider({ name: 'F3', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
    createRider({ name: 'BAR', teamId: 2, teamColor: '#00f', specKey: 'baroudeur', isAI: true }),
    createRider({ name: 'GRIM', teamId: 2, teamColor: '#00f', specKey: 'grimpeur', isAI: true }),
    createRider({ name: 'PUN', teamId: 2, teamColor: '#00f', specKey: 'puncheur', isAI: true }),
  ];
  const state = createRaceState(board, riders);
  // 3 arrivés (moitié de 6)
  riders[0].finished = true; riders[0].column = 65; riders[0].finishRank = 1;
  riders[1].finished = true; riders[1].column = 64; riders[1].finishRank = 2;
  riders[2].finished = true; riders[2].column = 63; riders[2].finishRank = 3;
  state.finishedCount = 3;
  place(state, [
    { rider: riders[3], column: 10, lane: 0 }, // baroudeur
    { rider: riders[4], column: 10, lane: 1 }, // grimpeur
    { rider: riders[5], column: 9, lane: 0 },  // puncheur
  ]);

  const groups = computeGroups(state);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].type, 'retardataire');
  assert.equal(groups[0].count, 3);

  updateDraftBonuses(state);
  assert.equal(riders[3].groupLeadBonus, 1);
  assert.equal(riders[3].groupBonusName, 'faire rouler le groupe');
  assert.equal(riders[4].groupLeadBonus, 1);
  assert.equal(riders[4].groupBonusName, 'roule en groupe');
  assert.equal(riders[5].groupLeadBonus, 1);
  assert.equal(riders[5].groupBonusName, 'roule en groupe');
});

check('CLM : aucun bonus de groupe (isTimeTrial)', () => {
  const board = freshBoard();
  const riders = [
    createRider({ name: 'BAR', teamId: 2, teamColor: '#00f', specKey: 'baroudeur', isAI: true }),
    createRider({ name: 'GRIM', teamId: 2, teamColor: '#00f', specKey: 'grimpeur', isAI: true }),
  ];
  const state = createRaceState(board, riders);
  // Force un état CLM-like : isTimeTrial true
  state.isTimeTrial = true;
  place(state, [
    { rider: riders[0], column: 10, lane: 0 },
    { rider: riders[1], column: 10, lane: 1 },
  ]);

  updateDraftBonuses(state);
  assert.equal(riders[0].groupLeadBonus, 0, 'CLM : pas de bonus groupe');
  assert.equal(riders[1].groupLeadBonus, 0);
});

console.log('\n--- computeRoll : consommation du bonus au tour suivant ---');

check('Bonus acquis en fin de manche N, consommé au jet de la manche N+1', () => {
  const board = freshBoard();
  const riders = [
    createRider({ name: 'P1', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
    createRider({ name: 'P2', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
    createRider({ name: 'P3', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
    createRider({ name: 'P4', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
    createRider({ name: 'BAR', teamId: 2, teamColor: '#00f', specKey: 'baroudeur', isAI: true }),
    createRider({ name: 'GRIM', teamId: 2, teamColor: '#00f', specKey: 'grimpeur', isAI: true }),
  ];
  const state = createRaceState(board, riders);
  state.round = 1;
  place(state, [
    { rider: riders[0], column: 20, lane: 0 },
    { rider: riders[1], column: 20, lane: 1 },
    { rider: riders[2], column: 20, lane: 2 },
    { rider: riders[3], column: 19, lane: 0 },
    { rider: riders[4], column: 5, lane: 0 },
    { rider: riders[5], column: 5, lane: 1 },
  ]);

  // Manche 1 : aucun bonus encore (groupLeadBonus initialisé à 0)
  for (const r of riders) {
    const ri = computeRoll(state, r);
    assert.equal(ri.groupLeadBonus, 0, `${r.name} manche 1 : pas de bonus`);
    assert.equal(ri.groupBonusName, null);
  }

  // Fin de manche 1 : calcul des bonus
  updateDraftBonuses(state);
  assert.equal(riders[4].groupLeadBonus, 1);
  assert.equal(riders[5].groupLeadBonus, 1);

  // Manche 2 : le bonus est consommé dans computeRoll
  state.round = 2;
  for (const r of riders.slice(4)) {
    const ri = computeRoll(state, r);
    assert.equal(ri.groupLeadBonus, 1, `${r.name} manche 2 : bonus consommé`);
    assert.ok(ri.groupBonusName, `${r.name} manche 2 : nom du bonus présent`);
  }
  // Le total inclut le bonus
  const barRoll = computeRoll(state, riders[4]);
  assert.equal(barRoll.total, Math.max(1, barRoll.roll + barRoll.groupLeadBonus));
});

check('computeRoll : le bonus groupe est inclus dans le total', () => {
  const board = freshBoard();
  const riders = [
    createRider({ name: 'BAR', teamId: 2, teamColor: '#00f', specKey: 'baroudeur', isAI: true }),
    createRider({ name: 'GRIM', teamId: 2, teamColor: '#00f', specKey: 'grimpeur', isAI: true }),
    createRider({ name: 'P1', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
    createRider({ name: 'P2', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
    createRider({ name: 'P3', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
    createRider({ name: 'P4', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
  ];
  const state = createRaceState(board, riders);
  place(state, [
    { rider: riders[0], column: 5, lane: 0 },
    { rider: riders[1], column: 5, lane: 1 },
    { rider: riders[2], column: 20, lane: 0 },
    { rider: riders[3], column: 20, lane: 1 },
    { rider: riders[4], column: 20, lane: 2 },
    { rider: riders[5], column: 19, lane: 0 },
  ]);
  updateDraftBonuses(state); // BAR et GRIM ont groupLeadBonus=1

  const ri = computeRoll(state, riders[0]); // baroudeur
  const expected = Math.max(1, ri.roll + ri.terrainBonus + ri.breakawayBonus + ri.draftBonus + ri.windBonus + ri.groupLeadBonus);
  assert.equal(ri.total, expected);
  assert.equal(ri.groupLeadBonus, 1);
});

console.log('\n--- updateDraftBonuses : aspiration (inchangée) ---');

check("L'aspiration derrière un coureur (même voie) donne draftBonus=1", () => {
  const board = freshBoard();
  const riders = [
    createRider({ name: 'A', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
    createRider({ name: 'B', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
  ];
  const state = createRaceState(board, riders);
  place(state, [
    { rider: riders[0], column: 10, lane: 0 }, // devant
    { rider: riders[1], column: 9, lane: 0 },  // derrière, même voie
  ]);
  updateDraftBonuses(state);
  assert.equal(riders[1].draftBonus, 1, 'le coureur derrière aspire');
  assert.equal(riders[0].draftBonus, 0, 'le coureur devant n aspire pas');
});

check("Protection du vent : 2 manches derrière un coéquipier → windBonus", () => {
  const board = freshBoard();
  const riders = [
    createRider({ name: 'A', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
    createRider({ name: 'B', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
  ];
  const state = createRaceState(board, riders);
  place(state, [
    { rider: riders[0], column: 10, lane: 0 },
    { rider: riders[1], column: 9, lane: 0 },
  ]);
  // Manche 1 : streak=1
  updateDraftBonuses(state);
  assert.equal(riders[1].teammateDraftStreak, 1);
  let ri = computeRoll(state, riders[1]);
  assert.equal(ri.windBonus, 0, '1 manche : pas encore de windBonus');
  // Fin manche 2 : streak=2 → windBonus actif au tour suivant
  updateDraftBonuses(state);
  assert.equal(riders[1].teammateDraftStreak, 2);
  ri = computeRoll(state, riders[1]);
  assert.equal(ri.windBonus, 1, '2 manches : windBonus actif');
});

console.log('\n--- computeGroups : classification ---');

check('Échappée + peloton + retardataires bien classés', () => {
  const board = freshBoard();
  const riders = [
    createRider({ name: 'E', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
    createRider({ name: 'P1', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
    createRider({ name: 'P2', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
    createRider({ name: 'P3', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
    createRider({ name: 'R1', teamId: 2, teamColor: '#00f', specKey: 'rouleur', isAI: true }),
    createRider({ name: 'R2', teamId: 2, teamColor: '#00f', specKey: 'rouleur', isAI: true }),
  ];
  const state = createRaceState(board, riders);
  place(state, [
    { rider: riders[0], column: 35, lane: 0 }, // échappée seul
    { rider: riders[1], column: 20, lane: 0 }, // peloton (3 coureurs)
    { rider: riders[2], column: 20, lane: 1 },
    { rider: riders[3], column: 20, lane: 2 },
    { rider: riders[4], column: 5, lane: 0 },  // retardataires (2)
    { rider: riders[5], column: 5, lane: 1 },
  ]);
  const groups = computeGroups(state);
  const types = groups.map(g => g.type);
  assert.ok(types.includes('echappee'));
  assert.ok(types.includes('peloton'));
  assert.ok(types.includes('retardataire'));
  const peloton = groups.find(g => g.type === 'peloton');
  assert.equal(peloton.count, 3);
});

console.log('\n--- collectFeaturePoints : pas de points de col en contre-la-montre ---');

check('Course normale : franchir un col rapporte des points au pois', () => {
  const board = freshBoard();
  board.features = [
    { type: 'climb', columnStart: 10, columnEnd: 12, category: 1, name: 'Col de test' },
  ];
  const riders = [
    createRider({ name: 'A', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
    createRider({ name: 'B', teamId: 2, teamColor: '#00f', specKey: 'rouleur', isAI: true }),
  ];
  const state = createRaceState(board, riders);
  place(state, [
    { rider: riders[0], column: 5, lane: 0 },
    { rider: riders[1], column: 5, lane: 1 },
  ]);
  applyMove(state, riders[0], 15, 0, { total: 10 });
  applyMove(state, riders[1], 15, 1, { total: 10 });
  const fp = collectFeaturePoints(state);
  assert.ok(fp.get(riders[0].id).polka > 0, 'le 1er au sommet doit toucher des points de pois');
});

check('Contre-la-montre par équipe : franchir un col ne rapporte AUCUN point (pas de maillot à pois en CLM)', () => {
  const board = freshBoard();
  board.features = [
    { type: 'climb', columnStart: 10, columnEnd: 12, category: 1, name: 'Col de test' },
  ];
  const riders = [
    createRider({ name: 'A', teamId: 1, teamColor: '#f00', specKey: 'rouleur', isAI: true }),
  ];
  const state = createTimeTrialState(board, riders, riders);
  state.riders.forEach(r => { r.column = 5; r.lane = 0; });
  applyMove(state, riders[0], 15, 0, { total: 10 });
  const fp = collectFeaturePoints(state);
  assert.equal(fp.size, 0, 'aucun point de feature ne doit être distribué en contre-la-montre');
});

console.log(`\n=== ${passed} test(s) passé(s) ===`);
