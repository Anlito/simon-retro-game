# Brief — relier un projet à Labo Blocs

À donner à Claude Code (ou Claude Design) au début d'un **nouveau projet de technologie** qui a une partie
programmation : pont-levis, barrière de parking, serre automatique… Ce document dit ce que le projet reçoit de
Labo Blocs, ce qu'il doit faire, et ce qu'il ne doit jamais faire. L'exemple complet est l'atelier du distributeur
de céréales (`Anlito/atelier-cereales`).

## 1. Le principe

- **Labo Blocs** (`Anlito/labo-blocs`) fait toute la programmation : blocs, simulateur, vérification des
  exercices, indices, envoi dans les cartes (Arduino Uno, mBot, micro:bit V2), mode « En direct », suivi de classe
  et niveaux par compétence.
- **Le projet** garde ce qui lui est propre : accueil, carnet de projet, documents, outil du professeur du projet.
  Il **pose l'écran d'exercice de Labo Blocs dans ses pages** et ne réécrit jamais la programmation.
- Les exercices du projet forment un **parcours**, créé et modifié avec l'éditeur de Labo Blocs
  (`site/editeur.html`), jamais à la main dans le code du projet.

## 2. Ce que le projet reçoit

Créé par `npm run nouveau-projet` (dans le dépôt labo-blocs) puis mis à jour par `npm run vers-projet` :

| Chemin | Contenu | Règle |
|---|---|---|
| `site/vendor/labo-blocs/` | le module : `labo-blocs-noyau.js`, `labo-blocs-interface.js`, `labo-blocs.css`, `labo-blocs-professeur.css`, `blockly/`, `polices/`, `cartes/firmwares.js`, `VERSION.json` | **ne jamais modifier** : remplacé en entier à chaque mise à jour |
| `site/parcours/<id>.js` | le parcours : `definirParcours({...})` | ne jamais modifier à la main : il vient de l'éditeur |
| `site/projet-labo-blocs.js` | réglages : `definirProjet({ id, titre, accent, logo, parcours, classes, cheminSauvegarde })` | modifiable |
| `site/programmation.html` | page des élèves prête à l'emploi (accueil de l'équipe, parcours, exercices, sauvegarde) | peut être remplacée par les pages du projet (§4) |
| `site/programmation-prof.html` | outil du professeur prêt à l'emploi (suivi de classe, fiche d'équipe, CSV, fichier pour le Carnet de classe) | à garder tant que le projet n'a pas le sien |

Ces deux pages suffisent pour un projet qui n'a besoin que des exercices.

## 2 bis. Classes et dossiers : les réglages du collège

