// Standard de câblage de la console Simon, imposé à toutes les équipes : le tutoriel de câblage le montre, le carnet
// le demande (onglet Câblage) et les exercices de Labo Blocs l'utilisent (tests/donnees.test.js vérifie que les trois
// disent la même chose). Couleur n° 1 à 4 = celle de la liste « sequence » des programmes.
(typeof window !== 'undefined' ? window : globalThis).CABLAGE = {
  couleurs: [
    { numero: 1, nom: 'bleu', fem: 'bleue', hex: '#33A1FF', bouton: 'D2', led: 'D3' },
    { numero: 2, nom: 'vert', fem: 'verte', hex: '#2BE38A', bouton: 'D4', led: 'D5' },
    { numero: 3, nom: 'jaune', fem: 'jaune', hex: '#FFD23F', bouton: 'D6', led: 'D7' },
    { numero: 4, nom: 'rouge', fem: 'rouge', hex: '#FF4D6D', bouton: 'D8', led: 'D9' },
  ],
  buzzer: 'D10',
};
if (typeof module === 'object' && module.exports) module.exports = globalThis.CABLAGE;
