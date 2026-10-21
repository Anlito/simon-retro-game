const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../site/js/moteur/progression.js');
const K = require('../site/js/moteur/classe.js');
const { classeurXlsx, crc32 } = require('../site/js/moteur/xlsx.js');

function equipe(eleves, classe, modifieLe, reussis) {
  const d = P.creerProgression({ eleves, classe });
  for (const id of reussis || []) P.noterVerification(d, id, { reussi: true });
  d.modifieLe = modifieLe;
  return { nom: P.nomEquipe(eleves) + '.json', texte: JSON.stringify(d) };
}

test('fusion : le fichier le plus récent d’une équipe est gardé, les invalides listés', () => {
  const r = K.fusionnerEquipes([
    equipe(['Léa', 'Hugo'], '5A', '2026-10-12T09:00:00', ['1']),
    equipe(['Lea', 'hugo'], '5A', '2026-10-12T10:00:00', ['1', '2']),
    equipe(['Léa', 'Hugo'], '5B', '2026-10-12T08:00:00'),
    { nom: 'notes.json', texte: '{"application":"autre"}' },
    { nom: 'casse.json', texte: '{' },
  ]);
  assert.equal(r.equipes.length, 2, 'même prénoms dans deux classes : deux équipes');
  const a = r.equipes.find((e) => e.donnees.equipe.classe === '5A');
  assert.equal(P.avancement(a.donnees), 2, 'la version de 10:00 est gardée');
  assert.equal(a.autres.length, 1, 'le doublon est signalé');
  assert.deepEqual(r.invalides.map((i) => i.nom), ['notes.json', 'casse.json']);
});

test('résumé, alerte « bloqué » à seuils réglables, taux de réussite', () => {
  const d = P.creerProgression({ eleves: ['Inès'], classe: '5A' });
  P.noterVerification(d, '1', { reussi: true });
  for (let i = 0; i < 6; i++) P.noterVerification(d, '2', { reussi: false, message: 'm' + i });
  const r = K.resumerEquipe(d);
  assert.equal(r.cellules['1'].statut, 'reussi');
  assert.equal(r.cellules['2'].tentatives, 6);
  assert.equal(r.cellules['2'].bloque, true);
  assert.equal(r.bloque, true);
  assert.equal(K.resumerEquipe(d, { tentatives: 10, minutes: 20 }).bloque, false);
  d.exercices['2'].tempsPasseSecondes = 21 * 60;
  assert.equal(K.resumerEquipe(d, { tentatives: 10, minutes: 20 }).bloque, true);
  const autre = K.resumerEquipe(P.creerProgression({ eleves: ['Tom'], classe: '5A' }));
  assert.equal(K.tauxReussite([r, autre])['1'], 0.5);
});

test('tableau, détail pour la notation et CSV pour Excel (point-virgule, BOM)', () => {
  const d = P.creerProgression({ eleves: ['Léa', 'Hugo'], classe: '5A' });
  P.noterVerification(d, '1', { reussi: false, message: 'Au bout de 1 s, le moteur Axe X (D5) devrait être à 90°; "test"' });
  P.noterIndice(d, '1', 2);
  P.noterVerification(d, '1', { reussi: true });
  const t = K.tableauClasse([K.resumerEquipe(d)]);
  assert.equal(t.entete.length, 2 + 12 + 5, '2 colonnes, 12 exercices (défi compris), 5 colonnes de synthèse');
  assert.ok(t.entete.includes('★ 1er coup'));
  assert.equal(t.lignes[0][2], '✓ 2');
  assert.equal(t.lignes[1][1], 'Taux de réussite');
  const det = K.detailClasse([{ donnees: d }]);
  assert.deepEqual(det.lignes[0].slice(2, 7), ['1', 'réussi', 2, 1, 2]);
  const texte = K.enCsv(det.entete, det.lignes);
  assert.ok(texte.startsWith('﻿Classe;Équipe;'));
  assert.ok(texte.includes('"Au bout de 1 s, le moteur Axe X (D5) devrait être à 90°; ""test"""'));
});

test('fichier Excel : un ZIP valide avec les feuilles demandées', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  const x = classeurXlsx([
    { nom: 'Classe', entete: ['A', 'B'], lignes: [['Léa & Hugo', 3]] },
    { nom: 'Détail', entete: ['C'], lignes: [['<x>']] },
  ]);
  assert.equal(x[0], 0x50);
  assert.equal(x[1], 0x4b);
  const texte = new TextDecoder().decode(x);
  assert.ok(texte.includes('xl/worksheets/sheet2.xml'));
  assert.ok(texte.includes('Léa &amp; Hugo'));
  assert.ok(texte.includes('<v>3</v>'));
  assert.ok(texte.includes('&lt;x&gt;'));
});

test('alertes de la classe : équipe et exercice, avec la raison', () => {
  const d = P.creerProgression({ eleves: ['Noah', 'Jade'], classe: '5A' });
  P.noterVerification(d, '1', { reussi: true });
  for (let i = 0; i < 6; i++) P.noterVerification(d, '2', { reussi: false, message: 'm' });
  const f = K.fusionnerEquipes([{ nom: 'n.json', texte: JSON.stringify(d) }]);
  const a = K.alertesClasse(f.equipes);
  assert.equal(a.length, 1);
  assert.equal(a[0].id, '2');
  assert.equal(a[0].equipe, 'Noah, Jade');
  assert.match(a[0].raison, /6 tentatives/);
  assert.equal(K.alertesClasse(f.equipes, { tentatives: 10, minutes: 20 }).length, 0);
  d.exercices['2'].tempsPasseSecondes = 25 * 60;
  const b = K.alertesClasse(K.fusionnerEquipes([{ nom: 'n.json', texte: JSON.stringify(d) }]).equipes, { tentatives: 10, minutes: 20 });
  assert.match(b[0].raison, /25 min sur l’exercice/);
});
