# Simon Rétro Game

Carnet de projet des classes de 5e et 4e : un bureau d'études conçoit un jeu Simon de poche (boîtier 3D, affiche,
programme), la classe vote sur les affiches, un seul boîtier est imprimé (la Console Officielle) et le Grand Tournoi
se joue avec le programme de chaque équipe.

Le moteur, Blockly, le simulateur (avec la console Simon) et le parcours « simon » sont chargés depuis
**Labo Blocs en ligne**, sans copie dans ce dépôt, comme le Labyrinthe robotisé. Une connexion Internet est
nécessaire. Les JSON des équipes, leurs captures et leurs PDF restent dans les dossiers des équipes.

- Élèves : `site/index.html` · Professeur : `site/prof.html` · Tutoriel de câblage : `site/tuto-cablage.html`
- Mode d'emploi du professeur : [LISEZ-MOI.md](LISEZ-MOI.md)

## Organisation

| Dossier | Contenu |
|---|---|
| `site/donnees/` | ce que le professeur modifie : identité du projet, carnet, barème, niveaux, standard de câblage |
| `site/js/` | accueil, session, carnet, outil professeur (repris du Labyrinthe robotisé) |
| `site/js/moteur/` | carnet (types de parties, dont « image » et « fichier »), progression, note, classe, Excel |
| `tests/` | `node:test` : données, carnet, note, classe, exercices du parcours, code Arduino |
| `tools/` | serveur local, archive ZIP, équipes d'exemple, recette |

## Commandes

```bash
npm test
```

`npm test` télécharge d'abord le noyau et le parcours publiés de Labo Blocs dans `.cache/` (ignoré par Git).
`npm start` lance le serveur local (http://localhost:8080), `npm run exemples` crée des équipes fictives dans
`exemples/` pour essayer `prof.html`, `npm run archive` crée le ZIP pour le dossier réseau.

## Origine

Repris du projet Labyrinthe robotisé (`Anlito/labyrinthe-robotise`, 21/10/2026). Contenus : `carnet-projet.docx`,
`affiche-consigne.docx`, `fiche-explicative.docx`, `Fiche_Retenir_Simon_Retro_Game.pdf`, `simon-briefing.html` et
le tutoriel de câblage d'origine (étapes 1 à 5). Les exercices sont le parcours « simon » de Labo Blocs.
