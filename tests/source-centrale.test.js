const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const site=path.join(__dirname,'../site');
test('le site n’embarque ni module Labo Blocs ni parcours',()=>{
  assert.equal(fs.existsSync(path.join(site,'vendor/labo-blocs')),false);
  assert.equal(fs.existsSync(path.join(site,'parcours/simon.js')),false);
  for(const nom of ['index.html','prof.html']) {
    const s=fs.readFileSync(path.join(site,nom),'utf8');
    assert(s.includes('https://anlito.github.io/labo-blocs/module/labo-blocs-noyau.js'));
    assert(s.includes('https://anlito.github.io/labo-blocs/parcours/simon/parcours.js'));
    assert(s.includes('src="js/connexion-labo.js"'));
    assert.equal((s.match(/<script src=/g)||[]).length,1);
  }
});

test('charte arcade : polices copiées dans le site, aucune police en ligne', () => {
  for (const nom of ['press-start-2p-latin-400-normal.woff2', 'pixelify-sans-latin-700-normal.woff2', 'atkinson-hyperlegible-latin-400-normal.woff2']) {
    assert(fs.existsSync(path.join(site, 'polices', nom)), nom);
  }
  const css = fs.readFileSync(path.join(site, 'css/arcade.css'), 'utf8');
  assert(!/@import|fonts\.googleapis|https?:\/\//.test(css));
  for (const nom of ['index.html', 'prof.html']) assert(fs.readFileSync(path.join(site, nom), 'utf8').includes('href="css/arcade.css"'));
});
