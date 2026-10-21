// Carnet de projet du Simon Rétro Game (ancien « Carnet de Projet Numérique », consignes de l'affiche et de la fiche
// explicative, fiche « Ce qu'il faut retenir ») : onglets, parties, textes et réponses attendues.
// Le professeur peut modifier ce fichier (textes, éléments à classer, réponses des cases à compléter).
//
// Chaque partie a un « type » :
//   info        texte à lire (pas de réponse)                      lignes, encadre (« attention » ou « regle »)
//   classement  ranger des éléments dans des colonnes, « Vérifier »   colonnes, elements { nom, image, place }
//   trous       cases à compléter en choisissant dans une liste,      lignes : « texte [[réponse]] texte »,
//               « Vérifier » (les réponses ne sont jamais montrées)   choix (réponses et autres propositions)
//   questions   réponses écrites librement                           questions
//   tableau     tableau à remplir librement                          colonnes, lignes (nombre ou titres de ligne)
//   cases       liste à cocher                                       cases
//   choix       un choix (ou plusieurs avec « plusieurs »)           options, question (texte libre en plus)
//   echelle     auto-évaluation (un degré par ligne)                 lignes, degres
//   image       captures collées (Ctrl+V) ou choisies, gardées       nombre (images au plus)
//               dans le fichier de l'équipe
//   fichier     document déposé dans le dossier de l'équipe          prefixe (nom du fichier), extension, accepte
//               (ex. l'affiche en PDF)
//   programmation  les exercices de Labo Blocs (onglet Programmation)
// « photos » sur un onglet : les photos prises par le professeur (outil professeur) s'y affichent.
// « niveaux » (facultatif) : la partie n'est montrée qu'aux classes de ces niveaux (« 5 » : 5A, 5B… ; « 4 »).
// « note » : la partie compte dans la note (« Vérifier » : automatique ; les autres, notées à la main par le
// professeur sur 4 niveaux ; le coefficient est dans donnees/notation.js).
// Les réponses de l'équipe sont gardées sous l'identifiant de la partie : ne pas le changer en cours d'année.
definirCarnet({
  "titre": "Simon Rétro Game",
  "onglets": [
    { "cle": "projet", "titre": "Le projet", "icone": "drapeau", "parties": ["mission", "concours", "feuille-de-route", "page-de-garde", "logo"] },
    { "cle": "analyse", "titre": "Analyse", "icone": "variables", "parties": ["chaine", "classement", "fonctionnement", "dimensions-aide", "dimensions"] },
    { "cle": "boitier", "titre": "Boîtier 3D", "icone": "crayon", "photos": true, "parties": ["boitier-cahier", "forme", "modele-3d", "difficultes"] },
    { "cle": "affiche", "titre": "Affiche et fiche", "icone": "imprimer", "parties": ["affiche-consigne", "affiche-relecture", "affiche", "fiche-consigne", "fiche-relecture", "fiche-explicative"] },
    { "cle": "cablage", "titre": "Câblage", "icone": "bouton", "parties": ["standard", "branchements", "avant-usb"] },
    { "cle": "algorithme", "titre": "Algorithme", "icone": "decisions", "parties": ["algorithme", "algorithme-jeu", "symboles"] },
    { "cle": "programmation", "titre": "Programmation", "icone": "lumiere", "parties": ["programmation"] },
    { "cle": "bilan", "titre": "Bilan", "icone": "coche", "parties": ["autoevaluation", "bilan"] },
    { "cle": "retenir", "titre": "À retenir", "icone": "info", "parties": ["retenir-chaine", "retenir-vocabulaire", "retenir-algorithme", "retenir-donnees"] }
  ],
  "parties": [
    // ---------- Le projet ----------
    { "id": "mission", "type": "info", "titre": "Vous êtes une équipe de designers",
      "lignes": [
        "Vous n’êtes plus en classe : vous êtes un bureau d’études R&D.",
        "La commande du client : un jeu Simon de poche, stylé et jouable. Un jeu de mémoire électronique : il montre une séquence de couleurs, le joueur doit la refaire.",
        "Trois livrables : un boîtier modélisé en 3D et imprimable, une affiche publicitaire, et un programme qui fait vraiment fonctionner le jeu.",
        "Ce qui compte : un objet pensé pour la main, et la cohérence entre le nom du jeu, l’affiche et le boîtier."
      ] },
    { "id": "concours", "type": "info", "titre": "Les règles du concours", "encadre": "regle",
      "lignes": [
        "Chaque équipe conçoit son projet complet : boîtier, affiche et programme.",
        "La classe vote sur les affiches, dès qu’elles sont prêtes. Un seul boîtier est imprimé : la Console Officielle.",
        "Au Grand Tournoi, le programme de chaque équipe est envoyé dans la Console Officielle, et on joue."
      ] },
    { "id": "feuille-de-route", "type": "cases", "titre": "La feuille de route",
      "consigne": "Coche chaque étape quand elle est terminée.",
      "cases": [
        "S1 · Analyse : mesures des composants réels",
        "S2 à S4 · Modélisation 3D du boîtier sur Tinkercad",
        "S5 et S6 · Affiche, puis vote de la classe",
        "Impression et montage de la Console Officielle (le professeur)",
        "S7 et S8 · Câblage et programmation",
        "S9 · Grand Tournoi"
      ] },
    { "id": "page-de-garde", "type": "questions", "titre": "Page de garde",
      "questions": ["Nom de l’entreprise (du bureau d’études)", "Slogan commercial du Simon", "Membres de l’équipe"] },
    { "id": "logo", "type": "image", "titre": "Notre logo", "nombre": 1,
      "consigne": "Dessine ton logo (Canva, Paint…) ou photographie-le, puis colle l’image ici." },

    // ---------- Analyse (S1) ----------
    { "id": "chaine", "type": "info", "titre": "Comment fonctionne un objet automatisé ?",
      "lignes": [
        "Une information entre, une action sort : capteurs → carte programmable → actionneurs.",
        "Dans le Simon : les boutons (capteurs) → la carte Arduino (traitement) → les LED et le buzzer (actionneurs)."
      ] },
    { "id": "classement", "type": "classement", "titre": "Capteur, carte programmable ou actionneur ?", "note": true,
      "consigne": "Range chaque élément dans sa famille.",
      "colonnes": [
        { "cle": "capteur", "titre": "Capteurs", "aide": "Prennent une information",
          "explication": "Un capteur détecte une information dans le monde réel (un appui, un son, une distance…) et l’envoie à la carte programmable." },
        { "cle": "carte", "titre": "Carte programmable", "aide": "Reçoit, analyse et décide",
          "explication": "La carte programmable reçoit les informations des capteurs, exécute le programme et décide quoi faire : c’est le « cerveau » de l’objet." },
        { "cle": "actionneur", "titre": "Actionneurs", "aide": "Agissent sur le monde",
          "explication": "Un actionneur agit sur le monde réel quand la carte le lui demande : il éclaire, fait du son ou bouge." }
      ],
      "elements": [
        { "nom": "Bouton poussoir", "image": "img/objets/bouton.png", "place": "capteur" },
        { "nom": "Capteur de distance", "image": "img/objets/distance.png", "place": "capteur" },
        { "nom": "Clavier", "place": "capteur" },
        { "nom": "Micro", "place": "capteur" },
        { "nom": "Carte Arduino Uno", "image": "img/objets/arduino.png", "place": "carte" },
        { "nom": "Unité centrale", "image": "img/objets/unite-centrale.png", "place": "carte" },
        { "nom": "LED", "image": "img/objets/ampoule.png", "place": "actionneur" },
        { "nom": "Buzzer", "place": "actionneur" },
        { "nom": "Enceinte", "image": "img/objets/enceinte.png", "place": "actionneur" },
        { "nom": "Servomoteur", "image": "img/objets/servo.png", "place": "actionneur" }
      ] },
    { "id": "fonctionnement", "type": "trous", "titre": "Le fonctionnement du Simon", "note": true,
      "consigne": "Complète les phrases.",
      "lignes": [
        "Quand le joueur appuie sur un [[bouton]], une information part vers la carte [[Arduino]].",
        "Le programme compare l’appui à la couleur attendue de la [[séquence]].",
        "La carte commande les [[LED]], qui s’allument, et le [[buzzer]], qui joue une note."
      ],
      "choix": ["bouton", "Arduino", "séquence", "LED", "buzzer", "joueur", "câble USB", "boîtier"] },
    { "id": "dimensions-aide", "type": "info", "titre": "Mesurer avant de dessiner", "encadre": "attention",
      "lignes": [
        "Mesure les composants réels avant de les dessiner en 3D : un boîtier mal ajusté ne se ferme pas !",
        "Outil : le pied à coulisse, au dixième de millimètre près.",
        "Pour un trou, ajoute un peu de jeu : environ 0,5 mm de plus que la pièce, sinon elle ne passe pas après l’impression."
      ] },
    { "id": "dimensions", "type": "tableau", "titre": "Relevé de dimensions", "note": true,
      "consigne": "Mesure chaque composant (en millimètres) et note l’outil utilisé.",
      "colonnes": ["Composant", "Longueur (mm)", "Largeur (mm)", "Hauteur ou diamètre (mm)", "Outil utilisé"],
      "lignes": ["Bouton poussoir", "LED", "Buzzer", "Carte Arduino Uno", "Platine d’essai (breadboard)", "Prise du câble USB"] },

    // ---------- Boîtier 3D (S2 à S4) ----------
    { "id": "boitier-cahier", "type": "info", "titre": "Le cahier des charges du boîtier", "encadre": "regle",
      "lignes": [
        "C’est un Simon de poche : il doit tenir dans la main. Pas de dimension imposée, mais le plus compact possible.",
        "4 trous pour les boutons, 4 pour les LED, une ouverture pour le son du buzzer et un accès pour le câble USB.",
        "Un couvercle pour fermer la boîte, et assez de place dedans pour l’Arduino et la platine (voir ton relevé de dimensions).",
        "Modélisation sur Tinkercad, puis export en fichier .stl pour l’impression 3D."
      ] },
    { "id": "forme", "type": "questions", "titre": "La forme choisie pour le boîtier",
      "questions": ["Description de la forme (à quoi ressemble-t-il ?)", "Inspiration (d’où vient l’idée ?)", "Ergonomie : comment le tient-on dans la main ?"] },
    { "id": "modele-3d", "type": "image", "titre": "Le modèle Tinkercad final", "nombre": 2, "note": true,
      "consigne": "Colle une capture de ton boîtier dans Tinkercad (et, si tu veux, une deuxième vue). Pense à en mettre une aussi dans ta fiche explicative." },
    { "id": "difficultes", "type": "tableau", "titre": "Difficultés rencontrées et solutions trouvées",
      "colonnes": ["Difficulté", "Solution trouvée"], "lignes": 3 },

    // ---------- Affiche et fiche explicative (S5 et S6) ----------
    { "id": "affiche-consigne", "type": "info", "titre": "L’affiche publicitaire",
      "lignes": [
        "Ton affiche est ton unique argument de vente : c’est elle, et seulement elle, qui est présentée à la classe au moment du vote.",
        "Elle donne envie : le nom de ton jeu Simon, un slogan commercial (une phrase courte et percutante), un visuel attrayant (logo, illustration, couleurs cohérentes avec ton produit).",
        "Pas d’explication technique ici : elles vont dans la fiche explicative.",
        "Outil : Canva. Une seule page, A4 portrait ou paysage, lisible de loin une fois projetée.",
        "Dès que ton affiche est terminée, le vote a lieu : soigne-la avant de la déposer."
      ] },
    { "id": "affiche-relecture", "type": "cases", "titre": "Relecture de l’affiche avant le vote",
      "cases": ["Le nom du jeu et le slogan sont sur l’affiche", "Le visuel est cohérent et soigné", "Le texte est lisible une fois projeté"] },
    { "id": "affiche", "type": "fichier", "titre": "Déposer notre affiche (PDF)", "note": true,
      "prefixe": "Affiche", "extension": ".pdf", "accepte": ".pdf,application/pdf",
      "consigne": "Dans Canva : « Partager », puis « Télécharger », type de fichier « PDF standard ». Dépose ensuite ce PDF ici : ton professeur le récupère pour le vote." },
    { "id": "fiche-consigne", "type": "info", "titre": "La fiche explicative du jeu",
      "lignes": [
        "Elle n’est pas projetée au vote : c’est la preuve technique de ton projet.",
        "Le guide d’utilisation : les règles du Simon expliquées simplement à un joueur qui découvre le jeu (exemple : « Mémorise la séquence de couleurs, puis reproduis-la en appuyant sur les bons boutons. Une erreur, et la partie s’arrête ! »).",
        "La fiche technique : une capture de ton boîtier dans Tinkercad, avec ses dimensions générales, et le tableau des capteurs et actionneurs (type, élément, rôle).",
        "Outil : Canva ou LibreOffice Writer. Une page A4, en PDF."
      ] },
    { "id": "fiche-relecture", "type": "cases", "titre": "Relecture de la fiche explicative",
      "cases": ["Les règles sont expliquées simplement", "La capture Tinkercad a ses dimensions", "Le tableau capteurs / actionneurs est complet"] },
    { "id": "fiche-explicative", "type": "fichier", "titre": "Déposer notre fiche explicative (PDF)",
      "prefixe": "Fiche_explicative", "extension": ".pdf", "accepte": ".pdf,application/pdf" },

    // ---------- Câblage (S7) ----------
    { "id": "standard", "type": "info", "titre": "Le standard de câblage, imposé à tous", "encadre": "regle",
      "lignes": [
        "Toutes les consoles sont câblées de la même façon : ton programme marche sur n’importe laquelle, et sur la Console Officielle.",
        "Le tutoriel de câblage (lien en haut de la page) montre chaque branchement, étape par étape.",
        "Fil coloré = signal (vers la broche de l’Arduino) ; fil noir ou marron = masse (GND), sur le rail − de la platine.",
        "Un seul fil relie le rail − de la platine au GND de l’Arduino."
      ] },
    { "id": "branchements", "type": "trous", "titre": "Les branchements de la console", "note": true,
      "consigne": "Retrouve, avec le tutoriel de câblage, la broche de chaque composant.",
      "lignes": [
        "Bouton bleu → [[D2]] · LED bleue → [[D3]]",
        "Bouton vert → [[D4]] · LED verte → [[D5]]",
        "Bouton jaune → [[D6]] · LED jaune → [[D7]]",
        "Bouton rouge → [[D8]] · LED rouge → [[D9]]",
        "Buzzer (fil de signal) → [[D10]]",
        "Fils noirs ou marron (masses) → [[le rail − de la platine]]"
      ],
      "choix": ["D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10", "D11", "le rail − de la platine", "le 5V de l’Arduino"] },
    { "id": "avant-usb", "type": "cases", "titre": "Avant de brancher le câble USB", "encadre": "attention",
      "cases": [
        "Les 4 boutons sont câblés sur D2, D4, D6, D8",
        "Les 4 LED sont câblées sur D3, D5, D7, D9",
        "Le buzzer est câblé sur D10",
        "Toutes les masses sont sur le rail − de la platine (rangée bleue, pas rouge)",
        "Un seul fil relie le rail − au GND de l’Arduino",
        "Aucun fil ne touche une broche voisine",
        "Le professeur a validé notre câblage : nous pouvons brancher le câble USB"
      ] },

    // ---------- Algorithme ----------
    { "id": "algorithme", "type": "questions", "titre": "L’algorithme, en français",
      "consigne": "Avant de programmer, décris avec tes mots ce que doit faire le jeu. Exemple : « Si le bouton rouge est appuyé, alors la LED rouge s’allume et le buzzer joue sa note. »",
      "questions": ["Cas du bouton bleu", "Cas du bouton vert", "Cas du bouton jaune", "Cas du bouton rouge", "Que se passe-t-il si le joueur se trompe ?"] },
    { "id": "algorithme-jeu", "type": "trous", "titre": "Les étapes du jeu", "note": true,
      "consigne": "Remets les étapes du Simon dans l’ordre.",
      "lignes": [
        "1. Le jeu [[montre les couleurs de la séquence]].",
        "2. Le jeu [[attend l’appui du joueur]].",
        "3. Le jeu [[compare l’appui à la couleur attendue]].",
        "4. Si c’est faux : [[son d’erreur, on recommence]].",
        "5. Si toute la séquence est juste : [[musique de victoire]]."
      ],
      "choix": ["montre les couleurs de la séquence", "attend l’appui du joueur", "compare l’appui à la couleur attendue", "son d’erreur, on recommence", "musique de victoire"] },
    { "id": "symboles", "type": "trous", "titre": "Les symboles de l’algorigramme", "note": true,
      "lignes": [
        "L’ovale représente [[le début ou la fin du programme]].",
        "Le rectangle représente [[une action à réaliser]].",
        "Le losange représente [[une condition (oui ou non)]].",
        "Le rectangle à double bord représente [[une fonction (un sous-programme)]]."
      ],
      "choix": ["le début ou la fin du programme", "une action à réaliser", "une condition (oui ou non)", "une fonction (un sous-programme)"] },

    // ---------- Programmation ----------
    { "id": "programmation", "type": "programmation", "titre": "Programmation",
      "consigne": "Programme ton Simon en blocs, exercice par exercice : réussis un exercice pour ouvrir le suivant. Tu peux tester sur la console du simulateur, puis sur ton kit. L’exercice 11, « Mon Simon », est celui du Grand Tournoi." },

    // ---------- Bilan ----------
    { "id": "autoevaluation", "type": "echelle", "titre": "Grille d’auto-évaluation",
      "lignes": [
        "Le boîtier respecte les dimensions mesurées",
        "L’affiche contient le nom, le slogan et le visuel",
        "La fiche explicative explique simplement les règles du jeu",
        "La fiche explicative contient la capture Tinkercad avec dimensions",
        "La fiche explicative contient le tableau capteurs / actionneurs complet",
        "Le programme respecte le standard de câblage imposé",
        "Le programme fonctionne sans erreur"
      ],
      "degres": ["À revoir", "Réalisé"] },
    { "id": "bilan", "type": "questions", "titre": "Bilan",
      "questions": ["Ce que j’ai appris :", "Ce que je dois améliorer :"] },

    // ---------- À retenir (fiche « Ce qu'il faut retenir ») ----------
    { "id": "retenir-chaine", "type": "info", "titre": "La chaîne d’information", "court": "La chaîne d’information",
      "lignes": [
        "Capteurs : reçoivent des informations (les 4 boutons détectent l’appui du joueur).",
        "Carte programmable : reçoit, analyse et décide (l’Arduino Uno).",
        "Actionneurs : agissent sur le monde (les LED qui s’allument, le buzzer qui joue un son)."
      ] },
    { "id": "retenir-vocabulaire", "type": "info", "titre": "Vocabulaire à connaître", "court": "Le vocabulaire",
      "lignes": [
        "Objet technique : objet fabriqué par l’humain qui répond à un besoin (le Simon).",
        "Besoin, problématique : ce que l’utilisateur cherche à faire grâce à l’objet (mémoriser et rejouer une séquence de couleurs sans se tromper).",
        "Cahier des charges : la liste des attentes que la solution doit respecter (le standard de câblage D2 à D10, les éléments obligatoires de l’affiche).",
        "Prototype : une première version réelle de l’objet, construite pour être testée (la Console Officielle avant le Grand Tournoi)."
      ] },
    { "id": "retenir-algorithme", "type": "info", "titre": "Algorithme, algorigramme, programme", "court": "Algorithme et programme",
      "lignes": [
        "Algorithme : suite d’étapes, écrite en langage naturel, pour résoudre un problème (montrer la séquence, attendre la réponse, comparer).",
        "Algorigramme : le dessin de l’algorithme, avec des symboles reliés par des flèches : ovale (début, fin), rectangle (action), losange (condition), rectangle à double bord (fonction).",
        "Programme : l’algorigramme traduit en blocs ou en code pour être exécuté par la carte."
      ] },
    { "id": "retenir-donnees", "type": "info", "titre": "Programmer avec des données structurées", "court": "Variables, listes, fonctions",
      "lignes": [
        "Variable : une boîte nommée qui contient une valeur, modifiable au cours du programme (etape).",
        "Liste : plusieurs données rangées sous un seul nom, dans un ordre précis (la liste sequence ; le premier élément est le n° 1).",
        "Fonction : un groupe de blocs avec un nom, qu’on appelle autant de fois qu’on veut (allumer avec couleur).",
        "Condition (si…) : une action qui ne s’exécute que si une condition est vraie. Boucle (répéter…) : une action répétée sans la recopier."
      ] }
  ]
});
