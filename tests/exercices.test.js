// Exercices du parcours « simon » de Labo Blocs : ils se corrigent comme prévu. Le moteur (simulateur, vérification)
// est testé dans le dépôt labo-blocs ; ici, ce qui compte pour le projet.
const test = require('node:test');
const assert = require('node:assert/strict');
const { valider, depuisBlockly, versBlockly } = require(require('../tools/dependances-tests.js').noyau);
const { chargerExercices, STANDARD, led, bouton, si, siSinon, prog } = require('./outils.js');

const exercices = chargerExercices();
const parId = Object.fromEntries(exercices.map((e) => [e.id, e]));
const copie = (x) => JSON.parse(JSON.stringify(x));

test('les 12 exercices sont chargés dans l’ordre ; le 12 est le défi', () => {
  assert.deepEqual(exercices.map((e) => e.id), Array.from({ length: 12 }, (_, k) => String(k + 1)));
  assert.deepEqual(exercices.filter((e) => e.defi).map((e) => e.id), ['12']);
});

test('console Simon dès l’exercice 3, avec les 4 LED et les 4 boutons dans l’ordre bleu, vert, jaune, rouge', () => {
  for (const ex of exercices.filter((e) => Number(e.id) >= 3)) {
    assert.equal(ex.illustration, 'simon', `exercice ${ex.id}`);
    assert.deepEqual(ex.composants.filter((c) => c.type === 'led').map((c) => c.broche), STANDARD.map((c) => c.led));
    assert.deepEqual(ex.composants.filter((c) => c.type === 'bouton').map((c) => c.broche), STANDARD.map((c) => c.bouton));
  }
});

for (const ex of exercices) {
  test(`exercice ${ex.id} : la solution de référence réussit, aussi après un passage par Blockly`, () => {
    assert.equal(valider(ex, ex.solutionReference).reussi, true);
    const { programme, horsProgramme, incomplets } = depuisBlockly(versBlockly(ex.solutionReference));
    assert.deepEqual(horsProgramme, []);
    assert.deepEqual(incomplets, []);
    assert.equal(valider(ex, programme).reussi, true);
  });
  test(`exercice ${ex.id} : le départ ne réussit pas tout seul ; jamais « faux » ni « erreur » de l’élève`, () => {
    const r = valider(ex, ex.blocsDepart || prog());
    assert.equal(r.reussi, false);
    assert.ok(!/tu as faux|faux\b/i.test(r.message), r.message);
  });
}

test('chaque exercice de 6 à 12 reprend le programme de l’exercice précédent', () => {
  for (let n = 6; n <= 12; n++) assert.equal(parId[String(n)].reprendreProgramme, `simon-${String(n - 1).padStart(2, '0')}`);
});

test('exercice 1 : la LED sur une autre broche est décrite, sans donner la réponse', () => {
  const r = valider(parId['1'], prog([led('D2', 1)]));
  assert.equal(r.reussi, false);
  assert.match(r.message, /la LED bleue \(D3\) devrait être allumée/);
});

test('exercice 3 : deux couleurs inversées (bouton vert → LED jaune) sont signalées', () => {
  const p = prog([], STANDARD.map((c, k) => siSinon(bouton(c.bouton), [led(STANDARD[k === 1 ? 2 : k].led, 1)], [led(STANDARD[k === 1 ? 2 : k].led, 0)])));
  const r = valider(parId['3'], p);
  assert.equal(r.reussi, false);
  assert.match(r.message, /bouton vert \(D4\)/);
});

test('exercice 11 : une autre séquence de 6 couleurs ou plus réussit (la vérification lit la liste de l’équipe)', () => {
  const p = copie(parId['11'].solutionReference);
  p.fils[0].corps[0].valeurs = [2, 2, 4, 1, 3, 1, 4];
  assert.equal(valider(parId['11'], p).reussi, true);
  p.fils[0].corps[0].valeurs = [1, 2, 3];
  assert.match(valider(parId['11'], p).message, /au moins 6 nombres/);
});

test('exercice 2 : « si » sans « sinon » laisse la LED allumée, ce qui est décrit', () => {
  const r = valider(parId['2'], prog([], [si(bouton('D2'), [led('D3', 1)])]));
  assert.equal(r.reussi, false);
  assert.match(r.message, /la LED bleue \(D3\) devrait être éteinte/);
});
