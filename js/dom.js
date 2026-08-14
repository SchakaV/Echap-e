// dom.js — petits raccourcis DOM partagés par tous les modules de l'app.

export const $ = sel => document.querySelector(sel);
export const $all = sel => Array.from(document.querySelectorAll(sel));
