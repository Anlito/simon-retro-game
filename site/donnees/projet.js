// Identité du projet : le seul fichier à changer pour un autre projet sur le même modèle.
//   id : nom de l'application dans les sauvegardes et début des clés du navigateur (copie de secours, dossiers
//        mémorisés, caméra) : un projet par clé, sinon deux outils ouverts sur le même poste se mélangent ;
//   projet : identifiant du projet dans les sauvegardes ; parcours : identifiant du parcours de Labo Blocs
//        (fichier parcours/<parcours>/parcours.js du site Labo Blocs) ; parcoursParNiveau : le parcours de chaque
//        niveau de classe (les autres classes et le mode enseignant sans niveau prennent « parcours ») ;
//   titre, titreLong : titres des pages ; dossier : dossier du projet dans le dossier de la classe (réseau) ;
//   accent : couleur du bandeau de l'écran d'exercice.
definirProjetAtelier({
  id: 'simon-retro-game',
  projet: 'simon',
  parcours: 'simon',
  // Un parcours par niveau (décision du 16/11/2026) : la classe de l'équipe choisit (5A → 5e, très guidé).
  parcoursParNiveau: { '5': 'simon-5e', '4': 'simon' },
  titre: 'Simon Rétro Game',
  titreLong: 'Projet Simon Rétro Game',
  dossier: 'SIMON RETRO GAME',
  accent: '#121C30',
});
