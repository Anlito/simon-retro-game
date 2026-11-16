// Cache de développement téléchargé, exclu du dépôt et de l'archive du site.
const fs = require('node:fs');
const path = require('node:path');
const cache = path.join(__dirname, '..', '.cache', 'labo-blocs');
const noyau = path.join(cache, 'labo-blocs-noyau.js');
const parcours = path.join(cache, 'simon.js');
const parcours5e = path.join(cache, 'simon-5e.js');
async function preparer() {
  fs.mkdirSync(cache, {recursive:true});
  for (const [url, fichier] of [
    ['module/labo-blocs-noyau.js', noyau],
    ['parcours/simon/parcours.js', parcours],
    ['parcours/simon-5e/parcours.js', parcours5e],
  ]) {
    // Essai avant publication : LABO_BLOCS=C:/…/labo-blocs (parcours lus dans le dossier local).
    if (process.env.LABO_BLOCS && url.startsWith('parcours/')) { fs.copyFileSync(path.join(process.env.LABO_BLOCS, url), fichier); continue; }
    const r = await fetch('https://anlito.github.io/labo-blocs/' + url, {signal:AbortSignal.timeout(20000)});
    if (!r.ok) throw new Error('Dépendance Labo Blocs indisponible : ' + url);
    fs.writeFileSync(fichier, await r.text());
  }
}
if (require.main === module) preparer().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports = {noyau,parcours,parcours5e};
