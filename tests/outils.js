// Outils communs aux tests : chargement des exercices, standard de câblage et petits constructeurs de programmes.
const { catalogue } = require('../site/js/moteur/catalogue.js');

// Exercices du parcours de Labo Blocs (parcours « simon »), au format de l'atelier (id = numéro).
function chargerExercices() {
  return catalogue.exercices();
}

// Standard de câblage de la console Simon (site/donnees/cablage.js : le tutoriel de câblage le montre).
const STANDARD = require('../site/donnees/cablage.js').couleurs;

// Constructeurs d'instructions et d'expressions.
const att = (duree) => ({ bloc: 'attendre', duree });
const led = (broche, etat) => ({ bloc: 'led_etat', broche, etat });
const son = (frequence, duree) => ({ bloc: 'son', broche: 'D10', frequence, duree });
const bouton = (broche) => ({ bloc: 'bouton_etat', broche });
const variable = (nom) => ({ bloc: 'variable', variable: nom });
const affecter = (nom, valeur) => ({ bloc: 'affecter', variable: nom, valeur });
const comparer = (op, a, b) => ({ bloc: 'comparaison', op, a, b });
const si = (condition, alors) => ({ bloc: 'si_alors', condition, alors });
const siSinon = (condition, alors, sinon) => ({ bloc: 'si_sinon', condition, alors, sinon });
const prog = (demarrage, boucle) => ({ demarrage: demarrage || [], boucle: boucle || [] });

module.exports = { chargerExercices, STANDARD, att, led, son, bouton, variable, affecter, comparer, si, siSinon, prog };
