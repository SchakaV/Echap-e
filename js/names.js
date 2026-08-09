// names.js — prénoms tirés au sort pour les coureurs

const FIRST_NAMES = [
  'Antoine', 'Julien', 'Thomas', 'Nicolas', 'Romain', 'Kevin', 'Alexandre', 'Maxime',
  'Florian', 'Benjamin', 'Guillaume', 'Jérôme', 'Vincent', 'Damien', 'Cédric', 'Mathieu',
  'Quentin', 'Loïc', 'Simon', 'Baptiste', 'Louis', 'Hugo', 'Lucas', 'Nathan',
  'Enzo', 'Rayan', 'Adam', 'Gabriel', 'Arthur', 'Jules', 'Léo', 'Tom',
  'Ethan', 'Noah', 'Sacha', 'Camille', 'Chloé', 'Emma', 'Léa', 'Manon',
  'Julie', 'Sarah', 'Laura', 'Marie', 'Claire', 'Anna', 'Inès', 'Zoé',
  'Elise', 'Margaux',
];

/**
 * Tire un prénom au hasard, en évitant si possible les doublons déjà
 * utilisés (par exemple dans la même équipe).
 */
export function randomFirstName(exclude = []) {
  const pool = FIRST_NAMES.filter(n => !exclude.includes(n));
  const list = pool.length ? pool : FIRST_NAMES;
  return list[Math.floor(Math.random() * list.length)];
}
