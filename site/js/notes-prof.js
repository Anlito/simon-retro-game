// Évaluations réservées au professeur : conservation locale et sauvegarde explicite.
(function (global) {
  'use strict';
  const A = global.Atelier, cle = A.projet.id + '-evaluations-prof-v1';
  function valide(lu) {
    if (!lu || lu.format !== 'simon/evaluations-prof' || lu.version !== 1 || !lu.notes || typeof lu.notes !== 'object' || Array.isArray(lu.notes)) return false;
    for (const notes of Object.values(lu.notes)) if (!notes || typeof notes !== 'object' || Array.isArray(notes) || Object.values(notes).some(n => ![1,2,3,4].includes(n))) return false;
    if (Object.keys(lu.notes).some(k => ['__proto__','constructor','prototype'].includes(k))) return false;
    for (const notes of Object.values(lu.notes)) if (Object.keys(notes).some(k => ['__proto__','constructor','prototype'].includes(k))) return false;
    const b = lu.bareme;
    if (!b || typeof b !== 'object' || !(b.sur >= 1 && b.sur <= 100) || !Number.isInteger(b.objectif) || b.objectif < 0 || b.objectif > 20 || ![0,0.25,0.5,1].includes(b.arrondi)) return false;
    for (const k of ['participation','avance','penaliteIndice','penaliteIndiceMax','penaliteEchec','penaliteEchecMax']) if (!Number.isFinite(b[k]) || b[k] < 0 || b[k] > 1) return false;
    if (!Number.isInteger(b.essaisGratuits) || b.essaisGratuits < 0 || b.essaisGratuits > 50 || !Number.isFinite(b.bonusDefi) || b.bonusDefi < 0 || b.bonusDefi > 20) return false;
    for (const k of ['coefficients','carnet']) if (!b[k] || typeof b[k] !== 'object' || Array.isArray(b[k]) || Object.values(b[k]).some(n => !Number.isFinite(n) || n < 0 || n > 10)) return false;
    for (const k of ['coefficients','carnet','defis']) if (b[k] && Object.keys(b[k]).some(id => ['__proto__','constructor','prototype'].includes(id))) return false;
    if (b.defis && (typeof b.defis !== 'object' || Object.values(b.defis).some(v => typeof v !== 'boolean'))) return false;
    return true;
  }
  let etat = { format: 'simon/evaluations-prof', version: 1, bareme: null, notes: {} };
  try { const lu = JSON.parse(localStorage.getItem(cle)); if (valide(lu)) etat = lu; } catch { /* première utilisation */ }
  const identite = d => JSON.stringify([d.equipe.classe || '', [...d.equipe.eleves].sort()]);
  function sauver() { try { localStorage.setItem(cle, JSON.stringify(etat)); return true; } catch { return false; } }
  A.notesProf = {
    bareme: () => etat.bareme,
    regler: b => { etat.bareme = JSON.parse(JSON.stringify(b)); return sauver(); },
    pour: d => etat.notes[identite(d)] || {},
    noter(d, id, niveau) {
      const key = identite(d); etat.notes[key] = etat.notes[key] || {};
      if (niveau === '') delete etat.notes[key][id];
      else if ([1,2,3,4].includes(Number(niveau))) etat.notes[key][id] = Number(niveau);
      return sauver();
    },
    texte: () => JSON.stringify(etat, null, 2),
    importer(texte) {
      const lu = JSON.parse(texte);
      if (!valide(lu)) throw new Error('Cette sauvegarde des évaluations est invalide. Rien n’a été modifié.');
      const notes = Object.assign(Object.create(null), etat.notes);
      for (const [key, valeurs] of Object.entries(lu.notes)) notes[key] = Object.assign(Object.create(null), notes[key], valeurs);
      etat.notes = notes; etat.bareme = lu.bareme;
      return sauver();
    },
  };
})(this);
