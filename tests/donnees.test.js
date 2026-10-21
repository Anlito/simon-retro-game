// Les données du projet restent complètes et cohérentes : le parcours venu de Labo Blocs (exercices, fiches,
// lexique) et les fichiers modifiables par le professeur (site/donnees/).
const test = require('node:test');
const assert = require('node:assert/strict');
const LB = require(require('../tools/dependances-tests.js').noyau);
const { catalogue, projet, carnet, chargerDonnees } = require('../site/js/moteur/catalogue.js');
const K = require('../site/js/moteur/carnet.js');
const { chargerExercices, STANDARD } = require('./outils.js');

const exercices = chargerExercices();
const { fiches, lexique } = catalogue.paquet();

test('identité du projet : un seul fichier, lu partout', () => {
  assert.equal(projet.id, 'simon-retro-game');
  assert.equal(projet.parcours, catalogue.paquet().id);
  assert.equal(projet.dossier, 'SIMON RETRO GAME');
});

test('le parcours de Labo Blocs est complet : 12 exercices, identifiants stables, aucun problème', () => {
  const paquet = catalogue.paquet();
  assert.deepEqual(LB.controler(paquet.brut), []);
  assert.equal(paquet.id, 'simon');
  assert.deepEqual(exercices.map((e) => e.idParcours), Array.from({ length: 12 }, (_, k) => 'simon-' + String(k + 1).padStart(2, '0')));
  assert.deepEqual(paquet.modes, ['simulateur', 'carte']);
});

test('chaque exercice a deux indices écrits et une fiche « À savoir »', () => {
  for (const ex of exercices) {
    assert.equal((ex.indices || []).length, 2, `exercice ${ex.id} : indices 1 et 2`);
    for (const t of ex.indices) assert.ok(t.length > 10, `exercice ${ex.id} : indice trop court`);
    assert.ok(fiches[ex.aSavoir], `exercice ${ex.id} : fiche ${ex.aSavoir} absente`);
  }
});

test('le lexique contient les mots du projet, en deux phrases au plus', () => {
  const mots = lexique.map((e) => e.mot.toLowerCase());
  for (const m of ['broche', 'capteur', 'actionneur', 'fréquence', 'fonction', 'paramètre', 'liste', 'variable', 'algorithme']) {
    assert.ok(mots.some((x) => x.includes(m)), `mot absent : ${m}`);
  }
  for (const e of lexique) {
    const phrases = e.definition.split(/[.!?](\s|$)/).filter((p) => p && p.trim().length > 1);
    assert.ok(phrases.length <= 2, `« ${e.mot} » : ${phrases.length} phrases`);
  }
});

test('carnet : chaque onglet renvoie à des parties qui existent, chaque partie est dans un onglet', () => {
  const ids = carnet.parties.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, 'identifiants en double');
  const dansOnglets = carnet.onglets.flatMap((o) => o.parties);
  for (const id of dansOnglets) assert.ok(ids.includes(id), `partie inconnue : ${id}`);
  for (const id of ids) assert.ok(dansOnglets.includes(id), `partie dans aucun onglet : ${id}`);
  const types = ['info', 'classement', 'trous', 'questions', 'tableau', 'cases', 'choix', 'echelle', 'image', 'fichier', 'programmation'];
  for (const p of carnet.parties) assert.ok(types.includes(p.type), `${p.id} : type ${p.type}`);
});

test('carnet : chaque case à compléter a sa réponse dans la liste des choix', () => {
  for (const p of carnet.parties.filter((x) => x.type === 'trous')) {
    const trous = K.trousDe(p);
    assert.ok(trous.length, `${p.id} : aucune case`);
    for (const t of trous) assert.ok(p.choix.includes(t.reponse), `${p.id} : « ${t.reponse} » absent des choix`);
  }
  for (const p of carnet.parties.filter((x) => x.type === 'classement')) {
    const cles = p.colonnes.map((c) => c.cle);
    for (const e of p.elements) assert.ok(cles.includes(e.place), `${p.id} : ${e.nom}`);
  }
});

test('carnet : les branchements sont le standard D2 à D10, celui des programmes du parcours', () => {
  const p = carnet.parties.find((x) => x.id === 'branchements');
  const reponses = {};
  for (const l of p.lignes) {
    for (const morceau of l.split(' · ')) {
      const t = K.trousDe({ lignes: [morceau] })[0];
      if (t) reponses[morceau.split('→')[0].trim()] = t.reponse;
    }
  }
  for (const c of STANDARD) {
    assert.equal(reponses[`Bouton ${c.nom}`], c.bouton, `bouton ${c.nom}`);
    assert.equal(reponses[`LED ${c.fem}`], c.led, `LED ${c.fem}`);
  }
  assert.equal(reponses['Buzzer (fil de signal)'], 'D10');
  // « Mon Simon » (exercice final) : mêmes broches que le carnet et le tutoriel.
  const final = exercices.find((e) => e.id === '11');
  for (const c of STANDARD) {
    assert.equal(final.composants.find((x) => x.type === 'bouton' && x.nom === c.nom).broche, c.bouton);
    assert.equal(final.composants.find((x) => x.type === 'led' && x.nom === c.fem).broche, c.led);
  }
  assert.equal(final.composants.find((x) => x.type === 'buzzer').broche, 'D10');
});

test('carnet : l’affiche et la fiche explicative se déposent en PDF, sous un nom différent', () => {
  const depots = carnet.parties.filter((p) => p.type === 'fichier');
  assert.deepEqual(depots.map((p) => p.id), ['affiche', 'fiche-explicative']);
  assert.equal(new Set(depots.map((p) => p.prefixe)).size, 2);
  for (const p of depots) assert.equal(p.extension, '.pdf');
});

test('barème : chaque étape est notée (analyse, boîtier 3D, affiche, programmation), avec des parties qui existent', () => {
  const b = chargerDonnees('notation', 'definirBareme');
  for (const id of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']) assert.ok(b.coefficients[id] > 0, `exercice ${id}`);
  assert.equal(b.coefficients['12'], undefined, 'le défi est un bonus');
  for (const id of Object.keys(b.carnet)) {
    const p = carnet.parties.find((x) => x.id === id);
    assert.ok(p, `partie inconnue : ${id}`);
    assert.equal(p.note, true, `${id} : « note » absent dans le carnet`);
  }
  const onglet = (id) => carnet.onglets.find((o) => o.parties.includes(id)).cle;
  const etapes = new Set(Object.keys(b.carnet).map(onglet));
  for (const e of ['analyse', 'boitier', 'affiche']) assert.ok(etapes.has(e), `étape non notée : ${e}`);
});

test('tutoriel de câblage : il lit le même standard que le carnet et les exercices', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const page = fs.readFileSync(path.join(__dirname, '../site/tuto-cablage.html'), 'utf8');
  assert.ok(page.includes('<script src="donnees/cablage.js"></script>'));
  assert.equal((page.match(/<section class="etape"/g) || []).length, 5);
  assert.ok(!/https?:\/\//.test(page.replace(/<svg[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, '')), 'aucune ressource en ligne');
  assert.equal(require('../site/donnees/cablage.js').buzzer, 'D10');
});
