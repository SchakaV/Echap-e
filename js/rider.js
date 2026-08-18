// rider.js — coureurs & spécialisations

export const SPECIALIZATIONS = {
  grimpeur: {
    key: 'grimpeur',
    label: 'Grimpeur',
    short: 'GRI',
    desc: '+2 en montagne, +1 en vallon.',
    terrainBonus: { plaine: 0, vallon: 1, montagne: 2 },
  },
  sprinteur: {
    key: 'sprinteur',
    label: 'Sprinteur',
    short: 'SPR',
    desc: '+1 en plaine. Si le jet l\'amène à portée des 4 dernières cases, avance de 3 cases de plus. -1 en montagne.',
    terrainBonus: { plaine: 1, vallon: 0, montagne: -1 },
    sprintBonus: 3,
  },
  baroudeur: {
    key: 'baroudeur',
    label: 'Baroudeur',
    short: 'BAR',
    desc: '+2 s\'il est seul en tête (échappée). +1 pour faire rouler le groupe s\'il est en tête d\'un groupe de poursuivants ou de retardataires d\'au moins 2 coureurs (acquis en fin de manche, utilisable la manche suivante — comme l\'aspiration). En contre-la-montre, ces deux bonus sont remplacés par +1 en plaine.',
    terrainBonus: { plaine: 0, vallon: 0, montagne: 0 },
    breakawayBonus: 2,
    // En contre-la-montre, le baroudeur échange son bonus d'échappée contre
    // un bonus de plaine (+1), puisqu'il roule seul contre la montre.
    ttPlaineBonus: 1,
  },
  puncheur: {
    key: 'puncheur',
    label: 'Puncheur',
    short: 'PUN',
    desc: '+1 en vallon.',
    terrainBonus: { plaine: 0, vallon: 1, montagne: 0 },
  },
  rouleur: {
    key: 'rouleur',
    label: 'Rouleur',
    short: 'ROU',
    desc: '+1 en plaine et en vallon.',
    terrainBonus: { plaine: 1, vallon: 1, montagne: 0 },
  },
};

let riderIdCounter = 1;

export function createRider({ name, teamId, teamColor, specKey, isAI }) {
  return {
    id: riderIdCounter++,
    name,
    teamId,
    teamColor,
    spec: SPECIALIZATIONS[specKey],
    isAI: !!isAI,
    column: 0,
    lane: 0,
    draftBonus: 0,
    // bonus baroudeur « faire rouler le groupe » — acquis en fin de manche,
    // consommé à la manche suivante (même principe que draftBonus ci-dessus).
    groupLeadBonus: 0,
    groupBonusName: null,
    finished: false,
    finishRound: null,
    finishRank: null,
    // manche à laquelle le coureur a atteint sa case actuelle — sert à
    // départager l'ordre de jeu entre coureurs à égalité de position.
    // manche à laquelle le coureur a atteint sa case actuelle (indicatif) —
    // le vrai départage de l'ordre de jeu se fait via arrivedSeq ci-dessous.
    arrivedRound: 0,
    // compteur global de déplacements : incrémenté à CHAQUE coup joué par
    // n'importe quel coureur (pas seulement à chaque manche), pour départager
    // deux coureurs arrivés sur la même case pendant la même manche selon qui
    // y est vraiment arrivé le premier.
    arrivedSeq: 0,
    // nombre de manches consécutives passées juste derrière un coéquipier —
    // sert au bonus de protection contre le vent (voir engine.js).
    teammateDraftStreak: 0,
    // manche de départ personnelle (contre-la-montre uniquement — les
    // coureurs ne partent pas tous à la même manche).
    startRound: null,
    // classement général (course par étapes) : temps cumulé = somme des rangs/rounds
    totalPoints: 0,
  };
}
