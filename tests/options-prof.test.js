const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const P = require('../site/js/moteur/progression.js');
const N = require('../site/js/moteur/notation.js');
const equipe = () => P.creerProgression({eleves:['Équipe test'], classe:'5A'});
const b = {coefficients:Object.fromEntries(N.exercicesObligatoires().map(id=>[id,0])),carnet:{'modele-3d':2},arrondi:0,bonusDefi:0};
test('notation manuelle : les quatre niveaux donnent leur part des points ; non évalué reste hors du total',()=>{
 const d=equipe(); let r=N.noterEquipe(d,b); assert.equal(r.detail[0].attenteEvaluation,true);assert.equal(r.detail[0].pointsNoteMax,0);
 for(const niveau of [1,2,3,4]) {d.evaluationsProf={'modele-3d':niveau};r=N.noterEquipe(d,b);assert.equal(r.note,niveau*5);assert.equal(r.detail[0].fraction,niveau/4);}
});
test('non noté : une partie désactivée ne rapporte et ne retire aucun point',()=>{
 const d=equipe();d.evaluationsProf={'modele-3d':1,affiche:4};const r=N.noterEquipe(d,{...b,carnet:{'modele-3d':0,affiche:1}});assert.equal(r.note,20);assert.equal(r.detail.length,1);assert.equal(r.detail[0].partie,'affiche');
});
test('défi désactivé : aucun bonus malgré la réussite',()=>{
 const d=equipe();P.noterVerification(d,'12',{reussi:true});assert.equal(N.noterEquipe(d,{...b,bonusDefi:1,defis:{'12':false}}).bonus,0);
});
test('évaluations professeur : persistance, export/import et rejet sans perdre les notes',()=>{
 const stockage=new Map();const context=()=>({Atelier:{projet:{id:'simon-retro-game'}},localStorage:{getItem:k=>stockage.get(k)||null,setItem:(k,v)=>stockage.set(k,v)}});
 const code=fs.readFileSync(require('node:path').join(__dirname,'../site/js/notes-prof.js'),'utf8');const c=context();vm.runInNewContext(code,c);const a=c.Atelier.notesProf;
 a.regler(N.completerBareme());a.noter(equipe(),'modele-3d','3');const texte=a.texte();const c2=context();vm.runInNewContext(code,c2);assert.equal(c2.Atelier.notesProf.pour(equipe())['modele-3d'],3);
 assert.throws(()=>a.importer('{"format":"invalide"}'));assert.equal(a.pour(equipe())['modele-3d'],3);
 const mauvais=JSON.parse(texte);Object.values(mauvais.notes)[0]['modele-3d']=9;assert.throws(()=>a.importer(JSON.stringify(mauvais)));assert.equal(a.pour(equipe())['modele-3d'],3);
 a.importer(texte);assert.equal(a.pour(equipe())['modele-3d'],3);
});

test('parcours central : accepte la source compatible et refuse un autre parcours',()=>{
 const code=fs.readFileSync(require('node:path').join(__dirname,'../site/js/parcours-source.js'),'utf8');
 const contexte=id=>({Atelier:{projet:{parcours:'simon'},catalogue:{paquet:()=>({brut:{id},exercices:Array.from({length:12},(_,i)=>({numero:i+1}))})}},LaboBlocs:{VERSION_MOTEUR:'0.4.0',controler:()=>[]}});
 const bon=contexte('simon');vm.runInNewContext(code,bon);assert.equal(bon.Atelier.origineParcours,'Labo Blocs en ligne');
 assert.throws(()=>vm.runInNewContext(code,contexte('autre')),/indisponible/);
});
