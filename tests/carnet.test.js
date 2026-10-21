// Carnet de projet : réponses, corrections, états et avancement, d'après donnees/carnet.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const K = require('../site/js/moteur/carnet.js');
const P = require('../site/js/moteur/progression.js');
const { carnet: C } = require('../site/js/moteur/catalogue.js');

const partie = (id) => K.partieCarnet(C, id);

test('niveau de la classe : 5A → 5, 4D1 → 4 ; le carnet du Simon est le même en 5e et en 4e', () => {
  assert.equal(K.niveauDe('5A'), '5');
  assert.equal(K.niveauDe('4D1'), '4');
  assert.equal(K.niveauDe(''), null);
  const tout = K.partiesSuivies(C, null).length;
  assert.equal(K.partiesSuivies(C, '5').length, tout);
  assert.equal(K.partiesSuivies(C, '4').length, tout);
});

test('cases à compléter : justes, à revoir, vides ; le message ne donne jamais la réponse', () => {
  const k = K.carnetVide();
  const p = partie('fonctionnement');
  const r = K.reponseCarnet(k, p);
  r['0.0'] = 'bouton';
  r['0.1'] = 'boîtier';
  r['1.0'] = 'séquence';
  const c = K.corrigerPartie(k, p);
  assert.equal(c.total, 5);
  assert.equal(c.bien, 2);
  assert.deepEqual(c.mal, ['0.1']);
  assert.deepEqual(c.vides, ['2.0', '2.1']);
  assert.equal(c.message, '2 cases sur 5 sont justes. 1 case est à revoir et 2 cases sont encore vides.');
  assert.ok(!/Arduino|LED|buzzer/.test(c.message));
  for (const t of K.trousDe(p)) r[t.cle] = t.reponse;
  assert.equal(K.corrigerPartie(k, p).reussi, true);
});

test('classement : bien placés, mal placés, non placés', () => {
  const k = K.carnetVide();
  const p = partie('classement');
  const r = K.reponseCarnet(k, p);
  r['Bouton poussoir'] = 'capteur';
  r['Carte Arduino Uno'] = 'actionneur';
  const c = K.corrigerPartie(k, p);
  assert.equal(c.bien, 1);
  assert.deepEqual(c.mal, ['Carte Arduino Uno']);
  assert.equal(c.nonPlaces.length, p.elements.length - 2);
  for (const e of p.elements) r[e.nom] = e.place;
  assert.equal(K.corrigerPartie(k, p).reussi, true);
});

test('élément renommé : la réponse placée sous l’ancien nom est reprise', () => {
  const C2 = JSON.parse(JSON.stringify(C));
  const p = C2.parties.find((x) => x.id === 'classement');
  p.elements[0].ancienNom = p.elements[0].nom;
  p.elements[0].nom = 'Bouton de la console';
  const k = K.carnetVide();
  k.reponses.classement = { [p.elements[0].ancienNom]: 'capteur' };
  K.harmoniserCarnet(k, C2);
  assert.deepEqual(k.reponses.classement, { 'Bouton de la console': 'capteur' });
});

test('états : questions, tableau (au moins une ligne pleine), cases, échelle', () => {
  const k = K.carnetVide();
  const q = partie('page-de-garde');
  assert.equal(K.etatPartie(k, q), 'a_faire');
  K.reponseCarnet(k, q)[0] = 'Rétro Studio';
  assert.equal(K.etatPartie(k, q), 'en_cours');
  K.reponseCarnet(k, q)[1] = 'La mémoire, c’est un jeu';
  K.reponseCarnet(k, q)[2] = 'Léa et Hugo';
  assert.equal(K.etatPartie(k, q), 'fait');

  // Relevé de dimensions : la première colonne (le composant) est déjà écrite.
  const t = partie('dimensions');
  K.reponseCarnet(k, t)[0][1] = '12';
  assert.equal(K.etatPartie(k, t), 'en_cours');
  K.reponseCarnet(k, t)[0].splice(1, 4, '12', '12', '7,5', 'pied à coulisse');
  assert.equal(K.etatPartie(k, t), 'fait');

  const c = partie('avant-usb');
  K.reponseCarnet(k, c).fill(true);
  assert.equal(K.etatPartie(k, c), 'fait');

  const e = partie('autoevaluation');
  for (const l of e.lignes) K.reponseCarnet(k, e)[l] = 1;
  assert.equal(K.etatPartie(k, e), 'fait');
});

test('images : à faire, en cours, puis fait quand le nombre attendu est collé', () => {
  const k = K.carnetVide();
  const p = partie('modele-3d');
  assert.equal(p.nombre, 2);
  assert.equal(K.etatPartie(k, p), 'a_faire');
  const image = { nom: 'Capture', date: '2026-10-21T10:00:00', donnees: 'data:image/jpeg;base64,AAAA' };
  K.reponseCarnet(k, p).images.push(image);
  assert.equal(K.etatPartie(k, p), 'en_cours');
  K.reponseCarnet(k, p).images.push(image);
  assert.equal(K.etatPartie(k, p), 'fait');
  assert.equal(K.etatPartie(k, partie('logo')), 'a_faire');
});

test('fichier déposé : fait dès que le PDF est dans le dossier de l’équipe ; seul son nom est gardé', () => {
  const k = K.carnetVide();
  const p = partie('affiche');
  assert.deepEqual(K.reponseCarnet(k, p), { nom: '', date: '', taille: 0 });
  assert.equal(K.etatPartie(k, p), 'a_faire');
  Object.assign(K.reponseCarnet(k, p), { nom: 'Affiche_Lea_Hugo.pdf', date: '2026-10-21T10:00:00', taille: 812345 });
  assert.equal(K.etatPartie(k, p), 'fait');
  assert.equal(K.corrigerPartie(k, p), null, 'pas de « Vérifier » : noté à la main');
});

test('avancement du carnet et vérifications gardées dans le fichier', () => {
  const d = P.creerProgression({ eleves: ['Léa', 'Hugo'], classe: '5A' });
  const av = K.avancementCarnet(d.carnet, C, '5');
  assert.equal(av.fait, 0);
  assert.equal(av.total, K.partiesSuivies(C, '5').length);
  const p = partie('symboles');
  for (const t of K.trousDe(p)) K.reponseCarnet(d.carnet, p)[t.cle] = t.reponse;
  K.noterVerificationCarnet(d, 'symboles', K.corrigerPartie(d.carnet, p));
  assert.equal(d.carnet.verifications.symboles.length, 1);
  assert.equal(K.etatPartie(d.carnet, p), 'fait');
  assert.equal(K.avancementCarnet(d.carnet, C, '5').fait, 1);
  // Le fichier relu garde les réponses et les vérifications.
  const relu = P.lireSauvegarde(JSON.stringify(d));
  assert.ok(relu.ok);
  assert.deepEqual(relu.donnees.carnet, JSON.parse(JSON.stringify(d.carnet)));
});

test('une sauvegarde sans carnet reçoit un carnet vide', () => {
  const d = P.creerProgression({ eleves: ['Léa'], classe: '4B' });
  delete d.carnet;
  const r = P.lireSauvegarde(JSON.stringify(d));
  assert.ok(r.ok);
  assert.deepEqual(r.donnees.carnet, { reponses: {}, verifications: {} });
});
