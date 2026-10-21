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
