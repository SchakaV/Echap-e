# Serveur multijoueur — Échappée

Ce serveur Node.js fait deux choses à la fois :

1. il **héberge le jeu lui-même** (les fichiers `index.html`, `css/`, `js/`)
   — un ami peut donc y jouer avec juste un navigateur, sans rien installer ;
2. il **arbitre les parties multijoueur** (dés, déplacements, classement) via
   WebSocket. Les clients ne font qu'afficher ce qu'il leur envoie et
   transmettre les actions du joueur.

## Lancer le serveur en local (sur ta machine)

```bash
cd server
npm install
npm start
```

Le serveur écoute par défaut sur le port **8080**. Ouvre alors
`http://localhost:8080` dans ton navigateur : c'est le jeu, servi directement
par ce serveur (plus besoin de Live Server pour le mode multijoueur).

Pour changer de port : `PORT=3000 npm start`

## Se connecter à une partie

1. Sur l'écran d'accueil, cliquer sur **Multijoueur en ligne**.
2. L'adresse du serveur se pré-remplit automatiquement. Indiquer un prénom,
   et :
   - laisser le code de salle vide pour **créer** une nouvelle salle,
   - ou entrer le code partagé par l'hôte pour **rejoindre** la sienne.
3. Dans le salon, chaque joueur compose sa propre équipe (3 coureurs,
   prénoms tirés au sort, modifiables). L'hôte règle le parcours et le
   nombre d'équipes IA en complément, puis démarre la course.

## Jouer avec un ami sur le même réseau (Wi-Fi)

Sur la machine qui héberge, lancer le serveur (`npm start`), puis trouver son
adresse IP locale (`ipconfig` sous Windows, `ipconfig getifaddr en0` sous
Mac). L'ami ouvre alors `http://192.168.1.23:8080` (avec la bonne adresse) —
il obtient directement le jeu, sans rien installer, et rejoint la salle avec
le code partagé.

## Jouer avec un ami à distance (sur Internet) — gratuit, sans logiciel

Il faut qu'une machine *toujours allumée* héberge le serveur. Le plus simple
et gratuit : le déployer sur **Render**. Une fois fait, il te suffit de
partager un lien (ex. `https://velo-jeu.onrender.com`) — ton ami l'ouvre dans
n'importe quel navigateur, aucune installation de son côté.

**Étape 1 — Mettre le code sur GitHub (sans rien installer, tout dans le
navigateur)**

1. Créer un compte gratuit sur [github.com](https://github.com) si tu n'en as
   pas.
2. Cliquer sur **New** (nouveau dépôt), lui donner un nom (ex. `velo-jeu`),
   le laisser **Public**, puis **Create repository**.
3. Sur la page du dépôt vide, cliquer sur **uploading an existing file** (ou
   *Add file → Upload files*).
4. Ouvrir le dossier `velo-jeu` sur ton ordinateur et **glisser-déposer tout
   son contenu** (le fichier `index.html`, et les dossiers `css/`, `js/`,
   `server/`) dans la zone d'upload du navigateur.
5. En bas de page, cliquer **Commit changes** pour valider l'envoi.

**Étape 2 — Déployer sur Render**

1. Créer un compte gratuit sur [render.com](https://render.com) (le plus
   simple : "Se connecter avec GitHub").
2. Cliquer **New +** → **Web Service**.
3. Choisir le dépôt `velo-jeu` créé à l'étape précédente (Render doit
   demander l'autorisation d'accéder à tes dépôts GitHub la première fois).
4. Renseigner :
   - **Root Directory** : `server`
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Instance Type** : `Free`
5. Cliquer **Create Web Service**. Render installe et démarre le serveur
   (~1-2 minutes) et donne une adresse du type
   `https://velo-jeu-xxxx.onrender.com`.

**Étape 3 — Jouer**

Toi et ton ami ouvrez cette même adresse dans un navigateur — c'est le jeu.
Un de vous deux crée la salle (code vide), partage le code affiché, l'autre
le rejoint. Aucun des deux n'a besoin d'installer quoi que ce soit.

⚠️ Sur le plan gratuit de Render, le serveur "s'endort" après un moment
d'inactivité et met 30 à 60 secondes à se réveiller au premier chargement —
patience sur la toute première connexion de la session.

## Limites de cette première version

- **Course unique uniquement** : pas encore de courses par étapes en ligne
  (donc pas de maillots ni de classement général sur cette version
  multijoueur — uniquement le classement de la course et les points). Le
  contre-la-montre (nouveau en solo) n'est pas encore disponible en ligne.
- **Une salle = une course en cours** : pas de reprise après déconnexion en
  cours de course (le joueur peut se reconnecter, mais avec un nouveau
  client il rejoindra une nouvelle équipe plutôt que de récupérer la
  sienne).
- Pas de tchat.

L'architecture (moteur de jeu séparé de l'affichage, déjà pensée pour ça
dans la version solo) permettrait d'ajouter ces points assez naturellement
par la suite.
