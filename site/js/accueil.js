// Accueil : « Nouvelle équipe » (prénoms, classe, dossier de l'équipe) ou « Ouvrir notre sauvegarde ».
// Pas de compte : l'équipe tape ses prénoms. Le fichier est la seule référence ; la copie du
// navigateur sert seulement à reprendre après une fermeture d'onglet.
(function (global) {
  'use strict';

  const A = global.Atelier;
  const F = A.fichiers;
  const $ = (sel, racine) => (racine || document).querySelector(sel);
  const echapper = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function dateFr(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  function demarrer(commencer) {
    const racine = $('.ecran-accueil');
    racine.hidden = false;
    let dossierEquipe = null;
    let equipe = null; // { eleves, classe, nom }

    for (const el of racine.querySelectorAll('[data-icone]')) el.outerHTML = A.icone(el.dataset.icone, { epaisseur: el.dataset.epaisseur });

    const panneaux = [...racine.querySelectorAll('.accueil-panneau')];
    function montrer(nom) {
      for (const p of panneaux) p.hidden = p.dataset.panneau !== nom;
      const champ = racine.querySelector(`[data-panneau="${nom}"] input, [data-panneau="${nom}"] button.btn-principal`);
      if (champ) champ.focus();
    }
    function erreur(nomPanneau, message) {
      const zone = $(`[data-panneau="${nomPanneau}"] .accueil-erreur`, racine);
      zone.textContent = message || '';
      zone.hidden = !message;
    }

    // ----- Choix -----

    const secours = F.lireSecours();
    const carte = $('.accueil-reprendre', racine);
    if (secours) {
      carte.hidden = false;
      $('.reprendre-equipe', carte).textContent = secours.equipe.eleves.join(', ') + (secours.equipe.classe ? ' · ' + secours.equipe.classe : '');
      $('.reprendre-date', carte).textContent = 'Dernière modification le ' + dateFr(secours.modifieLe);
    }
    $('.btn-reprendre', racine).addEventListener('click', async () => {
      // Le fichier mémorisé est réutilisé s'il est bien celui de cette équipe ; on prend la version la plus récente.
      let handle = await F.handleMemorise();
      let donnees = secours;
      if (handle) {
        try {
          // Pas de fenêtre d'autorisation ici : on lit le fichier seulement si c'est déjà permis.
          // L'autorisation d'écrire sera demandée au premier vrai travail (vérification, indice, Enregistrer).
          if ((await handle.queryPermission({ mode: 'read' })) === 'granted') {
            const lecture = A.lireSauvegarde(await (await handle.getFile()).text());
            const meme = lecture.ok && A.nomEquipe(lecture.donnees.equipe.eleves) === A.nomEquipe(secours.equipe.eleves) && lecture.donnees.equipe.classe === secours.equipe.classe;
            if (!meme) handle = null;
            else if (lecture.donnees.modifieLe > secours.modifieLe) donnees = lecture.donnees;
          }
        } catch {
          handle = null;
        }
      }
      fin(donnees, handle);
    });
    $('.btn-pas-nous', racine).addEventListener('click', () => (carte.hidden = true));

    $('.btn-nouvelle', racine).addEventListener('click', () => montrer('equipe'));
    async function ouvrirProjet(fichierSeulement) {
      erreur('choix', '');
      let r;
      try {
        r = await F.ouvrir({ fichier: fichierSeulement });
      } catch {
        return erreur('choix', 'Le fichier n’a pas pu être ouvert. Réessaie.');
      }
      if (!r) return;
      if (!r.lecture.ok) return erreur('choix', r.lecture.raison + ' Rien n’a été modifié.');
      // Le dossier choisi donne accès à la sauvegarde et aux photos en une seule ouverture.
      dossierEquipe = r.dossier || null;
      fin(r.lecture.donnees, r.handle);
    }
    $('.btn-ouvrir', racine).addEventListener('click', () => ouvrirProjet(false));
    $('.btn-ouvrir-fichier', racine).addEventListener('click', () => ouvrirProjet(true));

    // ----- Équipe -----

    // Classes des réglages du collège : redessinées si la version en ligne arrive après l'ouverture (choix gardé).
    const choixClasse = $('.champ-classe', racine);
    function majClasses() {
      const avant = choixClasse.value;
      choixClasse.innerHTML =
        '<option value="">Choisis ta classe</option>' + (A.classes || []).map((c) => `<option>${echapper(c)}</option>`).join('');
      if ((A.classes || []).includes(avant)) choixClasse.value = avant;
      if (equipe && !racine.querySelector('[data-panneau="dossier"]').hidden) preparerDossier();
    }
    majClasses();
    A.surCollege = majClasses;

    $('.formulaire-equipe', racine).addEventListener('submit', (e) => {
      e.preventDefault();
      const eleves = [...racine.querySelectorAll('.champ-prenom')].map((c) => c.value.trim()).filter(Boolean);
      if (!eleves.length) return erreur('equipe', 'Écris au moins un prénom.');
      if (eleves.some((p) => !/^[\p{L}][\p{L}' -]*$/u.test(p))) return erreur('equipe', 'Un prénom ne doit contenir que des lettres.');
      if (!choixClasse.value) return erreur('equipe', 'Choisis ta classe.');
      erreur('equipe', '');
      equipe = { eleves, classe: choixClasse.value, nom: A.nomEquipe(eleves) };
      preparerDossier();
      montrer('dossier');
    });
    $('.btn-retour-choix', racine).addEventListener('click', () => montrer('choix'));

    // ----- Dossier de l'équipe -----

    function preparerDossier() {
      const chemin = LaboBlocs.remplirChemin(A.cheminSauvegarde || ['{classe}', '{equipe}'], equipe.classe, equipe.nom);
      // Le dossier à choisir (SIMON RETRO GAME) est surligné ; le dossier de l'équipe est créé par l'atelier.
      const cible = chemin.length - 2;
      $('.chemin', racine).innerHTML = chemin
        .slice(0, -1)
        .map((p, i) => `<span class="chemin-dossier${i === cible ? ' cible' : ''}">${echapper(p)}</span>`)
        .join('<span class="chemin-fleche" aria-hidden="true">›</span>');
      $('.nom-dossier-cible', racine).textContent = chemin[cible] || '';
      for (const el of racine.querySelectorAll('.nom-dossier-cible-bis')) el.textContent = chemin[cible] || '';
      $('.nom-fichier', racine).textContent = equipe.nom + '.json';
      $('.nom-dossier-equipe', racine).textContent = equipe.nom;
      racine.querySelector('[data-panneau="dossier"]').classList.toggle('sans-acces', !F.accesDossiers);
      $('.dossier-resultat', racine).innerHTML = '';
      $('.btn-choisir-dossier', racine).hidden = !F.accesDossiers;
      $('.btn-commencer-sans-dossier', racine).hidden = F.accesDossiers;
    }

    function resultat(html) {
      $('.dossier-resultat', racine).innerHTML = html;
    }

    async function choisirDossier() {
      erreur('dossier', '');
      let choix;
      try {
        choix = await F.choisirDossier();
      } catch {
        return erreur('dossier', 'Ce dossier ne peut pas être utilisé. Choisis-en un autre.');
      }
      if (!choix) return;
      const sorte = F.analyserDossier(choix.nom, equipe.nom, dossierProjet());
      // Le dossier de l'équipe est toujours créé par l'atelier : on choisit le dossier qui le contient.
      if (sorte === 'equipe') {
        resultat(
          `<div class="avertissement"><p>Tu as choisi le dossier <strong>« ${echapper(choix.nom)} »</strong>, celui de ton équipe. ` +
            `L’atelier le crée lui-même : choisis le dossier qui le contient, <strong>« ${echapper(dossierProjet())} »</strong>.</p>` +
            '<div class="accueil-actions"><button type="button" class="btn-principal btn-autre-dossier">Choisir un autre dossier</button></div></div>',
        );
        $('.btn-autre-dossier', racine).addEventListener('click', choisirDossier);
        return;
      }
      if (sorte === 'parent') return creerEtValider(choix);
      // Un autre dossier : on demande à l'élève.
      resultat(
        `<div class="avertissement"><p>Le dossier choisi s’appelle <strong>« ${echapper(choix.nom)} »</strong>. ` +
          `Le dossier attendu est <strong>« ${echapper(dossierProjet())} »</strong> : l’atelier y crée le dossier « ${echapper(equipe.nom)} ».</p>` +
          '<div class="accueil-actions">' +
          '<button type="button" class="btn-principal btn-autre-dossier">Choisir un autre dossier</button>' +
          `<button type="button" class="btn-secondaire btn-creer-ici">Créer « ${echapper(equipe.nom)} » dedans</button>` +
          '</div></div>',
      );
      $('.btn-autre-dossier', racine).addEventListener('click', choisirDossier);
      $('.btn-creer-ici', racine).addEventListener('click', () => creerEtValider(choix));
    }

    async function creerEtValider(choix) {
      let dossier;
      try {
        dossier = await F.creerSousDossier(choix.dossier, equipe.nom);
      } catch {
        return erreur('dossier', 'Le dossier de l’équipe n’a pas pu être créé ici. Choisis un autre dossier, ou demande à ton professeur.');
      }
      return valider(dossier, `Le dossier « ${equipe.nom} » est prêt dans « ${choix.nom} ».`);
    }

    // Avant-dernier dossier du chemin (ex. SIMON RETRO GAME) : celui que l'équipe choisit.
    function dossierProjet() {
      const chemin = A.cheminSauvegarde || ['{classe}', '{equipe}'];
      return LaboBlocs.remplirChemin([chemin[chemin.length - 2] || ''], equipe.classe)[0];
    }

    async function valider(dossier, note) {
      dossierEquipe = dossier;
      const nom = equipe.nom + '.json';
      // Ne jamais écraser une sauvegarde qui existe déjà : on propose de l'ouvrir.
      const existante = await F.sauvegardeExistante(dossier, nom);
      if (existante) {
        if (!existante.lecture.ok) {
          return resultat(
            `<div class="avertissement"><p>Ce dossier contient déjà un fichier « ${echapper(nom)} » qui n’est pas une sauvegarde de l’atelier. ` +
              'Il n’a pas été touché. Choisis un autre dossier.</p></div>',
          );
        }
        const d = existante.lecture.donnees;
        resultat(
          `<div class="avertissement"><p>Ce dossier contient déjà la sauvegarde de <strong>${echapper(d.equipe.eleves.join(', '))}</strong> ` +
            `(${A.avancement(d)}/${A.catalogue.exercices().filter((e) => !e.defi).length} exercices réussis, modifiée le ${dateFr(d.modifieLe)}). Elle n’a pas été touchée.</p>` +
            '<div class="accueil-actions">' +
            '<button type="button" class="btn-principal btn-ouvrir-existante">Ouvrir cette sauvegarde</button>' +
            '<button type="button" class="btn-secondaire btn-autre-dossier">Choisir un autre dossier</button></div></div>',
        );
        $('.btn-ouvrir-existante', racine).addEventListener('click', () => fin(d, existante.handle));
        $('.btn-autre-dossier', racine).addEventListener('click', choisirDossier);
        return;
      }
      const donnees = A.creerProgression(equipe);
      let handle;
      try {
        handle = await F.fichierDansDossier(dossier, nom);
        await F.enregistrer(donnees, handle);
      } catch {
        return erreur('dossier', 'Impossible d’écrire dans ce dossier. Vérifie que c’est bien le dossier de ton équipe, ou demande à ton professeur.');
      }
      resultat(
        `<div class="confirmation">${A.icone('coche', { couleur: '#2E7D32', epaisseur: 2.8 })}<div>` +
          `<p><strong>Dossier validé.</strong> ${echapper(note)}</p>` +
          `<p>Ton travail s’enregistre dans le fichier « ${echapper(nom)} » de ce dossier.</p></div></div>` +
          `<div class="accueil-actions"><button type="button" class="btn-principal btn-commencer">Commencer${A.icone('suivant', { epaisseur: 2.8 })}</button></div>`,
      );
      $('.btn-choisir-dossier', racine).hidden = true;
      const b = $('.btn-commencer', racine);
      b.addEventListener('click', () => fin(donnees, handle));
      b.focus();
    }

    $('.btn-choisir-dossier', racine).addEventListener('click', choisirDossier);
    $('.btn-commencer-sans-dossier', racine).addEventListener('click', () => fin(A.creerProgression(equipe), null));
    $('.btn-retour-equipe', racine).addEventListener('click', () => montrer('equipe'));

    async function fin(donnees, handle) {
      if (!dossierEquipe && A.photos) dossierEquipe = await A.photos.retrouver(donnees);
      if (dossierEquipe) {
        try { if (await dossierEquipe.queryPermission({mode: 'read'}) !== 'granted') await dossierEquipe.requestPermission({mode: 'read'}); } catch { /* le carnet reste accessible ; bouton d’autorisation dans les photos */ }
      }
      F.memoriserHandle(handle);
      F.sauverSecours(donnees);
      racine.hidden = true;
      if (dossierEquipe && A.photos) A.photos.memoriserDossier(donnees, dossierEquipe);
      commencer({ donnees, handle, dossier: dossierEquipe });
    }

    montrer('choix');
  }

  A.demarrerAccueil = demarrer;
})(this);
