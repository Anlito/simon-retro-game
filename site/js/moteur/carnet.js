// Carnet de projet : état dans le fichier de l'équipe, corrections et avancement, d'après la description du carnet
// (donnees/carnet.js : onglets et parties typées). Ce fichier ne connaît aucun texte du projet.
//
// Dans le fichier de l'équipe, rubrique « carnet » :
//   reponses       { idPartie: réponse }  (forme selon le type : voir reponseVide)
//   verifications  { idPartie: [{ date, reussi, bien, total }] }  chaque clic sur « Vérifier » (lu par la note)
// Les réponses sont gardées sous l'identifiant de la partie, et pour un classement sous le NOM de l'élément (et non
// sa position) : une correction de donnees/carnet.js par le professeur ne mélange pas les réponses.

(function (global) {
  'use strict';

  // Types de parties : ceux qui ont une réponse et un état (les autres sont seulement à lire ou ailleurs).
  // image : captures collées (Ctrl+V) ou choisies, réduites et gardées dans le fichier de l'équipe ;
  // fichier : un document déposé dans le dossier de l'équipe (ex. l'affiche en PDF), seul son nom est gardé ici.
  const AVEC_ETAT = ['classement', 'trous', 'questions', 'tableau', 'cases', 'choix', 'echelle', 'image', 'fichier'];
  // Types corrigés par « Vérifier ».
  const CORRIGES = ['classement', 'trous'];

  function vide() {
    return { reponses: {}, verifications: {} };
  }

  function completer(c) {
    const r = Object.assign(vide(), c && typeof c === 'object' ? c : {});
    r.reponses = r.reponses && typeof r.reponses === 'object' ? r.reponses : {};
    r.verifications = r.verifications && typeof r.verifications === 'object' ? r.verifications : {};
    return r;
  }

  // ---------- Description du carnet ----------

  // « 5A » → « 5 », « 4D1 » → « 4 » ; sans classe (mode enseignant) : null, toutes les parties sont montrées.
  function niveauDe(classe) {
    const m = /^\s*(\d)/.exec(String(classe || ''));
    return m ? m[1] : null;
  }
  const pourNiveau = (p, niveau) => !niveau || !Array.isArray(p.niveaux) || !p.niveaux.length || p.niveaux.includes(String(niveau));

  function partie(C, id) {
    return ((C && C.parties) || []).find((p) => p.id === id) || null;
  }
  // Onglets montrés à ce niveau, avec leurs parties (un onglet sans partie pour ce niveau disparaît).
  function onglets(C, niveau) {
    return ((C && C.onglets) || [])
      .map((o) => Object.assign({}, o, { parties: (o.parties || []).map((id) => partie(C, id)).filter((p) => p && pourNiveau(p, niveau)) }))
      .filter((o) => o.parties.length);
  }
  // Parties qui ont un état (fait / en cours / à faire), à ce niveau, dans l'ordre des onglets.
  function partiesSuivies(C, niveau) {
    const r = [];
    for (const o of onglets(C, niveau)) for (const p of o.parties) if (AVEC_ETAT.includes(p.type)) r.push(p);
    return r;
  }

  // ---------- Cases à compléter (« texte [[réponse]] texte ») ----------

  // Une ligne → morceaux : { texte } ou { trou: n°, reponse }.
  function morceaux(ligne) {
    const r = [];
    const re = /\[\[([^\]]+)\]\]/g;
    let dernier = 0;
    let n = 0;
    let m;
    while ((m = re.exec(ligne))) {
      if (m.index > dernier) r.push({ texte: ligne.slice(dernier, m.index) });
      r.push({ trou: n++, reponse: m[1] });
      dernier = re.lastIndex;
    }
    if (dernier < ligne.length) r.push({ texte: ligne.slice(dernier) });
    return r;
  }
  // Toutes les cases d'une partie « trous » : { cle: 'ligne.trou', reponse }.
  function trousDe(p) {
    const r = [];
    (p.lignes || []).forEach((l, i) => morceaux(l).forEach((m) => m.trou !== undefined && r.push({ cle: `${i}.${m.trou}`, reponse: m.reponse })));
    return r;
  }

  // ---------- Réponses ----------

  function reponseVide(p) {
    switch (p.type) {
      case 'questions':
        return (p.questions || []).map(() => '');
      case 'tableau':
        return lignesTableau(p).map(() => (p.colonnes || []).map(() => ''));
      case 'cases':
        return (p.cases || []).map(() => false);
      case 'choix':
        return { choisis: [], texte: '' };
      case 'image':
        return { images: [] }; // [{ nom, date, donnees: 'data:image/jpeg;base64,…' }]
      case 'fichier':
        return { nom: '', date: '', taille: 0 };
      default:
        return {};
    }
  }
  // Lignes d'un tableau : un nombre de lignes vides, ou des titres de ligne (première colonne déjà écrite).
  function lignesTableau(p) {
    return Array.isArray(p.lignes) ? p.lignes : Array.from({ length: Number(p.lignes) || 3 }, () => null);
  }
  // Réponse de l'équipe pour une partie (créée vide au besoin, toujours de la bonne forme).
  function reponse(carnet, p) {
    const r = carnet.reponses[p.id];
    const v = reponseVide(p);
    if (r === undefined || r === null) return (carnet.reponses[p.id] = v);
    if (Array.isArray(v)) {
      if (!Array.isArray(r)) return (carnet.reponses[p.id] = v);
      while (r.length < v.length) r.push(v[r.length]);
      if (p.type === 'tableau') r.forEach((ligne, i) => { if (!Array.isArray(ligne)) r[i] = v[i] || []; });
    }
    return r;
  }

  // Un élément renommé dans donnees/carnet.js (« ancienNom ») : la réponse déjà placée suit le nouveau nom.
  function harmoniser(carnet, C) {
    for (const p of (C && C.parties) || []) {
      if (p.type !== 'classement' || !carnet.reponses[p.id]) continue;
      const r = carnet.reponses[p.id];
      for (const e of p.elements || []) {
        if (e.ancienNom && r[e.ancienNom] && !r[e.nom]) {
          r[e.nom] = r[e.ancienNom];
          delete r[e.ancienNom];
        }
      }
    }
    return carnet;
  }

  // ---------- Corrections ----------

  // placements : { nomElement: cléColonne }
  function corrigerClassement(placements, elements) {
    const mal = [];
    const nonPlaces = [];
    let bien = 0;
    for (const e of elements || []) {
      const x = placements[e.nom];
      if (!x) nonPlaces.push(e.nom);
      else if (x === e.place) bien++;
      else mal.push(e.nom);
    }
    const total = (elements || []).length;
    return { total, bien, mal, nonPlaces, reussi: total > 0 && bien === total };
  }

  // Cases à compléter : { cle: texte choisi }
  function corrigerTrous(choisis, p) {
    const mal = [];
    const vides = [];
    let bien = 0;
    const trous = trousDe(p);
    for (const t of trous) {
      const x = choisis[t.cle];
      if (!x) vides.push(t.cle);
      else if (x === t.reponse) bien++;
      else mal.push(t.cle);
    }
    return { total: trous.length, bien, mal, vides, reussi: trous.length > 0 && bien === trous.length };
  }

  // Correction d'une partie corrigée par « Vérifier » ; le message décrit, sans jamais donner la réponse.
  function corriger(carnet, p) {
    const rep = reponse(carnet, p);
    const pluriel = (n, un, plusieurs) => (n > 1 ? plusieurs : un);
    if (p.type === 'classement') {
      const r = corrigerClassement(rep, p.elements);
      const m = [];
      if (r.mal.length) m.push(`${r.mal.length} élément${pluriel(r.mal.length, ' est', 's sont')} dans une autre colonne que la sienne (marqué${pluriel(r.mal.length, '', 's')} « à revoir »)`);
      if (r.nonPlaces.length) m.push(`${r.nonPlaces.length} élément${pluriel(r.nonPlaces.length, ' n’est', 's ne sont')} pas encore placé${pluriel(r.nonPlaces.length, '', 's')}`);
      r.message = `${r.bien} sur ${r.total} ${pluriel(r.bien, 'est bien placé', 'sont bien placés')}${m.length ? '. ' + m.join(' et ') : ''}.`;
      r.aRevoir = r.mal;
      return r;
    }
    if (p.type === 'trous') {
      const r = corrigerTrous(rep, p);
      const m = [];
      if (r.mal.length) m.push(`${r.mal.length} case${pluriel(r.mal.length, ' est', 's sont')} à revoir`);
      if (r.vides.length) m.push(`${r.vides.length} case${pluriel(r.vides.length, ' est encore vide', 's sont encore vides')}`);
      r.message = `${r.bien} case${pluriel(r.bien, '', 's')} sur ${r.total} ${pluriel(r.bien, 'est juste', 'sont justes')}${m.length ? '. ' + m.join(' et ') : ''}.`;
      r.aRevoir = r.mal;
      return r;
    }
    return null;
  }

  // ---------- Avancement ----------

  const remplie = (t, min) => typeof t === 'string' && t.trim().length >= (min || 1);
  const reussie = (c, id) => ((c.verifications || {})[id] || []).some((v) => v.reussi);
  const verifiee = (c, id) => ((c.verifications || {})[id] || []).length > 0;

  // État d'une partie : 'fait' | 'en_cours' | 'a_faire' (null : partie sans état, à lire seulement).
  function etatPartie(carnet, p) {
    if (!AVEC_ETAT.includes(p.type)) return null;
    const c = completer(carnet);
    const r = c.reponses[p.id];
    const compte = (faits, total) => (total && faits >= total ? 'fait' : faits ? 'en_cours' : 'a_faire');
    switch (p.type) {
      case 'classement':
      case 'trous': {
        if (reussie(c, p.id)) return 'fait';
        return (r && Object.keys(r).length) || verifiee(c, p.id) ? 'en_cours' : 'a_faire';
      }
      case 'image':
        return compte(r && Array.isArray(r.images) ? r.images.length : 0, p.nombre || 1);
      case 'fichier':
        return r && remplie(r.nom) ? 'fait' : 'a_faire';
      case 'questions':
        return compte((Array.isArray(r) ? r : []).filter((t) => remplie(t, 3)).length, (p.questions || []).length);
      case 'tableau': {
        // Fait : au moins une ligne entièrement remplie (les titres de ligne déjà écrits ne comptent pas à remplir).
        const lignes = Array.isArray(r) ? r : [];
        const titres = Array.isArray(p.lignes);
        const pleine = (l) => Array.isArray(l) && l.every((x, j) => (titres && j === 0) || remplie(x));
        const entamee = (l) => Array.isArray(l) && l.some((x, j) => !(titres && j === 0) && remplie(x));
        return lignes.some(pleine) ? 'fait' : lignes.some(entamee) ? 'en_cours' : 'a_faire';
      }
      case 'cases':
        return compte((Array.isArray(r) ? r : []).filter(Boolean).length, (p.cases || []).length);
      case 'choix': {
        const choisi = r && Array.isArray(r.choisis) && r.choisis.length > 0;
        if (!choisi) return r && remplie(r.texte) ? 'en_cours' : 'a_faire';
        return !p.question || remplie(r.texte, 3) ? 'fait' : 'en_cours';
      }
      case 'echelle':
        return compte(Object.keys(r || {}).length, (p.lignes || []).length);
    }
    return 'a_faire';
  }

  function etats(carnet, C, niveau) {
    const e = {};
    for (const p of partiesSuivies(C, niveau)) e[p.id] = etatPartie(carnet, p);
    return e;
  }

  // { fait, total } : parties faites parmi celles suivies à ce niveau.
  function avancementCarnet(carnet, C, niveau) {
    const e = etats(carnet, C, niveau);
    const ids = Object.keys(e);
    return { fait: ids.filter((id) => e[id] === 'fait').length, total: ids.length };
  }

  const maintenant = () => {
    const d = new Date();
    const z = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`;
  };

  // Chaque clic sur « Vérifier » d'une partie du carnet est gardé (pour le professeur et la note).
  function noterVerificationCarnet(donnees, idPartie, resultat) {
    donnees.carnet = completer(donnees.carnet);
    const v = (donnees.carnet.verifications[idPartie] = donnees.carnet.verifications[idPartie] || []);
    v.push({ date: maintenant(), reussi: !!resultat.reussi, bien: resultat.bien, total: resultat.total });
    donnees.modifieLe = maintenant();
  }

  // Parties notées (« note »: true) et corrigées : celles que lit la note de l'outil professeur.
  function partiesNotees(C) {
    return ((C && C.parties) || []).filter((p) => p.note && CORRIGES.includes(p.type));
  }

  const api = {
    TYPES_AVEC_ETAT: AVEC_ETAT,
    TYPES_CORRIGES: CORRIGES,
    carnetVide: vide,
    completerCarnet: completer,
    niveauDe,
    pourNiveau,
    partieCarnet: partie,
    ongletsCarnet: onglets,
    partiesSuivies,
    partiesNotees,
    morceauxTrous: morceaux,
    trousDe,
    lignesTableau,
    reponseCarnet: reponse,
    harmoniserCarnet: harmoniser,
    corrigerClassement,
    corrigerTrous,
    corrigerPartie: corriger,
    etatPartie,
    etatsCarnet: etats,
    avancementCarnet,
    noterVerificationCarnet,
    horodatage: maintenant,
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else Object.assign((global.Atelier = global.Atelier || {}), api);
})(this);
