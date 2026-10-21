const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const puppeteer=require('puppeteer-core');const {pathToFileURL}=require('node:url');
(async()=>{
 const exe=[process.env.CHROME,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/chromium'].filter(Boolean).find(p=>fs.existsSync(p));
 if(!exe)throw Error('Indiquer un navigateur Chrome/Edge avec la variable CHROME.');
 const root=path.join(__dirname,'..'),url=nom=>pathToFileURL(path.join(root,'site',nom)).href;
 const b=await puppeteer.launch({executablePath:exe,headless:true,args:['--no-sandbox','--disable-gpu']});
 try{const ctx=await b.createBrowserContext(),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(url('index.html')+'?enseignant=1',{waitUntil:'networkidle0'});await p.waitForFunction(()=>window.Atelier?.programmation);
 assert.equal(await p.evaluate(()=>Atelier.catalogue.paquet().id),'simon');
 await p.goto(url('index.html'),{waitUntil:'networkidle0'});
 const donnees=await p.evaluate(()=>{const A=Atelier,d=A.creerProgression({eleves:['Test'],classe:'5A'});A.noterVerification(d,'1',{reussi:true});return JSON.stringify(d);});
 assert.equal(await p.evaluate(t=>Atelier.lireSauvegarde(t).ok,donnees),true);
 await p.goto(url('prof.html'),{waitUntil:'networkidle0'});await p.waitForFunction(()=>document.querySelector('.prof-exercices-version').textContent.includes('en ligne'));assert.deepEqual(errors,[]);
 console.log('Éditeur central, sauvegarde relue et page professeur : OK.');
 const q=await ctx.newPage();await q.setRequestInterception(true);q.on('request',r=>r.url().startsWith('https://anlito.github.io/labo-blocs/')?r.abort():r.continue());
 await q.goto(url('index.html'),{waitUntil:'networkidle0'});await q.waitForFunction(()=>[...document.querySelectorAll('[role="alert"]')].some(e=>e.textContent.includes('connexion à Labo Blocs')));
 console.log('Erreur réseau explicite, sans écriture de sauvegarde : OK.');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
