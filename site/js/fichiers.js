// Fichier de l'équipe : choix du dossier, ouverture, enregistrement, copie de secours.
// Chrome (et Edge) : on choisit le dossier de l'équipe une fois, puis le fichier s'y réécrit tout seul.
// Firefox : pas d'accès aux dossiers ; « Enregistrer » télécharge le fichier, à ranger ensuite.
(function (global) {
  'use strict';

  const A = global.Atelier;
  const CLE_SECOURS = A.projet.id + '-secours';

  const accesDossiers = typeof global.showDirectoryPicker === 'function';
  const accesFichiers = typeof global.showOpenFilePicker === 'function' && typeof global.showSaveFilePicker === 'function';
  const TYPES = [{ description: 'Sauvegarde de l’atelier', accept: { 'application/json': ['.json'] } }];

  const nomFichier = (donnees) => A.nomEquipe(donnees.equipe.eleves) + '.json';
  const texte = (donnees) => JSON.stringify(donnees, null, 1);

  // Droit d'écrire dans le fichier. demander = false : on regarde seulement, sans afficher la fenêtre
  // « Autoriser ce site à modifier … ? » (elle n'est montrée qu'au premier vrai travail de l'équipe).
  async function autorise(handle, demander) {
    const options = { mode: 'readwrite' };
    if ((await handle.queryPermission(options)) === 'granted') return true;
    if (demander === false) return false;
    return (await handle.requestPermission(options)) === 'granted';
  }

  async function lireHandle(handle) {
    return A.lireSauvegarde(await (await handle.getFile()).text());
  }

  // ---------- Choix du dossier de l'équipe (nouvelle équipe) ----------

  // Renvoie { dossier, nom } ou null si l'élève a fermé la fenêtre.
  async function choisirDossier() {
    try {
      const dossier = await global.showDirectoryPicker({ id: A.projet.id, mode: 'readwrite' });
      return { dossier, nom: dossier.name };
    } catch (e) {
      if (e && e.name === 'AbortError') return null;
      throw e;
    }
  }

  // Le dossier choisi est-il celui de l'équipe, le dossier du projet (ex. SIMON RETRO GAME), ou un autre ?
  // parent : nom du dossier du projet attendu (avant-dernier dossier du chemin).
  function analyserDossier(nomDossier, equipe, parent) {
    const s = A.simplifierNom(nomDossier);
    if (s === A.simplifierNom(equipe)) return 'equipe';
    if (parent && s === A.simplifierNom(parent)) return 'parent';
    if (s === A.simplifierNom(A.projet.dossier)) return 'parent';
    return 'autre';
  }

  async function creerSousDossier(dossier, nom) {
    return dossier.getDirectoryHandle(nom, { create: true });
  }

  // Une sauvegarde existe-t-elle déjà dans ce dossier ? On regarde tous les fichiers .json, pour ne pas
  // créer un deuxième fichier si l'équipe a écrit son prénom autrement (« Lea » au lieu de « Léa »).
  // Renvoie d'abord le fichier au nom de l'équipe, sinon la première sauvegarde valide, sinon un .json
  // invalide qui porte le nom de l'équipe (à ne pas écraser), sinon null.
  async function sauvegardeExistante(dossier, nom) {
    const cible = A.simplifierNom(nom.replace(/\.json$/i, ''));
    let premiere = null;
    let homonymeInvalide = null;
    try {
      for await (const entree of dossier.values()) {
        if (entree.kind !== 'file' || !/\.json$/i.test(entree.name)) continue;
        let lecture;
        try {
          lecture = await lireHandle(entree);
        } catch {
          continue;
        }
        const memeNom = A.simplifierNom(entree.name.replace(/\.json$/i, '')) === cible;
        if (lecture.ok && memeNom) return { handle: entree, lecture };
        if (lecture.ok && !premiere) premiere = { handle: entree, lecture };
        if (!lecture.ok && memeNom) homonymeInvalide = { handle: entree, lecture };
      }
    } catch {
      return null;
    }
    return premiere || homonymeInvalide;
  }

  async function fichierDansDossier(dossier, nom) {
    return dossier.getFileHandle(nom, { create: true });
  }

  // ---------- Ouvrir une sauvegarde ----------

  // Renvoie { lecture, handle } (handle nul sur Firefox) ou null si annulé.
  async function ouvrirFichier() {
    if (accesFichiers) {
      let handle;
      try {
        [handle] = await global.showOpenFilePicker({ id: A.projet.id, types: TYPES, multiple: false });
      } catch (e) {
        if (e && e.name === 'AbortError') return null;
        throw e;
      }
      const lecture = await lireHandle(handle);
      return { lecture, handle };
    }
    // Repli : sélecteur de fichier classique.
    return new Promise((resoudre) => {
      const entree = document.createElement('input');
      entree.type = 'file';
      entree.accept = '.json,application/json';
      entree.addEventListener('change', async () => {
        const f = entree.files && entree.files[0];
        if (!f) return resoudre(null);
        resoudre({ lecture: A.lireSauvegarde(await f.text()), handle: null });
      });
      entree.addEventListener('cancel', () => resoudre(null));
      entree.click();
    });
  }

  // Ouvrir le dossier donne accès au JSON et aux images en un seul choix.
  async function ouvrir(options) {
    if (!accesDossiers || (options && options.fichier)) return ouvrirFichier();
    let dossier;
    try { dossier = await global.showDirectoryPicker({ id: A.projet.id + '-ouvrir', mode: 'readwrite' }); }
    catch (e) { if (e.name === 'AbortError') return null; throw e; }
    const candidats = [];
    for await (const h of dossier.values()) {
      if (h.kind !== 'file' || !/\.json$/i.test(h.name)) continue;
      try { const lecture = await lireHandle(h); if (lecture.ok) candidats.push({handle:h,lecture,dossier}); } catch { /* fichier illisible : jamais modifié */ }
    }
    const identite = d => JSON.stringify([d.equipe.classe || '', [...d.equipe.eleves].sort()]);
    if (!candidats.length) return {lecture:{ok:false,raison:'Ce dossier ne contient pas de sauvegarde du Simon. Choisis le dossier de ton équipe.'}};
    if (new Set(candidats.map(c => identite(c.lecture.donnees))).size > 1) return {lecture:{ok:false,raison:'Ce dossier contient plusieurs équipes. Ouvre uniquement le sous-dossier de ton équipe.'}};
    candidats.sort((a,b) => String(b.lecture.donnees.modifieLe || '').localeCompare(String(a.lecture.donnees.modifieLe || '')));
    return candidats[0];
  }

  // ---------- Enregistrer ----------

  // Écrit dans le fichier connu si possible. Renvoie { ok, handle, telecharge }.
  async function enregistrer(donnees, handle, options) {
    const o = options || {};
    if (handle) {
      if (!(await autorise(handle, !o.silencieux))) {
        if (o.silencieux) return { ok: false, handle, permission: true };
        throw new Error('permission');
      }
      const flux = await handle.createWritable();
      await flux.write(texte(donnees));
      await flux.close();
      return { ok: true, handle };
    }
    if (o.silencieux) return { ok: false, handle: null };
    if (accesFichiers) {
      let nouveau;
      try {
        nouveau = await global.showSaveFilePicker({ id: A.projet.id, suggestedName: nomFichier(donnees), types: TYPES });
      } catch (e) {
        if (e && e.name === 'AbortError') return { ok: false, handle: null };
        throw e;
      }
      return enregistrer(donnees, nouveau);
    }
    // Firefox : téléchargement classique.
    const url = URL.createObjectURL(new Blob([texte(donnees)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nomFichier(donnees);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return { ok: true, handle: null, telecharge: true };
  }

  // ---------- Fichier de l'équipe mémorisé entre deux ouvertures de la page (IndexedDB) ----------

  function base() {
    return new Promise((resoudre, rejeter) => {
      const r = indexedDB.open(A.projet.id, 1);
      r.onupgradeneeded = () => r.result.createObjectStore('fichiers');
      r.onsuccess = () => resoudre(r.result);
      r.onerror = () => rejeter(r.error);
    });
  }
  async function memoriserHandle(handle) {
    try {
      const db = await base();
      await new Promise((ok, ko) => {
        const t = db.transaction('fichiers', 'readwrite');
        if (handle) t.objectStore('fichiers').put(handle, 'equipe');
        else t.objectStore('fichiers').delete('equipe');
        t.oncomplete = ok;
        t.onerror = () => ko(t.error);
      });
    } catch {
      /* stockage indisponible : on redemandera le fichier */
    }
  }
  async function handleMemorise() {
    try {
      const db = await base();
      return await new Promise((ok) => {
        const r = db.transaction('fichiers').objectStore('fichiers').get('equipe');
        r.onsuccess = () => ok(r.result || null);
        r.onerror = () => ok(null);
      });
    } catch {
      return null;
    }
  }

  // ---------- Copie de secours dans le navigateur ----------

  function sauverSecours(donnees) {
    try {
      localStorage.setItem(CLE_SECOURS, JSON.stringify(donnees));
    } catch {
      /* navigation privée ou stockage plein */
    }
  }
  function lireSecours() {
    try {
      const t = localStorage.getItem(CLE_SECOURS);
      if (!t) return null;
      const r = A.lireSauvegarde(t);
      return r.ok ? r.donnees : null;
    } catch {
      return null;
    }
  }
  function effacerSecours() {
    try {
      localStorage.removeItem(CLE_SECOURS);
    } catch {
      /* rien */
    }
  }

  A.fichiers = {
    accesDossiers,
    accesFichiers,
    nomFichier,
    choisirDossier,
    analyserDossier,
    creerSousDossier,
    sauvegardeExistante,
    fichierDansDossier,
    ouvrir,
    enregistrer,
    autorise,
    memoriserHandle,
    handleMemorise,
    sauverSecours,
    lireSecours,
    effacerSecours,
  };
})(this);
