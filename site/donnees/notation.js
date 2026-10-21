// Barème de la note (outil professeur). Le professeur peut le modifier ici, ou le régler dans
// le panneau « Barème » de prof.html (ces réglages-là sont gardés sur ce poste et s'exportent).
// Chaque étape du projet est notée : analyse, modélisation 3D, affiche, programmation (décision de Thomas, 21/10/2026).
// Le Grand Tournoi n'est pas noté.
definirBareme({
  // Note sur :
  "sur": 20,
  // Exercices attendus à ce moment du projet (les N premiers ; 0 = tout le parcours, soit 11 exercices).
  // La note est calculée sur eux. À augmenter au fil des séances : la note reste juste même si une équipe ne finit pas.
  "objectif": 0,
  // Exercice réussi AU-DELÀ des exercices attendus : part de ses points ajoutée en bonus.
  // 0 = l'avance ne rapporte rien, pour qu'elle ne compense pas les erreurs sur le travail attendu.
  "avance": 0,
  // Coefficient de chaque exercice de programmation (selon sa difficulté). 0 = l'exercice ne compte pas.
  //   1 LED bleue · 2 bouton bleu · 3 quatre couleurs · 4 une note par couleur · 5 fonction « allumer » ·
  //   6 ma séquence · 7 lire le bouton · 8 son d'erreur · 9 une couleur de plus · 10 victoire · 11 Mon Simon
  "coefficients": { "1": 0.5, "2": 0.5, "3": 1, "4": 1, "5": 1.5, "6": 1.5, "7": 1.5, "8": 1.5, "9": 2, "10": 2, "11": 3 },
  // Points de bonus par défi réussi (exercice 12 : le Simon au hasard). La note ne dépasse jamais « sur ».
  "bonusDefi": 1,
  // Exercice commencé (au moins une vérification) mais pas réussi : part des points accordée.
  "participation": 0.2,
  // Retenue par indice ouvert avant la réussite, et retenue maximale.
  "penaliteIndice": 0.1,
  "penaliteIndiceMax": 0.3,
  // Vérifications ratées sans retenue (0 : seule une réussite du premier coup garde tous les points),
  // puis retenue par vérification ratée en plus, et maximum.
  "essaisGratuits": 0,
  "penaliteEchec": 0.05,
  "penaliteEchecMax": 0.25,
  // Parties du carnet notées et leur coefficient (0 = ne compte pas).
  //   Avec « Vérifier » (classement, trous) : réussi = tous les points, moins les vérifications ratées avant.
  //   Les autres (relevé de dimensions, modèle 3D, affiche) : notées à la main par le professeur sur 4 niveaux.
  //   Analyse : classement, fonctionnement, dimensions · Boîtier 3D : modele-3d · Affiche : affiche ·
  //   Programmation : branchements, algorithme-jeu, symboles (avec les exercices ci-dessus).
  "carnet": {
    "classement": 1, "fonctionnement": 1, "dimensions": 2,
    "modele-3d": 4,
    "affiche": 4,
    "branchements": 1, "algorithme-jeu": 1, "symboles": 1
  },
  // Arrondi de la note (0.5 = au demi-point, 0.25 = au quart de point, 0 = au centième).
  "arrondi": 0.5
});
