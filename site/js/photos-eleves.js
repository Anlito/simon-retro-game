// Photos du professeur : lecture seule des JPG du dossier de l'équipe.
// Les photos restent hors du JSON élève : aucune écriture concurrente avec le professeur.
(function (global) {
  'use strict';
  const A = global.Atelier;
  const echapper = (s) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const cle = d => JSON.stringify([d.equipe.classe || '', A.nomEquipe(d.equipe.eleves)]);
  function base() { return new Promise((ok, ko) => { const r = indexedDB.open(A.projet.id + '-photos', 1); r.onupgradeneeded = () => r.result.createObjectStore('dossiers'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); }); }
  async function memoriserDossier(d, dossier) {
    try { const db = await base(); await new Promise((ok, ko) => { const t = db.transaction('dossiers', 'readwrite'); t.objectStore('dossiers').put(dossier, cle(d)); t.oncomplete = ok; t.onerror = () => ko(t.error); }); db.close(); } catch { /* dossier redemandé au prochain clic */ }
  }
  async function retrouver(d) {
    try { const db = await base(); const h = await new Promise((ok, ko) => { const r = db.transaction('dossiers').objectStore('dossiers').get(cle(d)); r.onsuccess = () => ok(r.result || null); r.onerror = () => ko(r.error); }); db.close(); return h; } catch { return null; }
  }
  async function verifierDossier(dossier, session) {
    const nom = session.handle ? session.handle.name : A.fichiers.nomFichier(session.donnees);
    const h = await dossier.getFileHandle(nom);
    if (session.handle && typeof h.isSameEntry === 'function') return h.isSameEntry(session.handle);
    const r = A.lireSauvegarde(await (await h.getFile()).text());
    return r.ok && cle(r.donnees) === cle(session.donnees);
  }
  function monter(zone, session) {
    let actif = true, dossier = session.dossier || null, urls = [], lecture = 0, signature = null;
    zone.innerHTML = '<h3>Le croquis et la console de notre équipe</h3><p>Les photos prises par ton professeur s’affichent ici depuis le dossier de ton équipe.</p>' +
      '<div class="photos-actions"><button type="button" class="btn-secondaire photos-ouvrir" hidden>Ouvrir le dossier de notre équipe</button><button type="button" class="btn-secondaire photos-actualiser">Actualiser les photos</button>' +
      '<label class="btn-secondaire photos-importer" hidden>Ouvrir des photos…<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden></label></div><p class="photos-etat" role="status"></p><div class="photos-galerie"></div>';
    const $ = s => zone.querySelector(s);
    function liberer() { urls.forEach(u => URL.revokeObjectURL(u)); urls = []; }
    function message(s) { if (actif) $('.photos-etat').textContent = s; }
    function afficher(fichiers) {
      if (!actif) return;
      const sig = fichiers.map(f => f.name + '|' + f.size + '|' + f.lastModified).join(';');
      if (signature === sig) return;
      signature = sig; liberer();
      const image = f => { const url = URL.createObjectURL(f); urls.push(url); return `<figure><a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="Photo : ${echapper(f.name)}" loading="lazy"></a><figcaption>${echapper(f.name)}</figcaption></figure>`; };
      const finales = fichiers.filter(f => /^Realisation_finale_/i.test(f.name));
      const plans = fichiers.filter(f => !/^Realisation_finale_/i.test(f.name));
      $('.photos-galerie').innerHTML = '<section class="photos-categorie"><h4>Le croquis du boîtier</h4><div class="photos-vignettes">' + (plans.map(image).join('') || '<p>Pas encore de photo du croquis.</p>') + '</div></section>' +
        '<section class="photos-categorie"><h4>La console assemblée</h4><div class="photos-vignettes">' + (finales.map(image).join('') || '<p>Pas encore de photo de la console.</p>') + '</div></section>';
      message(fichiers.length ? `${fichiers.length} photo(s). Clique sur une photo pour l’agrandir. Les nouvelles photos apparaissent automatiquement.` : 'Le professeur n’a pas encore ajouté de photo dans votre dossier. Elles apparaîtront ici après leur enregistrement.');
    }
    async function actualiser() {
      dossier = dossier || session.dossier;
      if (!actif) return;
      if (!dossier) { $('.photos-ouvrir').hidden = false; $('.photos-importer').hidden = false; message('Vous avez ouvert seulement un fichier. Ouvre le dossier de votre équipe pour afficher les photos.'); return; }
      const numero = ++lecture;
      try {
        if (dossier.queryPermission && await dossier.queryPermission({mode:'read'}) !== 'granted') { $('.photos-ouvrir').hidden = false; $('.photos-ouvrir').textContent = 'Autoriser l’affichage des photos'; message('Le navigateur demande de renouveler l’autorisation de lecture du dossier.'); return; }
        $('.photos-ouvrir').hidden = true; $('.photos-importer').hidden = true;
        const fichiers = [];
        for await (const h of dossier.values()) if (h.kind === 'file' && /^(Croquis|Dessin_technique|Feuille|Realisation_finale)_.*\.(jpe?g|png|webp)$/i.test(h.name)) fichiers.push(await h.getFile());
        fichiers.sort((a,b) => b.lastModified-a.lastModified);
        if (actif && numero === lecture) { $('.photos-actualiser').hidden = false; afficher(fichiers); }
      } catch { $('.photos-ouvrir').hidden = false; message('Le dossier n’est pas accessible. Ouvre à nouveau le dossier de votre équipe.'); }
    }
    $('.photos-ouvrir').addEventListener('click', async () => {
      if (!global.showDirectoryPicker) { message('Utilise « Ouvrir des photos… » et sélectionne les photos de ton équipe dans son dossier.'); return; }
      try {
        if (dossier && await dossier.requestPermission({mode:'read'}) === 'granted') { await actualiser(); return; }
        const choisi = await showDirectoryPicker({id:A.projet.id+'-photos',mode:'read'});
        if (!await verifierDossier(choisi, session)) { message('Ce dossier ne contient pas votre sauvegarde. Choisis le dossier de ton équipe.'); return; }
        if (!actif) return;
        dossier = choisi; session.dossier = choisi; await memoriserDossier(session.donnees, choisi); document.dispatchEvent(new CustomEvent('atelier:photos-dossier', { detail: session })); await actualiser();
      } catch (e) { if (e.name !== 'AbortError') message('Choisis le dossier contenant votre fichier de travail et les photos du professeur.'); }
    });
    $('.photos-actualiser').addEventListener('click', actualiser);
    $('.photos-importer input').addEventListener('change', e => { signature = null; afficher([...e.target.files]); });
    const surDossier = e => { if (e.detail === session) actualiser(); };
    document.addEventListener('atelier:photos-dossier', surDossier);
    message('Chargement des photos de votre équipe…');
    (async () => { dossier = dossier || await retrouver(session.donnees); if (actif) { if (dossier) session.dossier = dossier; await actualiser(); } })();
    const surRetour = () => { if (document.visibilityState === 'visible') actualiser(); };
    global.addEventListener('focus', surRetour); document.addEventListener('visibilitychange', surRetour);
    const minuteur = setInterval(() => { if (document.visibilityState === 'visible' && (dossier || session.dossier)) actualiser(); }, 15000);
    return () => { actif = false; lecture++; clearInterval(minuteur); global.removeEventListener('focus', surRetour); document.removeEventListener('visibilitychange', surRetour); document.removeEventListener('atelier:photos-dossier', surDossier); liberer(); };
  }
  A.photos = { monter, memoriserDossier, verifierDossier, retrouver };
})(this);
