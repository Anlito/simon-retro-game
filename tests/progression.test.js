// Progression d'une équipe : le travail des exercices est rangé par Labo Blocs dans la rubrique « programmation »
// (identifiants stables « simon-01 »…) ; le carnet, l'outil du professeur et la notation le lisent par numéro.
const test = require('node:test');
const assert = require('node:assert/strict');
const LB = require(require('../tools/dependances-tests.js').noyau);
const P = require('../site/js/moteur/progression.js');
const { catalogue } = require('../site/js/moteur/catalogue.js');

const paquet = catalogue.paquet();
const ex = (numero) => paquet.exercices.find((e) => e.numero === numero);
const nouvelle = () => P.creerProgression({ eleves: ['  léa ', 'Hugo', ''], classe: '5A' });
// Une vérification, comme l'écran d'exercice de Labo Blocs la note.
const verifier = (d, numero, reussi, message) => LB.noterVerification(d, ex(numero), { reussi, message: message || '', programme: null });

test('nom de l’équipe : prénoms joints par « _ », première lettre en majuscule', () => {
  assert.equal(P.nomEquipe(['léa', ' hugo ', '']), 'Léa_Hugo');
  assert.equal(P.nomEquipe(['Anne Marie', 'Inès/']), 'Anne-Marie_Inès');
  assert.equal(P.simplifierNom('LEA_hugo'), P.simplifierNom('Léa_Hugo'));
});

test('une nouvelle équipe : format 2, rubrique « programmation » reliée au parcours', () => {
  const d = nouvelle();
  assert.equal(d.application, 'simon-retro-game');
  assert.equal(d.formatVersion, 2);
  assert.deepEqual(d.equipe, { eleves: ['Léa', 'Hugo'], classe: '5A' });
  assert.match(d.creeLe, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  assert.equal(d.programmation.format, 'labo-blocs/sauvegarde');
  assert.deepEqual(d.programmation.parcours, { id: 'simon', version: paquet.versionParcours });
  assert.deepEqual(d.exercices, {});
  assert.ok(d.carnet);
  // La vue par numéro n'est jamais écrite dans le fichier.
  const fichier = JSON.parse(JSON.stringify(d));
  assert.equal('exercices' in fichier, false);
});

test('le travail noté par Labo Blocs se lit par numéro (mêmes objets)', () => {
  const d = nouvelle();
  LB.noterOuverture(d, ex('4').id);
  assert.equal(d.exercices['4'].statut, 'en_cours');
  assert.equal(d.exerciceCourant, '4');
  verifier(d, '4', false, 'Au démarrage, la LED bleue (D3) devrait être allumée.');
  verifier(d, '4', true);
  const e = d.exercices['4'];
  assert.equal(e, d.programmation.exercices['simon-04']);
  assert.equal(e.tentatives, 2);
  assert.equal(e.statut, 'reussi');
  assert.deepEqual(e.historique.map((h) => [h.type, h.reussi]), [['verification', false], ['verification', true]]);
});

test('déblocage linéaire, défi après l’exercice final, avancement sur les 11 exercices obligatoires', () => {
  const d = nouvelle();
  assert.equal(P.estDebloque(d, '1'), true);
  assert.equal(P.estDebloque(d, '2'), false);
  for (const n of P.ORDRE_PARCOURS.slice(0, 10)) verifier(d, n, true);
  assert.equal(P.estDebloque(d, '11'), true);
  assert.equal(P.estDebloque(d, '12'), false);
  assert.equal(P.avancement(d), 10);
  verifier(d, '11', true);
  assert.equal(P.estDebloque(d, '12'), true);
  assert.equal(P.avancement(d), 11);
  verifier(d, '12', true);
  assert.equal(P.avancement(d), 11, 'le défi ne compte pas dans l’avancement');
  assert.equal(P.estDebloque(nouvelle(), '5', { toutDebloquer: true }), true);
});

test('reprise : exercice de la dernière fois, sinon le premier non réussi', () => {
  const d = nouvelle();
  verifier(d, '1', true);
  LB.noterOuverture(d, ex('2').id);
  assert.equal(P.exerciceAReprendre(d), '2');
  d.programmation.exerciceCourant = ex('5').id;
  assert.equal(P.exerciceAReprendre(d), '2');
});

test('exercice modifié par une mise à jour : « à revérifier », blocs et réussite gardés', () => {
  const d = nouvelle();
  verifier(d, '1', true);
  d.programmation.exercices['simon-01'].programme = { blocks: { languageVersion: 0, blocks: [{ type: 'demarrage' }] } };
  d.programmation.exercices['simon-01'].empreinte = 'version-precedente';
  const r = P.lireSauvegarde(JSON.stringify(d));
  assert.deepEqual(r.changes, ['1']);
  assert.deepEqual(r.donnees.exercicesModifies, ['1']);
  const e = r.donnees.exercices['1'];
  assert.equal(e.statut, 'reussi');
  assert.equal(e.aReverifier, true);
  assert.deepEqual(e.programme.blocks.blocks, [{ type: 'demarrage' }]);
  assert.equal(P.estDebloque(r.donnees, '2'), true, 'l’exercice suivant reste ouvert');
  assert.equal('exercicesModifies' in JSON.parse(JSON.stringify(r.donnees)), false);
});

test('données recopiées (programme ouvert depuis l’outil du professeur) : la vue est reposée', () => {
  const d = nouvelle();
  verifier(d, '1', true);
  const copie = P.relierDonnees(JSON.parse(JSON.stringify(d)));
  assert.equal(copie.exercices['1'].statut, 'reussi');
});

test('fichiers refusés sans rien écraser : autre application, version plus récente, illisible', () => {
  assert.equal(P.lireSauvegarde('pas du json').ok, false);
  assert.match(P.lireSauvegarde('{"application":"autre"}').raison, /autre application/);
  assert.match(P.lireSauvegarde('{"application":"simon-retro-game","formatVersion":3,"equipe":{"eleves":[]}}').raison, /plus récente/);
  const d = nouvelle();
  verifier(d, '1', true);
  const r = P.lireSauvegarde('﻿' + JSON.stringify(d));
  assert.equal(r.ok, true);
  assert.equal(r.donnees.exercices['1'].statut, 'reussi');
});
