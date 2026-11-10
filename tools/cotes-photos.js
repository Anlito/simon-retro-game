// Dessine les flèches de cotes (longueur, largeur, hauteur, diamètre) sur les photos des composants
// (docs/photos-composants/) et enregistre les images du carnet dans site/img/mesures/. Usage : npm run cotes
// Les positions sont en pixels de la photo d'origine (1125 × 2000), relevées à l'œil au ras des objets.
const fs = require('node:fs'), path = require('node:path');
const puppeteer = require('puppeteer-core');
const { pathToFileURL } = require('node:url');

// Une cote : sens 'h' (horizontale) entre x1 et x2, tracée à la hauteur y, avec des lignes de rappel depuis le bord
// de l'objet (bord, ou bord1 et bord2 quand les deux bouts ne sont pas au même niveau) ; sens 'v' (verticale) entre y1 et y2, tracée à l'abscisse x. Le mot s'écrit du côté « cote ».
const PHOTOS = [
  { nom: 'bouton-dessous', cadre: [250, 620, 820, 1260],
    cotes: [{ mot: 'diamètre', sens: 'h', x1: 374, x2: 698, y: 700, bord: 960 }] },
  { nom: 'bouton-cote', cadre: [130, 630, 1060, 1360],
    cotes: [{ mot: 'hauteur', sens: 'v', y1: 776, y2: 1302, x: 960, bord: 840 },
            { mot: 'diamètre', sens: 'h', x1: 360, x2: 836, y: 730, bord: 860 }] },
  { nom: 'buzzer-dessus', cadre: [190, 700, 1110, 1200],
    cotes: [{ mot: 'longueur', sens: 'h', x1: 310, x2: 882, y: 790, bord: 880 },
            { mot: 'largeur', sens: 'v', y1: 852, y2: 1078, x: 950, bord: 890, cote: 'droite' }] },
  { nom: 'buzzer-cote', cadre: [250, 820, 1060, 1220],
    cotes: [{ mot: 'hauteur', sens: 'v', y1: 924, y2: 1106, x: 990, bord: 910 }] },
  { nom: 'led', cadre: [300, 760, 830, 1420],
    cotes: [{ mot: 'diamètre', sens: 'h', x1: 490, x2: 633, y: 1080, bord: 1010, cote: 'bas' },
            { mot: 'hauteur', sens: 'v', y1: 852, y2: 1018, x: 720, bord: 630 }] },
  { nom: 'platine-dessus', cadre: [190, 470, 1060, 1110],
    cotes: [{ mot: 'longueur', sens: 'h', x1: 324, x2: 898, y: 535, bord: 600 },
            { mot: 'largeur', sens: 'v', y1: 596, y2: 1022, x: 975, bord: 900, cote: 'droite' }] },
  { nom: 'platine-cote', cadre: [110, 840, 1060, 1120],
    cotes: [{ mot: 'hauteur', sens: 'v', y1: 904, y2: 1036, x: 960, bord: 885 }] },
  { nom: 'arduino-dessus', cadre: [70, 470, 1090, 1260],
    cotes: [{ mot: 'longueur', sens: 'h', x1: 212, x2: 1057, y: 545, bord: 612, bord2: 955 },
            { mot: 'largeur', sens: 'v', y1: 610, y2: 1196, x: 140, bord: 212, cote: 'gauche' }] },
  { nom: 'arduino-cote', cadre: [60, 760, 1125, 1060],
    cotes: [{ mot: 'hauteur', sens: 'v', y1: 813, y2: 990, x: 150, bord1: 770, bord2: 205, cote: 'gauche' }] },
];

// Une couleur et un mot par dimension (jamais la couleur seule).
const COULEURS = { longueur: '#1E88FF', largeur: '#12A866', hauteur: '#E0244A', 'diamètre': '#E8A000' };

