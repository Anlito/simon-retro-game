// Fabrique des sauvegardes d'équipes d'exemple, pour essayer l'outil professeur (prof.html) :
//   npm run exemples
// Les fichiers sont créés dans exemples/<dossier du projet>/<Équipe>/<Équipe>.json, comme sur le réseau.
// Les tentatives sont réalistes : le programme de départ (incomplet) passé au validateur de Labo Blocs, puis la
// solution, notées comme le fait l'écran d'exercice. Des équipes de 5e et de 4e. Données fictives.

const fs = require('node:fs');
const path = require('node:path');
const LB = require(require('./dependances-tests.js').noyau);
const P = require('../site/js/moteur/progression.js');
const { catalogue, projet, carnet: contenu } = require('../site/js/moteur/catalogue.js');
const { chargerExercices } = require('../tests/outils.js');

const exercices = chargerExercices();
const RACINE = path.join(__dirname, '..', 'exemples', projet.dossier);

// Horloge fictive : chaque action avance le temps, pour des dates et des durées crédibles.
let horloge = new Date('2026-10-12T09:00:00');
const avancer = (minutes) => (horloge = new Date(horloge.getTime() + minutes * 60000));
const iso = () => {
  const d = horloge;
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`;
};

const duParcours = (ex) => catalogue.paquet().exercices.find((e) => e.id === ex.idParcours);

function verifier(d, ex, programme) {
  const r = LB.valider(duParcours(ex), programme);
  LB.noterVerification(d, duParcours(ex), { reussi: r.reussi, message: r.message, programme: LB.versV1(programme) });
  const e = d.exercices[ex.id];
  e.historique[e.historique.length - 1].date = iso();
  if (r.reussi && e.historique.filter((h) => h.type === 'verification' && h.reussi).length === 1) e.premiereReussite = iso();
}

// profil : jusqu'où l'équipe est allée, combien d'erreurs et d'indices par exercice.
function equipe(eleves, classe, profil) {
  const d = P.creerProgression({ eleves, classe });
  d.creeLe = iso();
  for (const ex of exercices) {
    if (!P.estDebloque(d, ex.id)) break;
    const p = profil(ex.id);
    if (!p) break;
    LB.noterOuverture(d, ex.idParcours);
    for (let n = 1; n <= p.indices; n++) {
      avancer(2);
      LB.noterIndice(d, ex.idParcours, n);
      const h = d.exercices[ex.id].historique;
      h[h.length - 1].date = iso();
    }
    for (let i = 0; i < p.erreurs; i++) {
      avancer(3);
      verifier(d, ex, ex.blocsDepart || { demarrage: [], boucle: [] });
    }
    if (p.reussi) {
      avancer(2);
      verifier(d, ex, ex.solutionReference);
    }
    d.exercices[ex.id].tempsPasseSecondes = Math.round((p.minutes || 3 + p.erreurs * 3) * 60);
    d.exercices[ex.id].programme = null;
  }
  d.modifieLe = iso();
  return d;
}

const n = (id) => Number.parseInt(id, 10);
const equipes = [
  // Équipe rapide : tout réussi, défi compris.
  equipe(['Léa', 'Hugo'], '5A', (id) => ({ reussi: true, erreurs: ['3', '5', '7'].includes(id) ? 1 : 0, indices: 0 })),
  // Équipe régulière, en cours à l'exercice 6.
  equipe(['Inès', 'Tom', 'Sacha'], '5A', (id) => (n(id) <= 6 ? { reussi: id !== '6', erreurs: id === '5' ? 2 : id === '6' ? 1 : 0, indices: id === '5' ? 1 : 0 } : null)),
  // Équipe bloquée à l'exercice 5 (la fonction « allumer ») : beaucoup de tentatives et les trois indices.
  equipe(['Noah', 'Jade'], '5A', (id) => (n(id) <= 5 ? { reussi: id !== '5', erreurs: id === '5' ? 7 : 1, indices: id === '5' ? 3 : 0, minutes: id === '5' ? 26 : 4 } : null)),
  // Équipe seule, bloquée par le temps à l'exercice 3.
  equipe(['Maël'], '5A', (id) => (n(id) <= 3 ? { reussi: id !== '3', erreurs: id === '3' ? 2 : 0, indices: id === '3' ? 2 : 1, minutes: id === '3' ? 24 : 6 } : null)),
  // Classe de 4e : ils câblent eux-mêmes.
  equipe(['Chloé', 'Lucas'], '4B', (id) => (n(id) <= 7 ? { reussi: true, erreurs: id === '7' ? 3 : 0, indices: id === '7' ? 2 : 0 } : null)),
  equipe(['Emma', 'Yanis'], '4B', (id) => (n(id) <= 2 ? { reussi: id === '1', erreurs: id === '2' ? 1 : 0, indices: 0 } : null)),
];

// Carnets de projet plus ou moins remplis (0 : rien, 3 : presque tout, avec quelques essais ratés).
const Cn = require('../site/js/moteur/carnet.js');
const partie = (id) => Cn.partieCarnet(contenu, id);
function remplirTrous(d, id, essaisRates) {
  const p = partie(id);
  const r = Cn.reponseCarnet(d.carnet, p);
  for (const t of Cn.trousDe(p)) r[t.cle] = t.reponse;
  const total = Cn.trousDe(p).length;
  for (let i = 0; i < essaisRates; i++) Cn.noterVerificationCarnet(d, id, { reussi: false, bien: total - 1, total });
  Cn.noterVerificationCarnet(d, id, { reussi: true, bien: total, total });
}
function remplirCarnet(d, niveau) {
  const K = d.carnet;
  // Une petite image fictive (1 × 1 pixel), à la place d'une vraie capture.
  const image = { nom: 'Capture du 21/10/2026', date: '2026-10-21T10:00:00', donnees: 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==' };
  if (niveau >= 1) {
    Object.assign(Cn.reponseCarnet(K, partie('page-de-garde')), ['Rétro Studio', 'La mémoire, c’est un jeu !', d.equipe.eleves.join(', ')]);
    const p = partie('classement');
    for (const e of p.elements) Cn.reponseCarnet(K, p)[e.nom] = e.place;
    Cn.noterVerificationCarnet(d, 'classement', { reussi: false, bien: 8, total: 10 });
    Cn.noterVerificationCarnet(d, 'classement', { reussi: true, bien: 10, total: 10 });
    remplirTrous(d, 'fonctionnement', 0);
    Cn.reponseCarnet(K, partie('dimensions'))[0].splice(1, 4, '12', '12', '7,3', 'pied à coulisse');
    Cn.reponseCarnet(K, partie('dimensions'))[1].splice(1, 4, '5', '5', '8,6', 'pied à coulisse');
  }
  if (niveau >= 2) {
    Object.assign(Cn.reponseCarnet(K, partie('forme')), ['Une manette ronde avec les 4 boutons en croix.', 'Les manettes de consoles rétro.', 'Elle tient dans une main, le pouce sur les boutons.']);
    Cn.reponseCarnet(K, partie('modele-3d')).images.push(image);
    Cn.reponseCarnet(K, partie('affiche-relecture')).fill(true);
    Object.assign(Cn.reponseCarnet(K, partie('affiche')), { nom: `Affiche_${d.equipe.eleves.join('_')}.pdf`, date: '2026-10-21T11:00:00', taille: 734002 });
  }
  if (niveau >= 3) {
    remplirTrous(d, 'branchements', 1);
    Cn.reponseCarnet(K, partie('avant-usb')).fill(true);
    Object.assign(Cn.reponseCarnet(K, partie('algorithme')), ['La LED bleue s’allume et le buzzer joue le do.', 'La LED verte s’allume et le buzzer joue le mi.', 'La LED jaune s’allume et le buzzer joue le sol.', 'La LED rouge s’allume et le buzzer joue le do aigu.', 'Un son d’erreur, puis le jeu recommence au début.']);
    remplirTrous(d, 'algorithme-jeu', 0);
    remplirTrous(d, 'symboles', 1);
  }
}
[3, 2, 1, 1, 3, 0].forEach((niv, i) => {
  const date = equipes[i].modifieLe;
  remplirCarnet(equipes[i], niv);
  equipes[i].modifieLe = date;
});

fs.rmSync(RACINE, { recursive: true, force: true });
for (const d of equipes) {
  const nom = P.nomEquipe(d.equipe.eleves);
  fs.mkdirSync(path.join(RACINE, nom), { recursive: true });
  fs.writeFileSync(path.join(RACINE, nom, nom + '.json'), JSON.stringify(d, null, 1));
  console.log(`${nom.padEnd(18)} ${d.equipe.classe}  ${P.avancement(d)}/${exercices.filter((e) => !e.defi).length}`);
}
// Un fichier qui n'est pas une sauvegarde, pour voir qu'il est ignoré.
fs.writeFileSync(path.join(RACINE, 'Léa_Hugo', 'notes.json'), '{"titre":"pas une sauvegarde"}');
// Une ancienne copie d'une équipe : l'outil garde la plus récente et le signale.
const ancienne = JSON.parse(JSON.stringify(equipes[4]));
ancienne.modifieLe = '2026-10-05T10:00:00';
fs.writeFileSync(path.join(RACINE, 'Chloé_Lucas', 'Chloé_Lucas (ancienne copie).json'), JSON.stringify(ancienne, null, 1));
console.log('\nDossier :', RACINE);
