// Session de l'équipe : un seul fichier (Prénom_Prénom.json) pour le carnet de projet et les exercices.
// Copie de secours dans le navigateur à chaque modification ; fichier de l'équipe réécrit tout seul
// (Chrome, Edge) ou par le bouton « Enregistrer » (Firefox : téléchargement).
(function (global) {
  'use strict';

  const A = global.Atelier;

  // options : { donnees, handle, lecture (mode enseignant : rien n'est enregistré) }
  function creerSession(options) {
    const s = {
      donnees: options.donnees,
      handle: options.handle || null,
      dossier: options.dossier || null,
      lecture: !!options.lecture,
      nonEnregistre: false,
      dernierEnregistrement: null,
      attenteAutorisation: false,
    };
    const avantEcriture = []; // ex. l'écran d'exercice range le programme affiché dans les données
    let minuteurFichier = null;
    let enCours = null;

    const preparer = () => avantEcriture.forEach((f) => f());

    // Une modification a eu lieu. Avec le fichier de l'équipe, il est réécrit tout seul
    // (tout de suite, ou après 10 s). geste : l'élève vient de cliquer (vérifier, indice…) ; si le
    // navigateur n'a pas encore donné le droit d'écrire dans le fichier, c'est le moment de le demander.
    function aEnregistrer(maintenant, geste) {
      if (s.lecture) return;
      preparer();
      A.fichiers.sauverSecours(s.donnees);
      s.nonEnregistre = true;
      majEtat();
      if (!s.handle) return;
      clearTimeout(minuteurFichier);
      if (geste) enregistrer('geste');
      else minuteurFichier = setTimeout(() => enregistrer('auto'), maintenant ? 0 : 10000);
    }

    // mode : 'auto' (minuteur : jamais de fenêtre), 'geste' (après un clic, sans message),
    // ou autre (bouton « Enregistrer » : message de confirmation).
    async function enregistrer(mode) {
      const automatique = mode === 'auto';
      const discret = automatique || mode === 'geste';
      if (s.lecture) return null;
      if (enCours) return enCours;
      preparer();
      A.fichiers.sauverSecours(s.donnees);
      majEtat('…');
      enCours = (async () => {
        try {
          const r = await A.fichiers.enregistrer(s.donnees, s.handle, { silencieux: automatique });
          if (r.ok) {
            if (r.handle && r.handle !== s.handle) {
              s.handle = r.handle;
              A.fichiers.memoriserHandle(r.handle);
            }
            s.nonEnregistre = false;
            s.dernierEnregistrement = new Date();
            s.attenteAutorisation = false;
            if (r.telecharge) message(`Le fichier « ${A.fichiers.nomFichier(s.donnees)} » est dans Téléchargements : range-le dans le dossier de ton équipe.`, 6000);
            else if (!discret) message('C’est enregistré dans le dossier de ton équipe.');
          } else if (r.permission) s.attenteAutorisation = true; // on attendra un clic de l'élève
        } catch {
          if (!automatique) message('L’enregistrement n’a pas marché. Clique encore sur « Enregistrer » et choisis le dossier de ton équipe.', 6000);
        } finally {
          enCours = null;
          majEtat();
        }
      })();
      return enCours;
    }

    // « Enregistré à 10:42 » à côté de chaque bouton Enregistrer (carnet et exercice).
    function majEtat(texte) {
      for (const el of document.querySelectorAll('.etat-enregistrement')) {
        if (texte) el.textContent = 'Enregistrement' + texte;
        else if (!s.nonEnregistre && s.dernierEnregistrement)
          el.textContent = 'Enregistré à ' + s.dernierEnregistrement.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        else el.textContent = s.nonEnregistre ? 'Pas encore enregistré' : '';
        el.classList.toggle('a-faire', !texte && s.nonEnregistre && (!s.handle || s.attenteAutorisation));
      }
    }

    let minuteurMessage = null;
    function message(texte, duree) {
      const t = document.querySelector('.message-bref');
      t.textContent = texte;
      t.hidden = false;
      clearTimeout(minuteurMessage);
      minuteurMessage = setTimeout(() => (t.hidden = true), duree || 2600);
    }

    for (const b of document.querySelectorAll('.btn-enregistrer')) {
      if (s.lecture) b.hidden = true;
      else b.addEventListener('click', () => enregistrer('bouton'));
    }
    if (s.lecture) for (const el of document.querySelectorAll('.etat-enregistrement')) el.hidden = true;

    // Rappel à la fermeture de l'onglet si le fichier n'est pas à jour.
    addEventListener('beforeunload', (e) => {
      if (s.lecture) return;
      preparer();
      A.fichiers.sauverSecours(s.donnees);
      if (s.nonEnregistre) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    Object.assign(s, { aEnregistrer, enregistrer, majEtat, message, surAvantEcriture: (f) => avantEcriture.push(f) });
    majEtat();
    return s;
  }

  A.creerSession = creerSession;
})(this);