(async () => {
  const exe = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/chromium'].filter(Boolean).find((p) => fs.existsSync(p));
  if (!exe) throw Error('Indiquer un navigateur Chrome/Edge avec la variable CHROME.');
  const racine = path.join(__dirname, '..'), source = path.join(racine, 'docs', 'photos-composants'), sortie = path.join(racine, 'site', 'img', 'mesures');
  fs.mkdirSync(sortie, { recursive: true });
  const police = pathToFileURL(path.join(racine, 'site', 'polices', 'atkinson-hyperlegible-latin-700-normal.woff2')).href;
  const b = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--no-sandbox', '--disable-gpu', '--allow-file-access-from-files'] });
  try {
    const p = await b.newPage();
    await p.goto(pathToFileURL(path.join(source, 'led.jpg')).href);
    for (const photo of PHOTOS) {
      const image = pathToFileURL(path.join(source, photo.nom + '.jpg')).href;
      const donnees = await p.evaluate(async (photo, image, police, COULEURS) => {
        const f = new FontFace('Atkinson', `url(${police})`, { weight: '700' }); await f.load(); document.fonts.add(f);
        const img = new Image(); img.src = image; await img.decode();
        const [cx, cy, cx2, cy2] = photo.cadre, w = cx2 - cx, h = cy2 - cy;
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const g = c.getContext('2d');
        g.drawImage(img, cx, cy, w, h, 0, 0, w, h);
        // Photo un peu éclaircie et désaturée autour : les flèches ressortent mieux.
        g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, 0, w, h);
        const X = (x) => x - cx, Y = (y) => y - cy;
        const trait = (x1, y1, x2, y2, couleur, epaisseur) => {
          g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineCap = 'round';
          g.strokeStyle = '#fff'; g.lineWidth = epaisseur + 6; g.stroke();
          g.strokeStyle = couleur; g.lineWidth = epaisseur; g.stroke();
        };
        const pointe = (x, y, angle, couleur) => {
          const L = 30, l = 15;
          g.save(); g.translate(x, y); g.rotate(angle);
          g.beginPath(); g.moveTo(0, 0); g.lineTo(-L, -l); g.lineTo(-L, l); g.closePath();
          g.lineJoin = 'round'; g.strokeStyle = '#fff'; g.lineWidth = 6; g.stroke(); g.fillStyle = couleur; g.fill();
          g.restore();
        };
        const etiquette = (texte, x, y, couleur, sens) => {
          g.font = '700 38px Atkinson'; const tw = g.measureText(texte).width, ph = 56, pw = tw + 32;
          g.save(); g.translate(x, y); if (sens === 'v') g.rotate(-Math.PI / 2);
          g.fillStyle = '#fff'; g.beginPath(); g.roundRect(-pw / 2 - 4, -ph / 2 - 4, pw + 8, ph + 8, 12); g.fill();
          g.fillStyle = couleur; g.beginPath(); g.roundRect(-pw / 2, -ph / 2, pw, ph, 10); g.fill();
          g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(texte, 0, 2);
          g.restore();
        };
        for (const k of photo.cotes) {
          const couleur = COULEURS[k.mot], mot = k.mot.toUpperCase();
          g.setLineDash([10, 9]);
          const b1 = k.bord1 ?? k.bord, b2 = k.bord2 ?? k.bord;
          if (k.sens === 'h') { trait(X(k.x1), Y(b1), X(k.x1), Y(k.y), couleur, 4); trait(X(k.x2), Y(b2), X(k.x2), Y(k.y), couleur, 4); }
          else { trait(X(b1), Y(k.y1), X(k.x), Y(k.y1), couleur, 4); trait(X(b2), Y(k.y2), X(k.x), Y(k.y2), couleur, 4); }
          g.setLineDash([]);
          if (k.sens === 'h') {
            trait(X(k.x1), Y(k.y), X(k.x2), Y(k.y), couleur, 8);
            pointe(X(k.x1), Y(k.y), Math.PI, couleur); pointe(X(k.x2), Y(k.y), 0, couleur);
            etiquette(mot, X((k.x1 + k.x2) / 2), Y(k.y) + (k.cote === 'bas' ? 44 : -44), couleur, 'h');
          } else {
            trait(X(k.x), Y(k.y1), X(k.x), Y(k.y2), couleur, 8);
            pointe(X(k.x), Y(k.y1), -Math.PI / 2, couleur); pointe(X(k.x), Y(k.y2), Math.PI / 2, couleur);
            etiquette(mot, X(k.x) + (k.cote === 'gauche' ? -44 : 44), Y((k.y1 + k.y2) / 2), couleur, 'v');
          }
        }
        // Image finale : 720 px de large au plus.
        const e = Math.min(1, 720 / w), s = document.createElement('canvas');
        s.width = Math.round(w * e); s.height = Math.round(h * e);
        const gs = s.getContext('2d'); gs.imageSmoothingQuality = 'high'; gs.drawImage(c, 0, 0, s.width, s.height);
        return s.toDataURL('image/jpeg', 0.82);
      }, photo, image, police, COULEURS);
      fs.writeFileSync(path.join(sortie, photo.nom + '.jpg'), Buffer.from(donnees.split(',')[1], 'base64'));
      console.log('img/mesures/' + photo.nom + '.jpg');
    }
  } finally { await b.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
