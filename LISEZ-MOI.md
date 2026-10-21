# Projet Simon Rétro Game — LISEZ-MOI (professeur)

Le carnet de projet numérique du Simon Rétro Game (5e et 4e) : il remplace le « Carnet de Projet Numérique » en
Word, les consignes de l'affiche et de la fiche explicative, et la programmation en C++. Les élèves, en bureau d'études
de 2 ou 3, y font tout le projet : analyse, boîtier 3D, affiche, câblage, algorithme, programmation en blocs (avec
**Labo Blocs**, son simulateur et sa console Simon), bilan. Pas de compte, pas de serveur : tout se passe dans le
navigateur, et le travail de chaque équipe est enregistré dans **un fichier** dans le dossier de l'équipe.

- **Élèves** : `index.html` (lien « Tutoriel de câblage » en haut du carnet : `tuto-cablage.html`)
- **Professeur** : `prof.html` (aucun lien depuis l'écran des élèves)
- **Mode enseignant** (exercices tous ouverts, bouton « Solution », rien n'est enregistré) : `index.html?enseignant=1`

Le moteur, Blockly, le simulateur et le parcours « simon » sont chargés depuis **Labo Blocs en ligne** (comme le
Labyrinthe) : **une connexion Internet est nécessaire**. Après une publication du parcours dans Labo Blocs,
recharger les pages.

---

## 1. Le matériel et le standard de câblage

Chaque groupe a son kit (Arduino Uno, platine d'essai, 4 boutons, 4 LED, buzzer, fils Dupont). Le câblage est
**imposé à tous** : un programme marche sur n'importe quelle console, et sur la Console Officielle du tournoi.

| Couleur (n° dans la liste) | Bouton | LED |
|---|---|---|
| Bleu (1) | **D2** | **D3** |
| Vert (2) | **D4** | **D5** |
| Jaune (3) | **D6** | **D7** |
| Rouge (4) | **D8** | **D9** |
| Buzzer (passif) | signal **D10**, + 5V, GND | |

Les boutons relient leur broche à la masse (résistance interne de la carte). Toutes les masses vont sur le rail −
de la platine, et un seul fil relie ce rail au GND de l'Arduino. Ce standard est écrit une seule fois, dans
`site/donnees/cablage.js` : le tutoriel le lit, et les tests vérifient que le carnet et les exercices disent la même chose.

## 2. Ce que font les élèves

1. **Accueil** : « Nouvelle équipe » (1 à 3 prénoms et la classe) ou « Ouvrir notre équipe ».
2. **Dossier de l'équipe** : chemin `Bureau › Classe › 5A › COMMUN › TECHNOLOGIE › SIMON RETRO GAME`. L'élève
   sélectionne `SIMON RETRO GAME` : le carnet y crée le dossier de l'équipe (`Prénom_Prénom`). Une sauvegarde déjà
   présente n'est jamais écrasée.
3. **Le carnet**, en onglets :

   | Onglet | Contenu | « Vérifier » |
   |---|---|---|
   | Le projet | mission, règles du concours, feuille de route, page de garde (nom, slogan, membres), logo (image collée) | — |
   | Analyse | chaîne d'information, classement capteur / carte / actionneur, fonctionnement du Simon, relevé de dimensions (bouton, LED, buzzer, Arduino, platine, prise USB) | classement, fonctionnement |
   | Boîtier 3D | cahier des charges (Simon de poche), forme choisie, captures Tinkercad (Ctrl+V), difficultés ; photos du professeur | — |
   | Affiche et fiche | consigne de l'affiche (Canva), relecture, **dépôt du PDF** ; consigne de la fiche explicative, relecture, dépôt du PDF | — |
   | Câblage | standard D2 à D10, branchements à retrouver, vérification avant l'USB | branchements |
   | Algorithme | l'algorithme en français, les étapes du jeu, les symboles de l'algorigramme | étapes, symboles |
   | Programmation | les 12 exercices de Labo Blocs (11 « Mon Simon » = programme du tournoi, 12 = défi au hasard), envoi dans la carte | par Labo Blocs |
   | Bilan | grille d'auto-évaluation (7 critères), bilan | — |
   | À retenir | la fiche « Ce qu'il faut retenir » | — |

4. **Captures** : Windows + Maj + S, puis clic dans le cadre et Ctrl + V. L'image est réduite et rangée dans le
   fichier de l'équipe : le professeur la voit dans l'outil professeur.
5. **Affiche** : dans Canva, « Partager › Télécharger › PDF standard », puis « Déposer le fichier ». Le PDF est copié
   dans le dossier de l'équipe sous le nom `Affiche_Prénom_Prénom.pdf` (fiche explicative : `Fiche_explicative_…`).
   Pour le vote, il suffit de récupérer ces fichiers dans les dossiers des équipes.

## 3. L'outil professeur et la note

- Ouvrir le dossier `SIMON RETRO GAME` de la classe (suivi en direct), ou importer des `.json`.
- Fiche d'une équipe : Bilan, Programmation, **Carnet de projet** (réponses, captures, PDF déposés, niveau de
  maîtrise), Historique, **Photos du boîtier** (croquis du boîtier, console assemblée, par webcam).
- **Barème** (`donnees/notation.js`, réglable dans « Barème ») : chaque étape est notée.
  - Programmation : coefficients des exercices 1 à 11 (de 0,5 à 3 pour « Mon Simon ») ; défi n° 12 : +1 point.
  - Analyse : classement et fonctionnement (automatiques), relevé de dimensions (à la main).
  - Boîtier 3D : captures Tinkercad (à la main, coefficient 4). Affiche : PDF déposé (à la main, coefficient 4).
  - Câblage et algorithme : branchements, étapes du jeu, symboles (automatiques).
  - À la main : Non atteint (1/4), Partiellement atteint (2/4), Atteint (3/4), Dépassé (4/4) ; tant qu'aucun niveau
    n'est choisi, la partie reste hors du total. Exporter ses évaluations pour les garder.
- Le Grand Tournoi n'est pas noté.

## 4. Modifier les contenus (sans toucher au programme)

| Je veux modifier… | Fichier |
|---|---|
| les **onglets et parties du carnet** (textes, éléments à classer, réponses des cases à compléter) | `site/donnees/carnet.js` (chaque type de partie est expliqué en tête du fichier) |
| le **barème** | `site/donnees/notation.js` |
| les **niveaux** (5, 4) et le **dossier du projet** | `site/donnees/classes.js` |
| le **standard de câblage** (tutoriel) | `site/donnees/cablage.js` |
| le nom, les titres, la couleur du projet | `site/donnees/projet.js` |
| les **exercices** (consignes, broches, tests, indices, fiches « À savoir », lexique) | dans **Labo Blocs** (parcours « simon ») |

Les réponses des élèves sont rangées sous l'identifiant de chaque partie : ne pas changer un `"id"` en cours d'année.

## 5. À vérifier en classe

- Ouverture depuis un poste élève (Chrome ou Edge), création du dossier de l'équipe, enregistrement automatique.
- Collage d'une capture (Ctrl+V) et dépôt d'un PDF depuis Canva : le PDF apparaît dans le dossier de l'équipe.
- Envoi de « Mon Simon » dans une Uno câblée de D2 à D10 : mêmes couleurs, mêmes notes que dans le simulateur.
- `prof.html` sur le dossier d'une classe : tableau, fiche d'équipe, captures, PDF, niveaux de maîtrise.
