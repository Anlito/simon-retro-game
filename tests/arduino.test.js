// Code Arduino du niveau 3 (panneau « Code ») : traduction des blocs du Simon en C++.
// (Le programme de l'élève part dans la carte en code octet : voir le module Labo Blocs, mode « Dans la carte ».)
const test = require('node:test');
const assert = require('node:assert/strict');
const LB = require(require('../tools/dependances-tests.js').noyau);
const { chargerExercices } = require('./outils.js');

const exercices = chargerExercices();
const code = (id) => {
  const ex = exercices.find((e) => e.id === id);
  return LB.versArduino(ex.solutionReference, { composants: ex.composants, boutonsVersMasse: true }).code;
};

test('« Mon Simon » traduit en Arduino : la liste, ses « - 1 », les fonctions, le standard D2 à D10', () => {
  const c = code('11');
  for (const attendu of ['struct Liste {', 'return l.elements[i - 1];', 'void allumer(float couleur);', 'void lire_bouton();', 'tone(10, ', 'pinMode(2, INPUT_PULLUP);', 'pinMode(9, OUTPUT);']) {
    assert.ok(c.includes(attendu), attendu);
  }
});

test('le défi au hasard : random et liste vidée en cas d’erreur', () => {
  const c = code('12');
  assert.ok(c.includes('random(1, 4 + 1)'));
  assert.ok(c.includes('vider(sequence);'));
});
