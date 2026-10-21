// Exercices de programmation : l'écran d'exercice est celui de Labo Blocs (module copié dans vendor/labo-blocs/),
// posé dans .ecran-programmation. Le carnet de projet, l'accueil et la session de l'équipe restent ceux de l'atelier.
(function (global) {
  'use strict';

  const A = global.Atelier;
  const LB = global.LaboBlocs;
  const $ = (sel, racine) => (racine || document).querySelector(sel);

  const PROJET = { id: A.projet.projet, titre: A.projet.titreLong, accent: A.projet.accent, logo: 'img/favicon.svg' };

  // Taille de l'interface : ×1 jusqu'à 1536×864, puis jusqu'à ×1,25 en 1920×1080.
  function ajusterEchelle() {
    const s = Math.min(1.25, Math.max(1, Math.min(innerWidth / 1536, innerHeight / 864)));
    document.documentElement.style.setProperty('--s', String(s));
    document.documentElement.style.fontSize = 16 * s + 'px';
  }

  // Icônes déclarées dans le HTML par data-icone.
  function poserIcones(racine) {
    for (const el of racine.querySelectorAll('[data-icone]')) {
      el.outerHTML = el.dataset.icone === 'lecture' ? A.LECTURE : A.icone(el.dataset.icone, { epaisseur: el.dataset.epaisseur });
    }
  }

  // session : celle de l'atelier (carnet et exercices dans le même fichier).
  // options : { retour (bouton « Carnet »), toutDebloquer, solution, listeExercices }
  function monter(session, options) {
    const o = options || {};
    const paquet = A.catalogue.paquet();
    const hote = $('.ecran-programmation');
    let monte = null;
    monte = LB.monterExercice(hote, {
      session,
      paquet,
      projet: PROJET,
      media: 'https://anlito.github.io/labo-blocs/module/blockly/media/',
      retour: o.retour,
      toutDebloquer: o.toutDebloquer,
      solution: o.solution,
      listeExercices: o.listeExercices,
      // Exercice final ou défi réussi : l'élève envoie son programme dans la carte de la console (« Dans la carte »).
      actionsReussite: (ex) =>
        A.exercicesCles && [A.exercicesCles().final].concat(A.exercicesCles().defis).includes(String(ex.numero)) && !session.lecture
          ? [{ texte: 'Envoyer dans la carte Arduino', principal: true, action: () => monte.choisirModeTest('carte') }]
          : [],
    });
    return monte;
  }

  // Mode enseignant (?enseignant=1) ou programme d'une équipe ouvert depuis prof.html : rien n'est enregistré.
  //   options : { exercice (numéro), programme }
  function demarrerLecture(session, options) {
    const o = options || {};
    const hote = $('.ecran-programmation');
    hote.hidden = false;
    const ecran = monter(session, { toutDebloquer: true, solution: true, listeExercices: true });
    const demande = o.exercice || new URLSearchParams(location.search).get('exercice');
    ecran.ouvrir((demande && (A.idExercice(demande) || demande)) || null, o.programme);
    A.programmation = ecran;
    return ecran;
  }

  Object.assign(A, { ajusterEchelle, poserIcones, monterProgrammation: monter, demarrerLecture });
})(this);
