// Outil professeur : accueil (choix de la classe), vue Classe (résumé, alertes, tableau), vue Équipe (onglets),
// suivi en direct du dossier de la classe, barème réglable, exports.
(async function (global) {
  'use strict';

  const A = global.Atelier;
  await A.parcoursPret;
  const LB = global.LaboBlocs;
  const $ = (sel, racine) => (racine || document).querySelector(sel);
  const $$ = (sel, racine) => [...(racine || document).querySelectorAll(sel)];
  const echapper = (s) => String(s === null || s === undefined ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const ORDRE = A.ORDRE_PARCOURS;
  const exercices = A.catalogue.exercices();
  const titre = (id) => (exercices.find((e) => e.id === id) || {}).titre || '';
  const pluriel = (n, mot, motPluriel) => `${n} ${n > 1 ? motPluriel || mot + 's' : mot}`;

  // Icônes des boutons (attribut data-ic).
  for (const el of $$('[data-ic]')) el.insertAdjacentHTML('afterbegin', A.icone(el.dataset.ic, { epaisseur: 2.4 }));

  let manuels = []; // { nom, texte } : fichiers glissés ou choisis à la main
  let fichiersDossier = []; // fichiers lus dans le dossier de la classe (relus en direct)
  let fichiers = []; // les deux réunis
  let bareme = A.completerBareme(A.notesProf.bareme() || A.bareme);
  for (const p of A.partiesSuivies(A.carnet, null)) if (!(p.id in bareme.carnet)) bareme.carnet[p.id] = 0;
  let fusion = { equipes: [], invalides: [] };
  let misesAJour = new Set();

  // Vue affichée : 'accueil' | 'classe' | 'equipe'
  const vue = { nom: 'accueil', equipe: null, onglet: 'bilan' };

  function montrerVue(nom) {
    vue.nom = nom;
    for (const s of $$('.vue')) s.hidden = !s.classList.contains('vue-' + nom);
    $('.pb-actions').hidden = nom === 'accueil';
    $('.pb-atelier').hidden = nom !== 'accueil'; // dans la classe, le lien est dans la barre des filtres
    if (nom !== 'equipe') A.dessins.arreter(); // caméra éteinte hors de la vue Équipe
    scrollTo(0, 0);
  }

  // ---------- Import ----------

  function ajouter(nouveaux) {
    // Un même fichier importé deux fois n'est compté qu'une fois.
    const cle = (f) => f.nom + '|' + f.texte.length + '|' + f.texte.slice(-60);
    const vus = new Set(manuels.map(cle));
    for (const f of nouveaux) if (!vus.has(cle(f))) manuels.push(f);
    recalculer();
  }

  function recalculer() {
    fichiers = [...manuels, ...fichiersDossier];
    // Signature du travail d'une équipe : change dès qu'elle vérifie, ouvre un indice ou réussit.
    const signature = (d) =>
      d.modifieLe + '|' + Object.values(d.exercices).map((e) => `${e.statut}:${e.tentatives}:${e.indicesOuverts}`).join(',');
    const avant = new Map(fusion.equipes.map((e) => [e.cle, signature(e.donnees)]));
    fusion = A.fusionnerEquipes(fichiers);
    for (const eq of fusion.equipes) Object.defineProperty(eq.donnees, 'evaluationsProf', { value: A.notesProf.pour(eq.donnees), configurable: true, enumerable: false });
    // Équipes qui ont avancé depuis la dernière lecture (signalées dans le tableau).
    misesAJour = new Set(fusion.equipes.filter((e) => avant.has(e.cle) && avant.get(e.cle) !== signature(e.donnees)).map((e) => e.cle));
    if (!fusion.equipes.length && !fichiers.length) {
      if (vue.nom !== 'accueil') montrerVue('accueil');
    } else if (vue.nom === 'accueil') montrerVue('classe');
    majBande();
    messages();
    dessiner();
    verifierAlertes();
    if (vue.nom === 'equipe') {
      const eq = fusion.equipes.find((x) => x.cle === vue.equipe);
      if (eq) dessinerEquipe(true);
      else montrerVue('classe');
    }
  }

  async function lireFichiers(liste) {
    const sortie = [];
    for (const f of liste) if (/\.json$/i.test(f.name)) sortie.push({ nom: f.name, texte: await f.text() });
    return sortie;
  }

  // Tous les .json du dossier choisi et de ses sous-dossiers (ex. SIMON RETRO GAME › Léa_Hugo › Léa_Hugo.json).
  // Un fichier qui n'a pas changé depuis la dernière lecture n'est pas relu (dossier réseau : on reste léger).
  const cache = new Map(); // chemin → { date, taille, texte }
  const dossiersEquipes = new Map(); // chemin du .json → dossier qui le contient (photos des croquis)
  async function lireDossier(dossier, chemin, profondeur) {
    const sortie = [];
    for await (const entree of dossier.values()) {
      if (entree.kind === 'file' && /\.json$/i.test(entree.name)) {
        const nom = chemin + entree.name;
        dossiersEquipes.set(nom, dossier);
        let f;
        try {
          f = await entree.getFile();
        } catch {
          continue; // fichier en cours d'écriture par un élève : on le relira au prochain passage
        }
        const connu = cache.get(nom);
        if (connu && connu.date === f.lastModified && connu.taille === f.size) sortie.push({ nom, texte: connu.texte });
        else {
          const texte = await f.text();
          cache.set(nom, { date: f.lastModified, taille: f.size, texte });
          sortie.push({ nom, texte });
        }
      } else if (entree.kind === 'directory' && profondeur < 3) {
        sortie.push(...(await lireDossier(entree, chemin + entree.name + ' › ', profondeur + 1)));
      }
    }
    return sortie;
  }

  // Fichiers glissés n'importe où dans la page (la zone de l'accueil est surlignée).
  const zone = $('.zone-depot');
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('survol');
  });
  document.addEventListener('dragleave', (e) => {
    if (!e.relatedTarget) zone.classList.remove('survol');
  });
  document.addEventListener('drop', async (e) => {
    e.preventDefault();
    zone.classList.remove('survol');
    if (e.dataTransfer && e.dataTransfer.files.length) ajouter(await lireFichiers([...e.dataTransfer.files]));
  });
  $('.entree-fichiers').addEventListener('change', async (e) => {
    ajouter(await lireFichiers([...e.target.files]));
    e.target.value = '';
  });

  // ---------- Suivi en direct du dossier de la classe (Chrome, Edge) ----------

  const suivi = { dossier: null, minuteur: null, periode: 30, enPause: false, derniere: null, erreur: '' };

  async function actualiser() {
    if (!suivi.dossier) return;
    try {
      fichiersDossier = await lireDossier(suivi.dossier, suivi.dossier.name + ' › ', 0);
      suivi.erreur = '';
      suivi.derniere = new Date();
    } catch {
      suivi.erreur = 'Le dossier n’a pas pu être relu (réseau ?). Nouvel essai au prochain passage.';
    }
    recalculer();
  }

  function programmer() {
    clearInterval(suivi.minuteur);
    suivi.minuteur = suivi.dossier && !suivi.enPause ? setInterval(actualiser, suivi.periode * 1000) : null;
    majBande();
  }

  async function suivre(dossier) {
    suivi.dossier = dossier;
    suivi.enPause = false;
    cache.clear();
    memoriserDossier(dossier);
    await actualiser();
    programmer();
  }

  function arreterSuivi() {
    suivi.dossier = null;
    fichiersDossier = [];
    clearInterval(suivi.minuteur);
    memoriserDossier(null);
    recalculer();
  }

  // Bandeau : classe suivie et état du suivi en direct.
  function majBande() {
    const n = fusion.equipes.length;
    const classe = $('.pb-classe');
    classe.hidden = !n && !suivi.dossier;
    classe.textContent = suivi.dossier ? `« ${suivi.dossier.name} » · ${pluriel(n, 'équipe')}` : pluriel(n, 'équipe') + ' (fichiers importés)';
    const direct = $('.pb-direct');
    direct.hidden = !suivi.dossier;
    if (suivi.dossier) {
      const heure = suivi.derniere ? suivi.derniere.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '…';
      direct.className = 'pb-direct' + (suivi.enPause ? ' pause' : '') + (suivi.erreur ? ' erreur' : '');
      direct.innerHTML = `<span class="suivi-point" aria-hidden="true"></span>${suivi.enPause ? 'En pause' : 'En direct'} · lu à ${heure}`;
      direct.title = suivi.erreur || `Le dossier est relu toutes les ${suivi.periode} s (réglable dans « Barème »).`;
    }
    $('.btn-actualiser').hidden = !suivi.dossier;
    $('.reglage-suivi').hidden = !suivi.dossier;
    $('.suivi-erreur').textContent = suivi.erreur;
    $('.btn-suivi-pause').textContent = suivi.enPause ? 'Reprendre le suivi' : 'Mettre en pause';
  }

  if (typeof global.showDirectoryPicker === 'function') {
    const b = $('.btn-dossier-classe');
    b.hidden = false;
    b.addEventListener('click', async () => {
      let dossier;
      try {
        dossier = await global.showDirectoryPicker({ id: A.projet.id + '-prof', mode: 'read' });
      } catch {
        return;
      }
      suivre(dossier);
    });
    $('.btn-actualiser').addEventListener('click', actualiser);
    $('.btn-suivi-pause').addEventListener('click', () => {
      suivi.enPause = !suivi.enPause;
      if (!suivi.enPause) actualiser();
      programmer();
    });
    $('.btn-suivi-arreter').addEventListener('click', () => {
      arreterSuivi();
      $('.dialogue-reglages').close();
    });
    $('.suivi-periode').addEventListener('change', (e) => {
      suivi.periode = Number(e.target.value) || 30;
      programmer();
    });
    // Le dossier suivi est mémorisé : à la réouverture de la page, un clic suffit pour reprendre.
    dossierMemorise().then((d) => {
      if (!d) return;
      const r = $('.btn-reprendre-suivi');
      $('.reprendre-dossier', r).textContent = d.name;
      r.hidden = false;
      r.addEventListener('click', async () => {
        try {
          if ((await d.queryPermission({ mode: 'read' })) !== 'granted' && (await d.requestPermission({ mode: 'read' })) !== 'granted') return;
        } catch {
          return;
        }
        suivre(d);
      });
    });
  } else $('.prof-alerte-navigateur').hidden = false;

  function base() {
    return new Promise((ok, ko) => {
      const r = indexedDB.open(A.projet.id + '-prof', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('dossiers');
      r.onsuccess = () => ok(r.result);
      r.onerror = () => ko(r.error);
    });
  }
  async function memoriserDossier(dossier) {
    try {
      const db = await base();
      const t = db.transaction('dossiers', 'readwrite');
      if (dossier) t.objectStore('dossiers').put(dossier, 'classe');
      else t.objectStore('dossiers').delete('classe');
    } catch {
      /* stockage indisponible : il faudra rechoisir le dossier */
    }
  }
  async function dossierMemorise() {
    try {
      const db = await base();
      return await new Promise((ok) => {
        const r = db.transaction('dossiers').objectStore('dossiers').get('classe');
        r.onsuccess = () => ok(r.result || null);
        r.onerror = () => ok(null);
      });
    } catch {
      return null;
    }
  }

  // « Autre classe » : tout retirer et revenir à l'accueil.
  function toutRetirer() {
    manuels = [];
    alertesConnues = null;
    nouvelles.clear();
    if (suivi.dossier) arreterSuivi();
    else recalculer();
  }
  $('.btn-autre-classe').addEventListener('click', toutRetirer);

  // ---------- Alertes : une équipe devient « bloquée » ----------

  let alertesConnues = null; // clés déjà signalées (null : première lecture, rien n'est « nouveau »)
  const nouvelles = new Map(); // clé → heure d'apparition
  function verifierAlertes() {
    const liste = A.alertesClasse(fusion.equipes, seuils());
    const cles = new Set(liste.map((a) => a.cle));
    const apparues = alertesConnues ? liste.filter((a) => !alertesConnues.has(a.cle)) : [];
    for (const a of apparues) nouvelles.set(a.cle, new Date());
    for (const c of [...nouvelles.keys()]) if (!cles.has(c)) nouvelles.delete(c);
    alertesConnues = cles;
    dessinerAlertes(liste);
    if (apparues.length) prevenir(apparues);
  }

  function dessinerAlertes(liste) {
    const zoneAlertes = $('.prof-alertes');
    zoneAlertes.hidden = !liste.length;
    if (!liste.length) return;
    liste.sort((a, b) => (nouvelles.has(b.cle) ? 1 : 0) - (nouvelles.has(a.cle) ? 1 : 0));
    $('.alertes-liste', zoneAlertes).innerHTML = liste
      .map((a) => {
        const n = nouvelles.get(a.cle);
        return (
          `<li class="${n ? 'nouvelle' : ''}"><button type="button" class="alerte-equipe" data-alerte="${echapper(a.cle.split('|').slice(0, 2).join('|'))}">` +
          `<strong>${echapper(a.equipe)}</strong>${a.classe ? ' · ' + echapper(a.classe) : ''}</button>` +
          `<span>exercice ${a.id} · ${echapper(titre(a.id))} — ${echapper(a.raison)}</span>` +
          (n ? ` <span class="badge-nouveau">nouveau · ${n.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>` : '') +
          '</li>'
        );
      })
      .join('');
    $('.alertes-titre', zoneAlertes).innerHTML = A.icone('alerte', { epaisseur: 2.4 }) + `${pluriel(liste.length, 'équipe bloquée', 'équipes bloquées')}`;
  }
  $('.prof-alertes').addEventListener('click', (e) => {
    const b = e.target.closest('[data-alerte]');
    if (b) ouvrirEquipe(b.dataset.alerte);
  });

  // Son court (deux notes) et notification du système si elle a été autorisée.
  function prevenir(apparues) {
    if ($('.alerte-son').checked) {
      try {
        const ctx = new (global.AudioContext || global.webkitAudioContext)();
        [660, 880].forEach((f, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.frequency.value = f;
          g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
          g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.18 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.16);
          o.connect(g).connect(ctx.destination);
          o.start(ctx.currentTime + i * 0.18);
          o.stop(ctx.currentTime + i * 0.18 + 0.2);
        });
      } catch {
        /* pas de son */
      }
    }
    if (global.Notification && Notification.permission === 'granted') {
      const a = apparues[0];
      const plus = apparues.length > 1 ? ` (+${apparues.length - 1} autre${apparues.length > 2 ? 's' : ''})` : '';
      try {
        new Notification(A.projet.titre + ' : équipe bloquée', { body: `${a.equipe}, exercice ${a.id} : ${a.raison}${plus}`, tag: 'atelier-alerte' });
      } catch {
        /* notifications indisponibles (ex. fichier ouvert hors serveur) */
      }
    }
  }
  const bNotif = $('.btn-notifications');
  if (!global.Notification) bNotif.hidden = true;
  else {
    const majNotif = () => {
      bNotif.disabled = Notification.permission !== 'default';
      bNotif.textContent = Notification.permission === 'granted' ? 'Notifications activées' : Notification.permission === 'denied' ? 'Notifications refusées par le navigateur' : 'Activer les notifications';
    };
    majNotif();
    bNotif.addEventListener('click', async () => {
      await Notification.requestPermission();
      majNotif();
    });
  }

  // Fichiers lus : doublons et fichiers ignorés (sous le tableau).
  function messages() {
    const m = [];
    m.push(`<p>${pluriel(fusion.equipes.length, 'équipe')} à partir de ${pluriel(fichiers.length, 'fichier')}.</p>`);
    const doublons = fusion.equipes.filter((e) => e.autres.length);
    if (doublons.length) {
      m.push(
        '<details><summary>' + `${doublons.length} équipe${doublons.length > 1 ? 's ont' : ' a'} plusieurs fichiers : le plus récent est gardé.` + '</summary><ul>' +
          doublons.map((e) => `<li>${echapper(e.donnees.equipe.eleves.join(', '))} : gardé ${echapper(e.fichier)} ; ignoré ${e.autres.map(echapper).join(', ')}</li>`).join('') +
          '</ul></details>',
      );
    }
    if (fusion.invalides.length) {
      m.push(
        '<details><summary>' + `${fusion.invalides.length} fichier${fusion.invalides.length > 1 ? 's ignorés' : ' ignoré'} (pas une sauvegarde de l’atelier).` + '</summary><ul>' +
          fusion.invalides.map((i) => `<li>${echapper(i.nom)} : ${echapper(i.raison)}</li>`).join('') +
          '</ul></details>',
      );
    }
    $('.prof-messages').innerHTML = m.join('');
  }

  // ---------- Vue Classe ----------

  const seuils = () => ({
    tentatives: Math.max(1, Number($('.seuil-tentatives').value) || A.SEUILS.tentatives),
    minutes: Math.max(1, Number($('.seuil-minutes').value) || A.SEUILS.minutes),
  });

  // Carnet : les parties suivies dépendent du niveau de la classe de l'équipe (5e, 4e).
  const niveauEquipe = (d) => A.niveauDe(d.equipe && d.equipe.classe);
  const avancementCarnet = (d) => A.avancementCarnet(A.completerCarnet(d.carnet), A.carnet, niveauEquipe(d));
  const nObligatoires = () => A.exercicesObligatoires().length;
  const finalDe = () => { const o = A.exercicesObligatoires(); return o[o.length - 1]; };

  function resume(eq) {
    const r = A.resumerEquipe(eq.donnees, seuils());
    r.note = A.noterEquipe(eq.donnees, bareme);
    const c = avancementCarnet(eq.donnees);
    r.carnet = c.fait;
    r.carnetTotal = c.total;
    return r;
  }

  function selection() {
    const classe = $('.filtre-classe').value;
    let liste = fusion.equipes.map((eq) => ({ eq, r: resume(eq) }));
    if (classe) liste = liste.filter((x) => x.r.classe === classe);
    if ($('.filtre-bloquees').checked) liste = liste.filter((x) => x.r.bloque);
    const tri = $('.tri').value;
    const nom = (x) => x.r.classe + ' ' + x.r.eleves.join(' ').toLowerCase();
    liste.sort((a, b) => {
      if (tri === 'avancement') return b.r.avancement - a.r.avancement || nom(a).localeCompare(nom(b));
      if (tri === 'activite') return (b.r.derniereActivite || '').localeCompare(a.r.derniereActivite || '');
      if (tri === 'note') return b.r.note.note - a.r.note.note || nom(a).localeCompare(nom(b));
      return nom(a).localeCompare(nom(b), 'fr');
    });
    return liste;
  }

  function majClasses() {
    const select = $('.filtre-classe');
    const choisie = select.value;
    const classes = [...new Set(fusion.equipes.map((e) => e.donnees.equipe.classe || ''))].sort();
    select.innerHTML = '<option value="">toutes</option>' + classes.map((c) => `<option${c === choisie ? ' selected' : ''}>${echapper(c)}</option>`).join('');
  }

  function cellule(c, id) {
    const statut = c.statut;
    const infos = [A.MOTS_STATUT[statut], pluriel(c.tentatives, 'tentative'), pluriel(c.indices, 'indice'), A.dureeLisible(c.temps)];
    if (c.bloque) infos.push('bloqué');
    const texte = statut === 'non_commence' && !c.tentatives ? A.SYMBOLES.non_commence : `${A.SYMBOLES[statut]} ${c.tentatives}`;
    return (
      `<td class="cellule statut-${statut}${c.bloque ? ' bloque' : ''}" title="Exercice ${id} : ${echapper(infos.join(', '))}">` +
      `${texte}${c.bloque ? ' <span class="alerte" aria-label="bloqué">⚠</span>' : ''}</td>`
    );
  }

  // Chiffres clés de la classe affichée.
  function dessinerResume(liste) {
    const n = liste.length;
    const moyenne = (f) => (n ? liste.reduce((s, x) => s + f(x.r), 0) / n : 0);
    const finies = liste.filter((x) => x.r.avancement >= nObligatoires()).length;
    const bloquees = liste.filter((x) => x.r.bloque).length;
    const chiffre = (valeur, etiquette, classe) => `<div class="pc-chiffre${classe ? ' ' + classe : ''}"><b>${valeur}</b><span>${etiquette}</span></div>`;
    $('.pc-resume').innerHTML =
      chiffre(n, n > 1 ? 'équipes' : 'équipe') +
      chiffre(`${A.nombreFr(moyenne((r) => r.note.note))}<small>/${bareme.sur}</small>`, 'note moyenne') +
      chiffre(`${A.nombreFr(moyenne((r) => r.avancement))}<small>/${nObligatoires()}</small>`, 'exercices réussis (moyenne)') +
      chiffre(`${A.nombreFr(moyenne((r) => (r.carnetTotal ? r.carnet / r.carnetTotal : 0) * 100))}<small> %</small>`, 'du carnet fait (moyenne)') +
      chiffre(finies, `programme final réussi (exercice ${finalDe()})`) +
      chiffre(bloquees, bloquees > 1 ? 'équipes bloquées' : 'équipe bloquée', bloquees ? 'pc-alerte' : '');
  }

  function dessiner() {
    if (!fusion.equipes.length) return;
    majClasses();
    const liste = selection();
    const s = seuils();
    dessinerResume(liste);
    $('.titre-classe').textContent = $('.filtre-classe').value ? 'classe ' + $('.filtre-classe').value : 'toutes les classes';
    let h = '<thead><tr><th scope="col" class="col-equipe">Équipe</th>';
    for (const id of ORDRE) h += `<th scope="col" title="${echapper(titre(id))}">${id}</th>`;
    h += `<th scope="col">Avancement</th><th scope="col" title="Parties du carnet de projet terminées">Carnet</th><th scope="col" title="Exercices réussis du premier coup et sans indice">★ 1er coup</th><th scope="col">Note /${bareme.sur}</th><th scope="col">Dernière<br>activité</th></tr></thead><tbody>`;
    if (!liste.length) h += `<tr><td colspan="${ORDRE.length + 6}" class="prof-vide">Aucune équipe ne correspond aux filtres.</td></tr>`;
    for (const x of liste) {
      const r = x.r;
      h +=
        `<tr class="ligne-equipe${r.bloque ? ' equipe-bloquee' : ''}" data-cle="${echapper(x.eq.cle)}" tabindex="0">` +
        `<th scope="row" class="col-equipe"><span class="nom-equipe">${echapper(r.eleves.join(', '))}</span>` +
        `<span class="classe-equipe">${echapper(r.classe)}${r.bloque ? ' · <strong>⚠ bloquée</strong>' : ''}` +
        `${misesAJour.has(x.eq.cle) ? ' · <span class="badge-maj">● vient d’avancer</span>' : ''}</span></th>` +
        ORDRE.map((id) => cellule(r.cellules[id], id)).join('') +
        `<td class="nombre">${r.avancement}/${nObligatoires()}</td><td class="nombre">${r.carnet}/${r.carnetTotal}</td><td class="nombre">${r.premierCoup ? '★ ' + r.premierCoup : '0'}</td><td class="nombre note">${A.nombreFr(r.note.note, 2)}</td>` +
        `<td title="${echapper(A.dateCourte(r.derniereActivite))}">${echapper(A.dateCourte(r.derniereActivite).replace(/\/\d{4}/, ''))}</td></tr>`;
    }
    const taux = A.tauxReussite(liste.map((x) => x.r));
    h += '</tbody><tfoot><tr><th scope="row" class="col-equipe">Taux de réussite</th>';
    for (const id of ORDRE) h += `<td class="nombre">${liste.length ? Math.round(taux[id] * 100) + ' %' : ''}</td>`;
    const notes = liste.map((x) => x.r.note.note);
    const moyenne = notes.length ? notes.reduce((a, b) => a + b, 0) / notes.length : 0;
    h += `<td></td><td></td><td></td><td class="nombre note" title="Moyenne des équipes affichées">moy. ${A.nombreFr(moyenne)}</td><td></td></tr></tfoot>`;
    $('.prof-tableau').innerHTML = h;
    $('.prof-legende').innerHTML =
      '<span><strong>✓</strong> réussi</span><span><strong>●</strong> en cours</span><span><strong>○</strong> non commencé</span>' +
      '<span>le nombre = tentatives (clics sur « Vérifier »)</span><span><strong>★</strong> réussi du premier coup sans indice</span>' +
      `<span><strong>⚠</strong> bloqué : au moins ${s.tentatives} tentatives ou plus de ${s.minutes} min sur un exercice non réussi</span>`;
  }

  for (const sel of ['.filtre-classe', '.tri', '.filtre-bloquees']) $(sel).addEventListener('change', dessiner);
  for (const sel of ['.seuil-tentatives', '.seuil-minutes']) {
    $(sel).addEventListener('input', () => {
      alertesConnues = null; // nouveaux seuils : on repart de l'état actuel, sans « nouvelles » alertes
      nouvelles.clear();
      dessiner();
      verifierAlertes();
      if (vue.nom === 'equipe') dessinerEquipe(true);
    });
  }
  $('.prof-tableau').addEventListener('click', (e) => {
    const l = e.target.closest('.ligne-equipe');
    if (l) ouvrirEquipe(l.dataset.cle);
  });
  $('.prof-tableau').addEventListener('keydown', (e) => {
    const l = e.target.closest('.ligne-equipe');
    if (l && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      ouvrirEquipe(l.dataset.cle);
    }
  });

  // ---------- Vue Équipe ----------

  const heure = (iso) => (iso ? A.dateCourte(iso) : '');

  // Ouvre l'atelier en lecture avec ce programme (rien n'y est enregistré).
  function ouvrirDansAtelier(donnees, exercice, programme) {
    try {
      localStorage.setItem(A.projet.id + '-revue', JSON.stringify({ donnees, exercice, programme }));
    } catch {
      alert('Le navigateur refuse de garder ce programme le temps de l’ouvrir (stockage plein ou navigation privée).');
      return;
    }
    global.open('index.html?revue=1', '_blank', 'noopener');
  }

  // « 1,2 / 1,6 » et la raison des retenues.
  function pointsHtml(note, id) {
    const x = note.detail.find((y) => y.id === id);
    if (!x) return A.exercicesDefis().includes(id) ? (note.bonus ? `<strong>défi : bonus +${A.nombreFr(note.bonus)}</strong>` : '<span class="points-raison">défi : bonus si réussi</span>') : '';
    return (
      `<strong class="nombre">${A.nombreFr(x.pointsNote, 2)} / ${A.nombreFr(x.pointsNoteMax, 2)}</strong>` +
      `<span class="points-raison">${x.raisons.map(echapper).join(' · ')}</span>`
    );
  }

  // Réponses de l'équipe pour une partie du carnet (✓ / ✗ pour les parties corrigées).
  function reponsesHtml(K, p) {
    const ligne = (etiquette, valeur, juste) =>
      `<li class="${juste === true ? 'rep-juste' : juste === false ? 'rep-faux' : 'rep-vide'}">` +
      `<span class="rep-marque" aria-hidden="true">${juste === true ? '✓' : juste === false ? '✗' : '○'}</span>` +
      `<strong>${echapper(etiquette)}</strong> : ${valeur ? echapper(valeur) : '<em>vide</em>'}</li>`;
    const r = A.reponseCarnet(K, p);
    switch (p.type) {
      case 'classement': {
        const titres = Object.fromEntries((p.colonnes || []).map((c) => [c.cle, c.titre]));
        return '<ul class="reponses">' + (p.elements || []).map((e) => ligne(e.nom, r[e.nom] ? titres[r[e.nom]] || r[e.nom] : '', r[e.nom] ? r[e.nom] === e.place : null)).join('') + '</ul>';
      }
      case 'trous':
        return '<ul class="reponses">' + (p.lignes || []).map((l, i) => A.morceauxTrous(l).filter((m) => m.trou !== undefined).map((m) => {
          const v = r[`${i}.${m.trou}`];
          const texte = A.morceauxTrous(l).map((x) => (x.trou === undefined ? x.texte : x.trou === m.trou ? '…' : '___')).join('').trim();
          return ligne(texte, v, v ? v === m.reponse : null);
        }).join('')).join('') + '</ul>';
      case 'questions':
        return '<dl class="rep-questions">' + (p.questions || []).map((q, i) => `<dt>${echapper(q)}</dt><dd>${r[i] && r[i].trim() ? echapper(r[i]) : '<em>vide</em>'}</dd>`).join('') + '</dl>';
      case 'tableau': {
        const titres = Array.isArray(p.lignes);
        return '<table class="detail-tableau rep-tableau"><thead><tr>' + (p.colonnes || []).map((c) => `<th>${echapper(c)}</th>`).join('') + '</tr></thead><tbody>' +
          A.lignesTableau(p).map((t, i) => '<tr>' + (p.colonnes || []).map((c, j) => (titres && j === 0 ? `<th scope="row">${echapper(t)}</th>` : `<td>${echapper((r[i] || [])[j])}</td>`)).join('') + '</tr>').join('') +
          '</tbody></table>';
      }
      case 'cases':
        return '<ul class="reponses">' + (p.cases || []).map((c, i) => ligne(c, r[i] ? 'coché' : '', r[i] ? true : null)).join('') + '</ul>';
      case 'choix':
        return `<p><strong>${r.choisis.length ? r.choisis.map(echapper).join(', ') : '<em>rien de choisi</em>'}</strong></p>` +
          (p.question ? `<p>${echapper(p.question)} ${r.texte && r.texte.trim() ? '« ' + echapper(r.texte) + ' »' : '<em>vide</em>'}</p>` : '');
      case 'echelle': {
        const degres = p.degres || ['Pas encore', 'Plutôt bien', 'Très bien'];
        return '<ul class="reponses">' + (p.lignes || []).map((l) => ligne(l, r[l] !== undefined ? degres[r[l]] : '', null)).join('') + '</ul>';
      }
      case 'image':
        return (r.images || []).length
          ? '<div class="rep-images">' + r.images.map((im) => `<figure><a href="${echapper(im.donnees)}" target="_blank" rel="noopener"><img src="${echapper(im.donnees)}" alt="${echapper(p.titre)}"></a><figcaption>${echapper(im.nom || '')}</figcaption></figure>`).join('') + '</div>'
          : '<p><em>pas encore d’image</em></p>';
      case 'fichier':
        return r.nom
          ? `<p>Déposé : <strong>${echapper(r.nom)}</strong> (${Math.max(1, Math.round((r.taille || 0) / 1024))} ko) dans le dossier de l’équipe, le ${echapper(heure(r.date))}.</p>`
          : '<p><em>pas encore déposé</em></p>';
    }
    return '';
  }

  function evaluationManuelleHtml(d, p) {
    if (['classement', 'trous'].includes(p.type) || !(bareme.carnet[p.id] > 0)) return '';
    const n = A.notesProf.pour(d)[p.id];
    return `<label class="note-maitrise">Niveau de maîtrise (coefficient ${bareme.carnet[p.id]}) <select data-note-manuelle="${echapper(p.id)}"><option value="">À évaluer</option>` +
      ['Non atteint', 'Partiellement atteint', 'Atteint', 'Dépassé'].map((mot, i) => `<option value="${i + 1}"${n === i + 1 ? ' selected' : ''}>${mot} · ${i + 1}/4</option>`).join('') + '</select></label><p class="pe-aide">Sans niveau choisi, cette partie reste hors du total. Les niveaux et les choix sont sauvegardés sur ce poste professeur ; exportez vos évaluations pour les conserver ailleurs.</p>';
  }
  // Onglet « Carnet de projet » : chaque partie du niveau de l'équipe, son état, son travail et ses points.
  function carnetHtml(d, note) {
    const C = A.carnet || { parties: [] };
    const K = A.harmoniserCarnet(A.completerCarnet(d.carnet), C);
    const niveau = niveauEquipe(d);
    const mot = { fait: '✓ fait', en_cours: '● en cours', a_faire: '○ à faire' };
    const verifs = (id) => {
      const v = K.verifications[id] || [];
      if (!v.length) return '';
      const reussie = v.findIndex((x) => x.reussi);
      const der = v[v.length - 1];
      return `<p class="carnet-verifs">${pluriel(v.length, 'vérification')}` +
        (reussie >= 0 ? ` · réussi à la ${reussie + 1}${reussie ? 'e' : 're'}` : ` · dernière : ${der.bien}/${der.total} juste${der.bien > 1 ? 's' : ''}`) + '</p>';
    };
    const points = (id) => (note.detail.some((x) => x.id === 'carnet:' + id) ? pointsHtml(note, 'carnet:' + id) : '<span class="points-raison">non noté</span>');
    const av = A.avancementCarnet(K, C, niveau);
    let h = `<section class="pe-carte"><h3>Carnet de projet · ${av.fait}/${av.total} parties faites${niveau ? ` (parties de la ${niveau}e)` : ''}</h3>`;
    for (const p of A.partiesSuivies(C, niveau)) {
      const etat = A.etatPartie(K, p);
      const travail = etat === 'a_faire' && !verifs(p.id) ? '' : verifs(p.id) + reponsesHtml(K, p);
      h += `<article class="pe-partie etat-${etat}"><header><h4>${echapper(p.titre)}</h4>` +
        `<span class="pe-etat">${mot[etat]}</span><span class="pe-points">${points(p.id)}</span></header>` +
        `<div class="pe-partie-corps">${evaluationManuelleHtml(d, p)}${travail || '<p class="pe-vide">Pas encore de travail.</p>'}</div></article>`;
    }
    return h + '</section>';
  }

  // Onglet « Programmation » : un exercice par ligne.
  function programmationHtml(d, r, note) {
    let h = '<section class="pe-carte"><h3>Exercices de programmation</h3>' +
      '<table class="detail-tableau"><thead><tr><th>Exercice</th><th>Statut</th><th>Tentatives</th><th>Échecs</th><th>Indices</th>' +
      '<th>Temps</th><th>Première réussite</th><th>Points</th><th></th></tr></thead><tbody>';
    for (const id of ORDRE) {
      const c = r.cellules[id];
      const e = d.exercices[id];
      h +=
        `<tr class="${c.bloque ? 'bloque' : ''}"><th scope="row">${id} · ${echapper(titre(id))}</th>` +
        `<td class="statut-${c.statut}">${A.SYMBOLES[c.statut]} ${A.MOTS_STATUT[c.statut]}${c.bloque ? ' ⚠' : ''}</td>` +
        `<td class="nombre">${c.tentatives}</td><td class="nombre">${c.echecs}</td><td class="nombre">${c.indices}/3</td>` +
        `<td class="nombre">${c.temps ? A.dureeLisible(c.temps) : ''}</td><td>${echapper(heure(c.premiereReussite))}</td>` +
        `<td>${pointsHtml(note, id)}</td>` +
        `<td>${e && e.programme ? `<button type="button" class="btn-lien" data-ouvrir="${id}">Lancer le programme</button>` : ''}</td></tr>`;
    }
    return h + '</tbody></table><p class="pe-aide">« Lancer le programme » ouvre l’atelier en lecture avec le dernier programme de l’équipe.</p></section>';
  }

  // Onglet « Historique » : chaque vérification (écarts, programme du moment) et chaque indice.
  function historiqueHtml(d) {
    let h = '<section class="pe-carte"><h3>Historique de programmation</h3>';
    let vide = true;
    for (const id of ORDRE) {
      const e = d.exercices[id];
      if (!e || !e.historique || !e.historique.length) continue;
      vide = false;
      h += `<details class="historique" data-ex="${id}"><summary>Exercice ${id} · ${echapper(titre(id))} — ${pluriel(e.historique.length, 'événement')}</summary><ol>`;
      e.historique.forEach((ev, k) => {
        if (ev.type === 'indice') {
          h += `<li class="ev-indice"><span class="ev-heure">${echapper(heure(ev.date))}</span> Indice ${ev.niveau} ouvert</li>`;
          return;
        }
        // Événements de Labo Blocs : reprise d'une sauvegarde de l'ancien atelier, exercice modifié par le professeur.
        if (ev.type === 'migration') {
          h += `<li class="ev-indice"><span class="ev-heure">${echapper(heure(ev.date))}</span> Travail repris de l’ancienne version de l’atelier</li>`;
          return;
        }
        if (ev.type === 'modifie') {
          h += `<li class="ev-indice"><span class="ev-heure">${echapper(heure(ev.date))}</span> Exercice modifié par la mise à jour ${echapper(ev.versionParcours || '')} : à revérifier</li>`;
          return;
        }
        if (ev.type !== 'verification') return;
        h +=
          `<li class="${ev.reussi ? 'ev-reussi' : 'ev-ecart'}"><span class="ev-heure">${echapper(heure(ev.date))}</span> ` +
          (ev.reussi ? '<strong>✓ Vérification réussie</strong>' : '<strong>Vérification : écart</strong>');
        if (!ev.reussi) {
          const ecarts = ev.ecarts && ev.ecarts.length ? ev.ecarts : [ev.message];
          h += '<ul class="ev-ecarts">' + ecarts.map((m) => `<li>${echapper(m)}</li>`).join('') + '</ul>';
          if (ev.notes) h += '<ul class="ev-notes">' + ev.notes.map((n) => `<li>${echapper(n)}</li>`).join('') + '</ul>';
        }
        if (ev.programme) {
          h +=
            `<div class="ev-actions"><button type="button" class="btn-lien" data-blocs="${id}|${k}">Voir les blocs</button>` +
            `<button type="button" class="btn-lien" data-lancer="${id}|${k}">Lancer ce programme</button></div><div class="ev-blocs" hidden></div>`;
        }
        h += '</li>';
      });
      h += '</ol></details>';
    }
    if (vide) h += '<p class="pe-vide">Aucune vérification ni aucun indice pour l’instant.</p>';
    return h + '</section>';
  }

  // Programmes envoyés dans la carte de la maquette : mode « Dans la carte » (historique de chaque exercice), et
  // anciennes sauvegardes (programme 13A / 13B précompilé, « envoisCarte »). Triés par date.
  function envoisReussis(d) {
    const anciens = (d.envoisCarte || []).filter((x) => x.reussi && x.version !== 'vierge');
    const nouveaux = [];
    const ex = (d.programmation && d.programmation.exercices) || {};
    for (const [id, e] of Object.entries(ex)) for (const h of e.historique || []) if (h.type === 'envoi' && h.reussi) nouveaux.push({ date: h.date, exercice: A.numeroExercice ? A.numeroExercice(id) : id });
    return anciens.concat(nouveaux).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }

  // Niveaux par compétence (Labo Blocs), ceux du fichier pour le Carnet de classe.
  function competencesHtml(eq) {
    const lb = equipesLaboBlocs([{ eq }])[0];
    if (!lb) return '';
    const ev = LB.evaluerEquipe(lb.donnees, lb.paquet);
    return (
      '<section class="pe-carte"><h3>Compétences (Labo Blocs)</h3><div class="pe-infos">' +
      ev.competences.map((k) => `<div class="pe-info"><span>${k.code} · ${echapper(k.libelle)}</span><strong>${k.niveau ? `${k.niveau} · ${LB.nomNiveau(k.niveau)}` : '—'}</strong></div>`).join('') +
      `<div class="pe-info"><span>Note par compétences</span><strong>${ev.note === null ? '—' : A.nombreFr(ev.note, 2) + ' / 20'}</strong></div>` +
      '</div><p class="pe-aide">Ce que reçoit le Carnet de classe (bouton « Carnet de classe » en haut).</p></section>'
    );
  }

  // Onglet « Bilan » : la note et ce qui la compose, l'avancement, la maquette.
  function bilanHtml(eq, d, r, note) {
    const parties = note.detail.filter((x) => !x.id.startsWith('carnet:'));
    const carnet = note.detail.filter((x) => x.id.startsWith('carnet:'));
    const somme = (l, cle) => l.reduce((s, x) => s + x[cle], 0);
    const enCours = ORDRE.find((id) => r.cellules[id].statut === 'en_cours');
    const bloques = ORDRE.filter((id) => r.cellules[id].bloque);
    const envois = envoisReussis(d);
    const dernierEnvoi = envois[envois.length - 1];
    const ligne = (etiquette, valeur) => `<div class="pe-info"><span>${etiquette}</span><strong>${valeur}</strong></div>`;
    return (
      '<div class="pe-bilan">' +
      '<section class="pe-carte pe-note-carte">' +
      `<div class="pe-note-grande"><span>Note de l’équipe</span><b>${A.nombreFr(note.note, 2)}<small>/${note.sur}</small></b></div>` +
      '<div class="pe-infos">' +
      ligne('Programmation', `${A.nombreFr(somme(parties, 'pointsNote'), 2)} / ${A.nombreFr(somme(parties, 'pointsNoteMax'), 2)} pts`) +
      ligne('Carnet de projet', `${A.nombreFr(somme(carnet, 'pointsNote'), 2)} / ${A.nombreFr(somme(carnet, 'pointsNoteMax'), 2)} pts`) +
      ligne('Bonus des défis', note.bonus ? '+' + A.nombreFr(note.bonus) : '—') +
      '</div>' +
      `<p class="pe-aide">Calculée sur les ${bareme.objectif} premiers exercices attendus et les parties notées du carnet. ` +
      'Le détail des points est dans les onglets « Programmation » et « Carnet de projet ».</p></section>' +
      '<section class="pe-carte"><h3>Avancement</h3><div class="pe-infos">' +
      ligne('Exercices réussis', `${r.avancement}/${nObligatoires()}`) +
      ligne('Du premier coup sans indice', `★ ${r.premierCoup}`) +
      ligne('Carnet de projet', `${avancementCarnet(d).fait}/${avancementCarnet(d).total} parties`) +
      ligne('En cours', enCours ? `exercice ${enCours} · ${echapper(titre(enCours))}` : '—') +
      ligne('Temps de travail', A.dureeLisible(r.tempsTotal)) +
      ligne('Dernière activité', echapper(heure(r.derniereActivite)) || '—') +
      '</div>' +
      (bloques.length ? `<p class="pe-bloque">${A.icone('alerte', { epaisseur: 2.4 })}Bloquée sur l’exercice ${bloques.map((id) => `${id} · ${echapper(titre(id))}`).join(', ')}</p>` : '') +
      '</section>' +
      '<section class="pe-carte"><h3>Console Simon</h3><div class="pe-infos">' +
      ligne(`Mon Simon (exercice ${finalDe()})`, d.exercices[finalDe()] && d.exercices[finalDe()].statut === 'reussi' ? 'réussi : prêt pour le Grand Tournoi' : 'pas encore réussi') +
      ligne('Défi', A.exercicesDefis().some((id) => d.exercices[id] && d.exercices[id].statut === 'reussi') ? 'réussi' : '—') +
      ligne('Programme envoyé dans la carte', envois.length ? `${envois.length} fois, dernière le ${echapper(heure(dernierEnvoi.date))}${dernierEnvoi.exercice || dernierEnvoi.version ? ` (exercice ${echapper(dernierEnvoi.exercice || dernierEnvoi.version)})` : ''}` : 'pas encore') +
      '</div></section>' +
      competencesHtml(eq) +
      `<p class="pe-fichier">Fichier : ${echapper(eq.fichier)}</p>` +
      '</div>'
    );
  }

  function listeAffichee() {
    return selection().map((x) => x.eq.cle);
  }

  function ouvrirEquipe(cle) {
    vue.equipe = cle;
    if (vue.nom !== 'equipe') {
      vue.onglet = 'bilan';
      montrerVue('equipe');
    }
    dessinerEquipe(false);
  }

  function dessinerEquipe(miseAJour) {
    const eq = fusion.equipes.find((x) => x.cle === vue.equipe);
    if (!eq) return montrerVue('classe');
    const d = eq.donnees;
    const r = resume(eq);
    const note = r.note;
    // Pendant une mise à jour en direct : garder les historiques ouverts et la position de lecture.
    const ouverts = miseAJour ? new Set($$('.historique[open]').map((x) => x.dataset.ex)) : null;
    const reponses = miseAJour ? new Set($$('.voir-reponses[open]').map((x) => x.closest('.pe-partie').querySelector('h4').textContent)) : null;
    const defilement = miseAJour ? global.scrollY : 0;

    $('.pe-noms').textContent = d.equipe.eleves.join(', ');
    $('.pe-sous-titre').innerHTML = [d.equipe.classe ? 'Classe ' + echapper(d.equipe.classe) : '', `${r.avancement}/${nObligatoires()} exercices`,
      r.bloque ? '<strong class="pe-sous-bloque">⚠ bloquée</strong>' : '', misesAJour.has(eq.cle) ? '<span class="badge-maj">● vient d’avancer</span>' : '']
      .filter(Boolean).join(' · ');
    $('.pe-note-badge').innerHTML = `<b>${A.nombreFr(note.note, 2)}</b><small>/${note.sur}</small>`;
    const liste = listeAffichee();
    const i = liste.indexOf(eq.cle);
    $('.pe-pos').textContent = i >= 0 ? `${i + 1} / ${liste.length}` : '';
    $('.btn-equipe-prec').disabled = i <= 0;
    $('.btn-equipe-suiv').disabled = i < 0 || i >= liste.length - 1;
    for (const b of $$('.pe-onglets [data-onglet]')) b.setAttribute('aria-selected', String(b.dataset.onglet === vue.onglet));

    const box = $('.pe-contenu');
    if (vue.onglet === 'dessins') {
      // Mise à jour en direct : on ne touche pas à la caméra ni à la photo en cours.
      if (!(miseAJour && A.dessins.actif())) A.dessins.monter(box, contexteDessins(eq));
      return;
    }
    A.dessins.arreter();
    if (vue.onglet === 'programmation') box.innerHTML = programmationHtml(d, r, note);
    else if (vue.onglet === 'carnet') box.innerHTML = carnetHtml(d, note);
    else if (vue.onglet === 'historique') box.innerHTML = historiqueHtml(d);
    else box.innerHTML = bilanHtml(eq, d, r, note);

    box.onclick = (ev) => {
      const b = ev.target.closest('button');
      if (!b) return;
      if (b.dataset.ouvrir) return ouvrirDansAtelier(d, b.dataset.ouvrir, d.exercices[b.dataset.ouvrir].programme);
      const [id, k] = (b.dataset.blocs || b.dataset.lancer || '').split('|');
      if (!id) return;
      const programme = d.exercices[id].historique[Number(k)].programme;
      if (b.dataset.lancer) return ouvrirDansAtelier(d, id, programme);
      const zoneBlocs = b.closest('li').querySelector('.ev-blocs');
      if (zoneBlocs.hidden) zoneBlocs.innerHTML = `<div class="labo-blocs">${global.LaboBlocs.blocsHtml(programme, { avecVides: true })}</div>`;
      zoneBlocs.hidden = !zoneBlocs.hidden;
      b.textContent = zoneBlocs.hidden ? 'Voir les blocs' : 'Masquer les blocs';
    };
    if (ouverts) for (const det of $$('.historique')) if (ouverts.has(det.dataset.ex)) det.open = true;
    if (reponses) for (const det of $$('.voir-reponses')) if (reponses.has(det.closest('.pe-partie').querySelector('h4').textContent)) det.open = true;
    if (miseAJour) scrollTo(0, defilement);
  }

  // Onglet « Croquis et dessins » : le dossier de l'équipe, et le droit d'y écrire (demandé au premier enregistrement).
  function contexteDessins(eq) {
    return {
      equipe: A.nomEquipe(eq.donnees.equipe.eleves),
      dossier: (suivi.dossier && dossiersEquipes.get(eq.fichier)) || null,
      async autoriser() {
        const racine = suivi.dossier;
        if (!racine) return false;
        try {
          if ((await racine.queryPermission({ mode: 'readwrite' })) === 'granted') return true;
          return (await racine.requestPermission({ mode: 'readwrite' })) === 'granted';
        } catch {
          return false;
        }
      },
    };
  }

  $('.vue-equipe').addEventListener('change', (e) => {
    const id = e.target.dataset.noteManuelle;
    if (!id) return;
    const eq = fusion.equipes.find(x => x.cle === vue.equipe);
    if (!eq) return;
    const ok = A.notesProf.noter(eq.donnees, id, e.target.value);
    $('.evaluations-stockage').textContent = ok ? 'Évaluations enregistrées sur ce navigateur. Pensez à exporter une sauvegarde.' : 'Stockage indisponible : exportez vos évaluations avant de fermer la page.';
    recalculer();
  });
  $('.pe-onglets').addEventListener('click' , (e) => {
    const b = e.target.closest('[data-onglet]');
    if (!b) return;
    vue.onglet = b.dataset.onglet;
    dessinerEquipe(false);
  });
  $('.btn-retour-classe').addEventListener('click', () => {
    montrerVue('classe');
    dessiner();
  });
  function equipeVoisine(pas) {
    const liste = listeAffichee();
    const i = liste.indexOf(vue.equipe);
    if (i >= 0 && liste[i + pas]) {
      vue.equipe = liste[i + pas];
      dessinerEquipe(false);
      scrollTo(0, 0);
    }
  }
  $('.btn-equipe-prec').addEventListener('click', () => equipeVoisine(-1));
  $('.btn-equipe-suiv').addEventListener('click', () => equipeVoisine(1));
  document.addEventListener('keydown', (e) => {
    if (vue.nom !== 'equipe' || $('.dialogue-reglages').open || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === 'Escape') $('.btn-retour-classe').click();
  });

  // ---------- Exports ----------

  function nomExport(extension) {
    const classe = $('.filtre-classe').value || 'toutes-classes';
    const jour = new Date().toISOString().slice(0, 10);
    return `${A.projet.id}-${classe}-${jour}.${extension}`;
  }
  function telecharger(contenu, type, nom) {
    const url = URL.createObjectURL(new Blob([contenu], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nom;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  $('.btn-csv').addEventListener('click', () => {
    const liste = selection();
    const t = A.tableauClasse(liste.map((x) => x.r), seuils());
    telecharger(A.enCsv(t.entete, [...t.lignes, [], t.legende]), 'text/csv;charset=utf-8', nomExport('csv'));
  });
  // Niveaux par compétence (calculés par Labo Blocs) pour le Carnet de classe : fichier « …labo-resultats.json »,
  // importé dans le Carnet (projet › Notes › « Importer des résultats Labo Blocs »).
  function equipesLaboBlocs(liste) {
    const paquet = A.catalogue.paquet();
    return liste.map((x) => LB.chargerEquipes([{ nom: x.eq.fichier || x.eq.cle + '.json', texte: JSON.stringify(x.eq.donnees) }], [paquet]).equipes[0]).filter(Boolean);
  }
  $('.btn-carnet').addEventListener('click', () => {
    const equipes = equipesLaboBlocs(selection());
    if (!equipes.length) return;
    const r = LB.resultatsClasse(equipes, LB.professeurVide(), { projet: { id: A.projet.projet, titre: A.projet.titre }, paquet: A.catalogue.paquet() });
    telecharger(JSON.stringify(r, null, 2) + '\n', 'application/json', nomExport('labo-resultats.json'));
  });
  $('.btn-xlsx').addEventListener('click', () => {
    const liste = selection();
    const t = A.tableauClasse(liste.map((x) => x.r), seuils());
    const det = A.detailClasse(liste.map((x) => x.eq), seuils(), bareme);
    const octets = A.classeurXlsx([
      { nom: 'Classe', entete: t.entete, lignes: [...t.lignes, [], t.legende] },
      { nom: 'Détail par exercice', entete: det.entete, lignes: det.lignes },
    ]);
    telecharger(octets, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', nomExport('xlsx'));
  });
  $('.btn-imprimer').addEventListener('click', () => global.print());

  // ---------- Barème et réglages ----------

  const dialogueReglages = $('.dialogue-reglages');
  $('.btn-reglages').addEventListener('click', () => dialogueReglages.showModal());
  $('.btn-fermer-reglages').addEventListener('click', () => dialogueReglages.close());

  const zoneBareme = $('.prof-bareme');
  const partieCarnet = (id) => A.partieCarnet(A.carnet, id) || { titre: id };
  function dessinerChoixNotation() {
    const choix = (type, id, titre, coef, mode) => `<div class="choix-notation"><label><input type="checkbox" data-noter="${type}" data-id="${echapper(id)}"${coef > 0 ? ' checked' : ''}> Noter · ${echapper(titre)}</label><span>${mode}</span><label>Coefficient <input type="number" data-${type === 'carnet' ? 'coef-carnet' : 'coef'}="${echapper(id)}" value="${coef}" min="0" max="10" step="0.5"${coef > 0 ? '' : ' disabled'}></label></div>`;
    $('.bareme-coefs').innerHTML = '<h4>Programmation</h4>' + A.exercicesObligatoires().map(id => choix('exercice', id, 'Ex. ' + id + ' · ' + titre(id), bareme.coefficients[id], 'Automatique')).join('') +
      A.exercicesDefis().map(id => `<label class="choix-defi"><input type="checkbox" data-noter-defi="${id}"${!bareme.defis || bareme.defis[id] !== false ? ' checked' : ''}> Noter le défi ${id} en bonus</label>`).join('') +
      '<h4>Carnet de projet</h4>' + A.partiesSuivies(A.carnet, null).map(p => choix('carnet', p.id, p.titre + (p.niveaux ? ' (' + p.niveaux.join(', ') + 'e)' : ''), bareme.carnet[p.id] || 0, ['classement', 'trous'].includes(p.type) ? 'Automatique' : 'Maîtrise sur 4')).join('') +
      '<p>Les pages d’information à lire ne sont pas évaluées.</p>';
  }
  dessinerChoixNotation();
  function remplirBareme() {
    for (const el of zoneBareme.querySelectorAll('[data-b]')) {
      const v = bareme[el.dataset.b];
      el.value = el.hasAttribute('data-pourcent') ? Math.round(v * 100) : String(v);
    }
    for (const el of zoneBareme.querySelectorAll('[data-coef]')) el.value = bareme.coefficients[el.dataset.coef];
    for (const el of zoneBareme.querySelectorAll('[data-coef-carnet]')) el.value = bareme.carnet[el.dataset.coefCarnet];
    dessinerChoixNotation();
    resumerBareme();
  }
  function expliquerCarnet() {
    const pct = (n) => A.nombreFr(100 * n) + ' %';
    const echecsPour = (tentative) => tentative - 1;
    const retenue = (n) => Math.min(bareme.penaliteEchecMax, Math.max(0, n - bareme.essaisGratuits) * bareme.penaliteEchec);
    const points = (niveau) => {
      const programmation = A.exercicesObligatoires().slice(0, bareme.objectif).reduce((s, id) => s + (bareme.coefficients[id] || 0), 0);
      const carnet = Object.entries(bareme.carnet).reduce((s, [id, coef]) => s + (A.partieCarnet(A.carnet, id) && A.pourNiveau(partieCarnet(id), niveau) ? coef : 0), 0);
      return programmation + carnet > 0 ? bareme.sur / (programmation + carnet) : 0;
    };
    const p5 = points('5'), p4 = points('4');
    let h = '<h4>Comment les vérifications du carnet comptent-elles ?</h4>' +
      '<p>Une tentative correspond à un clic sur <strong>« Vérifier » pour toute la partie</strong>, même si plusieurs réponses sont à revoir. Seules les vérifications ratées <strong>avant la première réussite</strong> entraînent une retenue. La vérification réussie et les clics suivants n’enlèvent aucun point.</p>' +
      `<p>Réglage actuel : ${bareme.essaisGratuits} vérification(s) ratée(s) sans retenue, puis <strong>−${pct(bareme.penaliteEchec)} des points de cette partie</strong> par échec supplémentaire, au maximum <strong>−${pct(bareme.penaliteEchecMax)}</strong>. Les mêmes réglages s’appliquent au carnet et à la programmation. Les indices concernent uniquement la programmation.</p>` +
      `<p><strong>Exemple théorique, partie de coefficient 1 :</strong> elle vaut ${A.nombreFr(p5, 2)} point(s) en 5e et ${A.nombreFr(p4, 2)} point(s) en 4e, si toutes les parties cochées sont déjà évaluées, avant l’arrondi de la note finale. Une partie manuelle encore « À évaluer » reste hors du total de l’équipe. Ces valeurs suivent les coefficients et l’objectif choisis.</p>` +
      '<div class="table-defile"><table class="bareme-table-exemple"><thead><tr><th>Première réussite</th><th>Vérifications ratées avant</th><th>Retenue sur cette partie</th><th>Points conservés</th><th>Points en 5e / en 4e</th></tr></thead><tbody>';
    for (let t = 1; t <= 7; t++) {
      const r = retenue(echecsPour(t));
      h += `<tr><th>${t === 1 ? '1er clic' : t + 'e clic'}</th><td>${t - 1}</td><td>−${pct(r)}</td><td>${pct(1 - r)}</td><td>${A.nombreFr(p5 * (1 - r), 2)} / ${A.nombreFr(p4 * (1 - r), 2)}</td></tr>`;
    }
    h += '</tbody></table></div>' +
      `<p><strong>Parties corrigées automatiquement, pas encore réussies :</strong> après au moins une vérification, la partie rapporte ${pct(bareme.participation)} de ses points (participation). Sans vérification : 0. Les parties non notées et celles d’un autre niveau ne comptent pas.</p>` +
      '<p>Pour supprimer les pertes liées aux tentatives, réglez « Retenue par vérification ratée supplémentaire » sur 0 %. Pour autoriser un premier essai sans perte, réglez « Vérifications ratées sans retenue » sur 1.</p>';
    $('.bareme-exemple-carnet').innerHTML = h;
  }
  function resumerBareme() {
    expliquerCarnet();
    $('.bareme-resume').textContent =
      `· sur ${bareme.sur}, ${bareme.objectif} exercices attendus, −${Math.round(bareme.penaliteIndice * 100)} % par indice, ` +
      `−${Math.round(bareme.penaliteEchec * 100)} % par essai raté${bareme.essaisGratuits ? ` au-delà de ${bareme.essaisGratuits}` : ''}, ` +
      `avance : ${Math.round(bareme.avance * 100)} %, ` +
      `commencé : ${Math.round(bareme.participation * 100)} %, bonus par défi : +${A.nombreFr(bareme.bonusDefi)}`;
  }
  function apresBareme() {
    const ok = A.notesProf.regler(bareme);
    $('.evaluations-stockage').textContent = ok ? 'Barème conservé sur ce navigateur. Exportez vos évaluations pour les sauvegarder.' : 'Stockage indisponible : exportez vos évaluations.';
    resumerBareme();
    dessiner();
    if (vue.nom === 'equipe') dessinerEquipe(true);
  }
  zoneBareme.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.noter) {
      const coefs = el.dataset.noter === 'carnet' ? bareme.carnet : bareme.coefficients;
      coefs[el.dataset.id] = el.checked ? (coefs[el.dataset.id] || 1) : 0;
      dessinerChoixNotation(); apresBareme(); return;
    }
    if (el.dataset.noterDefi) { bareme.defis = Object.assign({}, bareme.defis, { [el.dataset.noterDefi]: el.checked }); apresBareme(); return; }
    const v = Number(el.value);
    if (el.value === '' || !Number.isFinite(v) || v < 0 || (el.type === 'number' && !el.checkValidity())) return;
    if (el.dataset.coef) bareme.coefficients[el.dataset.coef] = v;
    else if (el.dataset.coefCarnet) bareme.carnet[el.dataset.coefCarnet] = v;
    else if (el.dataset.b) bareme[el.dataset.b] = el.hasAttribute('data-pourcent') ? v / 100 : v;
    if ((el.dataset.coef || el.dataset.coefCarnet) && v === 0) dessinerChoixNotation();
    apresBareme();
  });
  $('.btn-bareme-fichier').addEventListener('click', () => {
    bareme = A.completerBareme(A.bareme);
    for (const p of A.partiesSuivies(A.carnet, null)) if (!(p.id in bareme.carnet)) bareme.carnet[p.id] = 0;
    remplirBareme();
    apresBareme();
  });
  $('.btn-export-evaluations').addEventListener('click', () => {
    A.notesProf.regler(bareme);
    const url = URL.createObjectURL(new Blob([A.notesProf.texte()], {type:'application/json'}));
    const a = document.createElement('a'); a.href = url; a.download = A.projet.id + '-evaluations-prof.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  });
  $('.import-evaluations').addEventListener('change', async e => {
    const fichier = e.target.files[0]; if (!fichier) return;
    try { const ok = A.notesProf.importer(await fichier.text()); bareme = A.completerBareme(A.notesProf.bareme()); for (const p of A.partiesSuivies(A.carnet, null)) if (!(p.id in bareme.carnet)) bareme.carnet[p.id] = 0; remplirBareme(); recalculer(); $('.evaluations-stockage').textContent = ok ? 'Évaluations et barème importés.' : 'Importés en mémoire seulement : exportez avant de fermer.'; }
    catch (err) { $('.evaluations-stockage').textContent = err.message || 'La sauvegarde ne peut pas être importée.'; }
    e.target.value = '';
  });
  remplirBareme();
  montrerVue('accueil');
})(this);