La liste des classes et le chemin des dossiers de classe sont **communs à tous les outils** : un seul fichier,
https://anlito.github.io/labo-blocs/site/college.js (`definirCollege({ classes, cheminClasse })`), modifié par Thomas
dans la page Réglages de Labo Blocs (« Réglages du collège », liée depuis l'accueil). Un projet :
- garde une **copie de secours** (`site/college.js`, lue en premier : hors ligne, c'est elle qui sert), puis lit la
  version en ligne (`LaboBlocs.chargerCollegeEnLigne()` ; rien n'est envoyé) ;
- dit seulement ses **niveaux** (`niveaux: ['4']`) et la **fin de son chemin** (`cheminProjet: ['CONCEPT STORE']`) ;
- propose à l'élève de choisir sa classe dans cette liste, puis de sélectionner le **dossier du projet** : l'outil y crée
  lui-même le dossier de l'équipe (`Prénom_Prénom`), comme Labo Blocs et l'atelier du distributeur.
- **groupes** : une classe qui finit par un chiffre après la lettre (`3D1`, `3C2`) est un groupe de la classe `3D`,
  `3C` ; son dossier est au bout du chemin de la classe, avant le dossier du projet :
  `Bureau › Classe › 3D › COMMUN › TECHNOLOGIE › 3D1 › CONCEPT STORE › Lea_Malik` (`LaboBlocs.remplirChemin`).

## 3. Contraintes non négociables (les mêmes que Labo Blocs)

- **Tout en français** : interface, messages, commentaires, noms de fichiers et de fonctions.
- **Marche en `file://`** depuis le réseau du collège : scripts classiques (pas de modules ES au chargement),
  données en `definirXxx({...})`, **aucune ressource en ligne**, aucun CDN — sauf la lecture des réglages du collège,
  avec sa copie de secours.
- **Aucun compte, aucune donnée envoyée ailleurs.**
- **Sauvegarde = un fichier `.json` par équipe**, le même pour tout le projet. Labo Blocs y écrit **seulement** sa
  rubrique `programmation` (versionnée). Le projet y range ses propres rubriques (carnet…), sans jamais toucher à
  `programmation`. Jamais d'écrasement silencieux ; les anciennes sauvegardes restent lisibles.
- Messages aux élèves : décrire ce que le programme fait, jamais « tu as faux » ; un seul écart à la fois ; écart en
  **ambre**, jamais en rouge ; jamais la couleur seule ; texte ≥ 13 px.
- **Ne rien supposer sur le matériel** (broches, câblage, carte) : demander à Thomas.
- Le dépôt d'un projet peut être public : **jamais de vraies données** (prénoms d'élèves, emplois du temps,
  sauvegardes). Données de démonstration fictives uniquement.

## 4. Si le projet a ses propres pages : poser l'écran d'exercice

Ordre des scripts (après ceux du projet si besoin) :

```html
<link rel="stylesheet" href="vendor/labo-blocs/labo-blocs.css">
…
<script src="vendor/labo-blocs/blockly/blockly_compressed.js"></script>
<script src="vendor/labo-blocs/blockly/fr.js"></script>
<script src="vendor/labo-blocs/labo-blocs-noyau.js"></script>
<script src="vendor/labo-blocs/labo-blocs-interface.js"></script>
<script src="parcours/<id>.js"></script>
```

Puis, dans le code du projet :

```js
const LB = window.LaboBlocs;
const brut = LB.parcoursDefinis.find((p) => p.id === '<id>');
const problemes = LB.controler(brut);          // [] si le parcours est utilisable par cette version
const paquet = LB.preparer(brut);

// Fichier de l'équipe : créé par le projet (son application, ses rubriques) ou relu.
const donnees = LB.creerSauvegarde({ eleves: ['Léa', 'Hugo'], classe: '4B' }, { parcours: paquet, application: '<id du projet>', projet: '<id du projet>' });
// … ou à l'ouverture : const r = LB.lireSauvegarde(texte); if (r.ok) donnees = r.donnees;
const changes = LB.relierParcours(donnees, paquet); // exercices modifiés depuis : « à revérifier », blocs gardés

// session : objet du projet qui enregistre le fichier de l'équipe
//   { donnees, lecture (mode enseignant : rien n'est enregistré), aEnregistrer(maintenant, geste), enregistrer(mode),
//     majEtat(texte), message(texte, duree), surAvantEcriture(f) }
// Le plus simple : LB.creerSession({ donnees, handle }) (celle de Labo Blocs : fichier réécrit tout seul avec
// Chrome/Edge, téléchargé avec Firefox, copie de secours dans le navigateur).
const session = LB.creerSession({ donnees });

const ecran = LB.monterExercice(document.querySelector('.ecran-programmation'), {
  session,
  paquet,
  projet: { id: '<id>', titre: 'Pont-levis', accent: '#2547D0', logo: 'img/logo.svg' },
  media: 'vendor/labo-blocs/blockly/media/',
  retour: { texte: 'Carnet', action: () => { /* revenir à la page du projet */ } },
  actionsReussite: (ex) => [],                // boutons en plus après une réussite (ex. envoyer dans la carte)
});
ecran.ouvrir();                               // l'exercice où l'équipe en est (ou ecran.ouvrir(id))
// ecran.choisirModeTest('carte' | 'direct' | 'simulateur'), ecran.quitter()
```

L'élément qui reçoit l'écran prend toute la fenêtre ; les styles de Labo Blocs sont limités à `.labo-blocs` et
n'abîment pas les pages du projet. La page des élèves de Labo Blocs complète s'obtient aussi avec
`LB.demarrerApplication()` (voir `site/programmation.html`).

## 5. Outil du professeur du projet

- Le plus simple : garder `site/programmation-prof.html` (`LB.demarrerProfesseur()`) : il lit le dossier de la
  classe (fichiers des équipes, même ceux du projet), affiche la progression, les niveaux par compétence, la note,
  et exporte le CSV et le fichier pour le Carnet de classe.
- Si le projet a son propre outil, réutiliser le noyau plutôt que recalculer :
  `LB.chargerEquipes(fichiers, [paquet])`, `LB.resumerEquipe(equipe)`, `LB.evaluerEquipe(donnees, paquet)` (niveaux
  par compétence C5, C6, C8, C9 et note /20), `LB.resultatsClasse(equipes, LB.professeurVide(), { projet, paquet })`
  puis enregistrer le résultat en `….labo-resultats.json` : c'est ce que le **Carnet de classe** importe
  (Notes › « Importer des résultats Labo Blocs »).
- Le programme d'une équipe se rejoue avec `LB.monterExercice(hote, { session: LB.creerSession({ donnees, lecture: true }), paquet, toutDebloquer: true })`.

## 6. Mettre à jour les exercices et Labo Blocs

- Thomas modifie le parcours dans l'éditeur de Labo Blocs, qui le publie (GitHub Pages :
  `https://anlito.github.io/labo-blocs/parcours/<id>.labo-parcours.json`) et l'exporte (`dist/parcours/`).
- Caméra et IA : un parcours dont un exercice a des étiquettes (`camera`) emporte l'IA (`vendor/labo-blocs/vision/`,
  ~12 Mo) ; sinon elle n'est pas copiée (`--camera` pour la forcer).
- Le projet reçoit la nouvelle version par `npm run vers-projet -- <dossier du projet> --parcours <id>` (module et
  parcours), ou par un écran « Mettre à jour les exercices » comme celui de l'atelier
  (`atelier-cereales/site/js/mise-a-jour.js` : en ligne ou fichier, différences affichées, version précédente
  gardée).
- Le travail des élèves est protégé par `relierParcours` : blocs gardés, réussites gardées, exercice modifié
  « à revérifier ».
- `LB.controler(paquet)` refuse un parcours qui demande un Labo Blocs plus récent : mettre alors le module à jour.

## 7. À vérifier avant de livrer (recette)

1. La page des élèves s'ouvre en `file://`, sans réseau ; une équipe se crée et son fichier s'enregistre.
2. Un exercice se fait en entier (blocs, « Vérifier », indice) ; le fichier de l'équipe contient la rubrique
   `programmation` **et** les rubriques du projet, intactes.
3. L'outil du professeur lit le dossier de la classe et exporte le fichier pour le Carnet de classe.
4. Après une mise à jour du parcours, le travail d'une équipe test est gardé.
5. Tests `node:test` du projet verts ; le noyau se charge sous Node :
   `require('./site/vendor/labo-blocs/labo-blocs-noyau.js')`.
