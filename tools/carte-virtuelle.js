// Copie de labo-blocs/tests/outils/carte-virtuelle.js (recette des jalons 3 et 4) : ne pas modifier ici.
// Carte virtuelle pour la recette automatique (jalon 3) : remplace navigator.serial dans le navigateur par une carte
// imitée — Arduino Uno, mBot (carte mCore) ou micro:bit V2 — qui parle comme la vraie :
//   - Uno et mCore : redémarrent à l'ouverture du port ; leur bootloader (STK500, 115200 bauds) écoute 1 s, puis le
//     programme de la carte démarre (s'il y en a un), envoie quelques octets parasites et répond au protocole v2 ;
//   - micro:bit : ne redémarre pas ; son programme de base s'installe en copiant le fichier (copierFichier).
// À injecter avant les scripts de la page (puppeteer : evaluateOnNewDocument), puis :
//   installerCarteVirtuelle({ modele: 'uno' | 'mcore' | 'microbit-v2', firmware: null | '0.2', occupee: false, cle: false })
// La carte est ensuite dans window.carteVirtuelle (programme gardé, journal des commandes, débrancher()).
// Mode direct (jalon 4) : sorties (D, A, S), notes (T), commandes de carte (X), boutons physiques (appuyer(broche,
// niveau) → « E <broche> <niveau> » si la broche est surveillée), capteurs (capteurs['X 1 2 3'] = 12), sécurité 3 s.
// cle : true → une clé 2.4G virtuelle (navigator.hid) reliée au même mBot, rapports de 32 octets [longueur, octets…].
(function (global) {
  'use strict';

  const STK = { OK: 0x10, INSYNC: 0x14, EOP: 0x20 };
  const PLACES = { uno: 1012, mcore: 1012, 'microbit-v2': 8192 };

  function installerCarteVirtuelle(options) {
    const o = options || {};
    const modele = o.modele || 'uno';
    const carte = {
      modele,
      firmware: o.firmware ? { version: o.firmware, nom: o.nomFirmware || modele } : null,
      programme: null, // octets gardés (Uint8Array)
      flash: new Uint8Array(32768).fill(0xff),
      journal: [], // commandes reçues (texte) et étapes du bootloader
      occupee: !!o.occupee,
      branchee: true,
      ouvertures: 0,
      sorties: {}, // broche → valeur (mode direct)
      notes: [],
      extensions: [], // commandes X qui agissent (moteurs, LED, écran…)
      capteurs: {}, // réponse des lectures : { 'X 1 2 3': 25 }
      niveaux: {}, // niveau électrique des entrées (boutons)
      surveillees: [],
      securite: 0, // nombre de fois où la carte a tout éteint faute de signe de vie
    };
    let dernierMessage = Date.now();
    let enDirect = false;
    setInterval(() => {
      if (enDirect && Date.now() - dernierMessage > 3000) {
        enDirect = false;
        carte.sorties = {};
        carte.securite++;
        carte.journal.push('securite');
      }
    }, 200);
    const encodeur = new TextEncoder();
    const decodeur = new TextDecoder();
    let ouvert = false;
    let controleur = null;
    let bootloaderJusqua = 0;
    let dtrBas = false;
    let texte = '';
    let stk = [];
    let adresse = 0;
    let envoi = null;
    const ecouteurs = { connect: [], disconnect: [] };

    let emettreCle = null; // clé 2.4G ouverte : les réponses partent par elle
    function emettre(octets) {
      if (emettreCle) return emettreCle(octets instanceof Uint8Array ? octets : Uint8Array.from(octets));
      if (!ouvert || !controleur) return;
      setTimeout(() => {
        try {
          if (ouvert) controleur.enqueue(octets instanceof Uint8Array ? octets : Uint8Array.from(octets));
        } catch {
          // flux fermé
        }
      }, 3);
    }
    const repondre = (ligne) => emettre(encodeur.encode(ligne + '\r\n'));

    // Redémarrage : bootloader 1 s, puis le programme de la carte (octets parasites au démarrage, comme la vraie).
    function redemarrer() {
      if (modele === 'microbit-v2') return;
      carte.journal.push('redemarrage');
      bootloaderJusqua = Date.now() + 1000;
      stk = [];
      setTimeout(() => {
        if (Date.now() >= bootloaderJusqua && carte.firmware) emettre([0xf0, 0x00, 0xfe]);
      }, 1050);
    }

    // ---------- Bootloader (STK500) ----------
    function bootloader(octet) {
      stk.push(octet);
      for (;;) {
        if (!stk.length) return;
        const c = stk[0];
        const besoin = { 0x30: 2, 0x75: 2, 0x50: 2, 0x51: 2, 0x55: 4, 0x74: 5 }[c] || (c === 0x64 && stk.length >= 3 ? 5 + ((stk[1] << 8) | stk[2]) : c === 0x64 ? 99999 : 0);
        if (!besoin) {
          stk.shift(); // octet inconnu : ignoré
          continue;
        }
        if (stk.length < besoin) return;
        const cmd = stk.splice(0, besoin);
        if (cmd[cmd.length - 1] !== STK.EOP) continue;
        bootloaderJusqua = Date.now() + 1000; // chaque commande valide garde le bootloader éveillé
        if (c === 0x30 || c === 0x50) emettre([STK.INSYNC, STK.OK]);
        else if (c === 0x75) emettre([STK.INSYNC, 0x1e, 0x95, 0x0f, STK.OK]);
        else if (c === 0x55) {
          adresse = (cmd[1] | (cmd[2] << 8)) * 2;
          emettre([STK.INSYNC, STK.OK]);
        } else if (c === 0x64) {
          const n = (cmd[1] << 8) | cmd[2];
          carte.flash.set(cmd.slice(4, 4 + n), adresse);
          emettre([STK.INSYNC, STK.OK]);
        } else if (c === 0x74) {
          const n = (cmd[1] << 8) | cmd[2];
          emettre([STK.INSYNC, ...carte.flash.slice(adresse, adresse + n), STK.OK]);
        } else if (c === 0x51) {
          emettre([STK.INSYNC, STK.OK]);
          // Programme installé : on lit sa version et son nom dans la mémoire (« PONG v2 0.2 uno »).
          const image = Array.from(carte.flash, (x) => String.fromCharCode(x)).join('');
          const m = /PONG v2 ([0-9.]+) ([a-z0-9-]+) /.exec(image);
          carte.firmware = m ? { version: m[1], nom: m[2] } : null;
          carte.programme = null;
          carte.journal.push('installe ' + (m ? m[1] + ' ' + m[2] : 'inconnu'));
          bootloaderJusqua = 0;
          setTimeout(() => emettre([0xf0, 0x00]), 20);
        }
      }
    }

    // ---------- Programme de la carte (protocole v2) ----------
    function commande(ligne) {
      carte.journal.push(ligne.length > 40 ? ligne.slice(0, 40) + '…' : ligne);
      dernierMessage = Date.now();
      const [c, a] = ligne.split(' ');
      const place = PLACES[modele];
      const n = ligne.split(' ').slice(1).map(Number);
      const direct = () => {
        enDirect = true;
      };
      if (c === 'D' || c === 'A' || c === 'S') {
        direct();
        carte.sorties[n[0]] = n[1];
        return repondre('OK');
      }
      if (c === 'T') {
        direct();
        carte.notes.push(n);
        return repondre('OK');
      }
      if (c === 'OFF') {
        carte.sorties = {};
        return repondre('OK');
      }
      if (c === 'M') return repondre('OK');
      if (c === 'W') {
        direct();
        carte.surveillees = n.filter((x) => !Number.isNaN(x));
        return repondre('OK');
      }
      if (c === 'R') return repondre(`V ${n[0]} ${carte.niveaux[n[0]] === undefined ? 1 : carte.niveaux[n[0]]}`);
      if (c === 'X') {
        direct();
        const lecture = ({ 1: [2, 3, 4, 5], 2: [5, 6, 7, 8, 9, 10, 13] }[n[0]] || []).includes(n[1]);
        if (lecture) return repondre('V ' + (carte.capteurs[ligne] || 0));
        carte.extensions.push(ligne);
        return repondre('V 0');
      }
      if (c === 'PING') return repondre(`PONG v2 ${carte.firmware.version} ${carte.firmware.nom} ${carte.programme ? carte.programme.length : 0} ${place}`);
      if (c === 'PROG') {
        const n = Number(a);
        if (!(n >= 11 && n <= place)) return repondre('ERR TAILLE');
        envoi = { n, octets: [] };
        carte.programme = null; // l'ancien programme est effacé
        return repondre('OK');
      }
      if (c === 'H') {
        if (!envoi) return repondre('ERR CMD');
        for (let i = 0; i + 1 < a.length; i += 2) envoi.octets.push(parseInt(a.slice(i, i + 2), 16));
        if (envoi.octets.length > envoi.n) return repondre('ERR TAILLE');
        return repondre('OK');
      }
      if (c === 'FIN') {
        if (!envoi || envoi.octets.length !== envoi.n) return repondre('ERR TAILLE');
        carte.programme = Uint8Array.from(envoi.octets);
        envoi = null;
        return repondre('OK ' + carte.programme.length);
      }
      if (c === 'EFFACE') {
        carte.programme = null;
        envoi = null;
        return repondre('OK');
      }
      return repondre('ERR CMD');
    }

    function recevoir(morceau) {
      for (const octet of morceau) {
        if (Date.now() < bootloaderJusqua) {
          bootloader(octet);
          continue;
        }
        if (!carte.firmware) continue; // carte sans programme Labo Blocs : elle ne répond rien
        texte += decodeur.decode(Uint8Array.of(octet), { stream: true });
        let i;
        while ((i = texte.indexOf('\n')) >= 0) {
          const ligne = texte.slice(0, i).trim();
          texte = texte.slice(i + 1);
          if (ligne) commande(ligne);
        }
      }
    }

    const port = {
      readable: null,
      writable: null,
      getInfo: () => ({ usbVendorId: modele === 'microbit-v2' ? 0x0d28 : 0x2341, usbProductId: 0x0043 }),
      async open() {
        if (carte.occupee) throw new DOMException('Failed to open serial port.', 'NetworkError');
        if (ouvert) throw new DOMException('The port is already open.', 'InvalidStateError');
        if (!carte.branchee) throw new DOMException('The device has been lost.', 'NetworkError');
        ouvert = true;
        carte.ouvertures++;
        texte = '';
        port.readable = new ReadableStream({
          start(c) {
            controleur = c;
          },
          cancel() {
            controleur = null;
          },
        });
        port.writable = new WritableStream({
          write(morceau) {
            recevoir(morceau);
          },
        });
        redemarrer();
      },
      async close() {
        ouvert = false;
        try {
          if (controleur) controleur.close();
        } catch {
          // déjà fermé
        }
        controleur = null;
      },
      async setSignals(s) {
        if (s.dataTerminalReady === false) dtrBas = true;
        else if (s.dataTerminalReady === true && dtrBas) {
          dtrBas = false;
          redemarrer();
        }
      },
    };

    let autorise = false;
    const serie = {
      async requestPort() {
        if (!carte.branchee) throw new DOMException('No port selected by the user.', 'NotFoundError');
        autorise = true;
        return port;
      },
      async getPorts() {
        return autorise && carte.branchee ? [port] : [];
      },
      addEventListener(type, f) {
        (ecouteurs[type] = ecouteurs[type] || []).push(f);
      },
      removeEventListener() {},
    };
    Object.defineProperty(global.navigator, 'serial', { value: serie, configurable: true });

    // Copie du fichier sur le lecteur MICROBIT : la carte redémarre avec ce programme de base.
    carte.copierFichier = (version) => {
      carte.firmware = { version: version || '0.2', nom: 'microbit-v2' };
      carte.programme = null;
    };
    carte.debrancher = () => {
      carte.branchee = false;
      ouvert = false;
      for (const f of ecouteurs.disconnect) f({ target: port });
    };
    // Bouton physique : niveau électrique (bouton vers la masse : appuyé = 0).
    carte.appuyer = (broche, niveau) => {
      carte.niveaux[broche] = niveau;
      if (carte.surveillees.includes(broche)) repondre(`E ${broche} ${niveau}`);
    };

    // Clé 2.4G virtuelle (WebHID) : rapports de 32 octets, 1 octet de longueur puis les octets.
    if (o.cle) {
      const ecouteursRapport = [];
      const appareil = {
        vendorId: 0x0416,
        productId: 0xffff,
        productName: 'Makeblock 2.4G (virtuelle)',
        opened: false,
        collections: [{ outputReports: [{ reportId: 0, items: [{ reportSize: 8, reportCount: 32 }] }] }],
        async open() {
          if (!carte.branchee) throw new DOMException('Device lost', 'NetworkError');
          appareil.opened = true;
          emettreCle = (octets) => {
            for (let i = 0; i < octets.length; i += 31) {
              const rapport = new Uint8Array(32);
              const partie = octets.slice(i, i + 31);
              rapport[0] = partie.length;
              rapport.set(partie, 1);
              setTimeout(() => ecouteursRapport.forEach((f) => f({ data: new DataView(rapport.buffer) })), 4);
            }
          };
        },
        async close() {
          appareil.opened = false;
          emettreCle = null;
        },
        async sendReport(id, donnees) {
          if (!appareil.opened) throw new DOMException('closed', 'InvalidStateError');
          const d = donnees instanceof Uint8Array ? donnees : new Uint8Array(donnees.buffer || donnees);
          recevoir(d.slice(1, 1 + d[0]));
        },
        addEventListener(type, f) {
          if (type === 'inputreport') ecouteursRapport.push(f);
        },
        removeEventListener(type, f) {
          const i = ecouteursRapport.indexOf(f);
          if (i >= 0) ecouteursRapport.splice(i, 1);
        },
      };
      let cleAutorisee = false;
      Object.defineProperty(global.navigator, 'hid', {
        configurable: true,
        value: {
          async requestDevice() {
            cleAutorisee = true;
            return [appareil];
          },
          async getDevices() {
            return cleAutorisee ? [appareil] : [];
          },
          addEventListener() {},
          removeEventListener() {},
        },
      });
      carte.cle = appareil;
    }

    carte.programmeHex = () => (carte.programme ? Array.from(carte.programme, (x) => x.toString(16).padStart(2, '0')).join('') : '');
    global.carteVirtuelle = carte;
    return carte;
  }

  global.installerCarteVirtuelle = installerCarteVirtuelle;
})(this);
