// Le script du parcours publié a été chargé depuis le site Labo Blocs.
(function (global) {
  'use strict';
  const A = global.Atelier, LB = global.LaboBlocs;
  // Un parcours par niveau de classe (donnees/projet.js) : tous doivent être là, avec les 12 exercices du carnet.
  const ids = [...new Set([A.projet.parcours, ...Object.values(A.projet.parcoursParNiveau || {})])];
  for (const id of ids) {
    const p = A.catalogue.paquet(id);
    if (!p) throw new Error('Parcours ' + id + ' indisponible.');
    const problemes = LB.controler(p.brut, LB.VERSION_MOTEUR);
    const numeros = p.exercices.map(e => String(e.numero));
    if (problemes.length || numeros.join(',') !== '1,2,3,4,5,6,7,8,9,10,11,12')
      throw new Error('Le parcours publié n’est pas compatible avec ce carnet.');
  }
  A.catalogue.choisir(A.projet.parcours);
  A.origineParcours = 'Labo Blocs en ligne';
  A.parcoursPret = Promise.resolve();
})(this);
