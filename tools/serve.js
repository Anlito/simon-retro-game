// Petit serveur local pour essayer le site sur son ordinateur : npm start
// puis ouvrir http://localhost:8080 dans Chrome ou Firefox.
// (Le site marche aussi en ouvrant directement site/index.html, sans serveur.)

const { createServer } = require('node:http');
const { readFile, stat } = require('node:fs/promises');
const { join, extname, normalize } = require('node:path');

// SITE : autre dossier à servir (recette : copie du site où l'on installe une mise à jour des exercices).
const RACINE = process.env.SITE || join(__dirname, '..', 'site');
const PORT = Number(process.env.PORT) || 8080;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.cur': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.txt': 'text/plain; charset=utf-8',
};

createServer(async (req, res) => {
  let chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  chemin = normalize(join(RACINE, chemin));
  if (!chemin.startsWith(normalize(RACINE))) return envoyer(res, 403, 'Interdit');
  try {
    if ((await stat(chemin)).isDirectory()) chemin = join(chemin, 'index.html');
    const contenu = await readFile(chemin);
    // no-store : le navigateur ne garde pas de copie, on voit toujours la dernière version.
    res.writeHead(200, { 'Content-Type': TYPES[extname(chemin)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(contenu);
  } catch {
    envoyer(res, 404, 'Fichier introuvable');
  }
}).listen(PORT, () => console.log(`Site prêt : http://localhost:${PORT}  (Ctrl+C pour arrêter)`));

function envoyer(res, code, texte) {
  res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(texte);
}
