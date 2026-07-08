# 🏆 Delta Gold — WhatsApp Bot

> Bot WhatsApp complet avec **335 commandes** réparties en **17 catégories**, dashboard interactif, pairing code, images aléatoires, et intégration IA.

**Développé par [Mcamara](https://wa.me/224612908366)**

---

## ✨ Fonctionnalités

| Fonctionnalité | Description |
|---|---|
| 🤖 **335 commandes** | Outils, IA, Groupe, Fun, Réaction, Conversion, Recherche, Téléchargement, Économie, Games, Logo, FX Audio, et plus |
| 📱 **Pairing Code** | Connexion WhatsApp directe via le dashboard — sans QR code |
| 💬 **Chat intégré** | Interface de chat WhatsApp dans le dashboard pour tester les commandes |
| 🔍 **Recherche** | Recherche instantanée parmi toutes les catégories |
| 🔒 **Mode Public/Privé** | Contrôle d'accès au bot |
| 🖼️ **Images aléatoires** | Pool de 13 images avec rotation automatique sur chaque réponse |
| 🤖 **IA Mistral** | Commandes `.gpt`, `.claude`, `.gemini`, `.copilot`, `.blackbox`, `.llama` via Mistral AI |
| 📊 **Dashboard** | Interface mobile-first avec onglets, grille de commandes, status en temps réel |

---

## 📁 Structure du projet

```
delta-gold/
├── server.js           # Serveur Express (API + statiques)
├── bot.js              # Connexion WhatsApp via Baileys
├── commands.js         # Routeur des 335 commandes
├── ai.js               # Intégration Mistral AI
├── images.js           # Pool d'images aléatoires
├── data/
│   └── commands.js     # Base de données des commandes
├── ui/
│   ├── dashboard.js    # Interface principale (header, tabs, pairing)
│   ├── chat-view.js    # Interface de chat WhatsApp
│   └── commands-view.js # Grille de commandes avec recherche
├── index.html          # Page du dashboard
├── styles.css          # Styles WhatsApp dark + gold accents
├── main.js             # Point d'entrée de l'application
├── package.json        # Dépendances Node.js
├── .env.example        # Exemple de variables d'environnement
├── render.yaml         # Configuration Render Blueprint (déploiement one-click)
└── .env                # Variables d'environnement (à créer)
```

---

## 🚀 Déploiement sur Render

> ⚠️ **IMPORTANT** : Les fichiers doivent être à la **RACINE** du repo GitHub, pas dans un sous-dossier.
>
> ```
> ✅ CORRECT :                  ❌ FAUX :
> mon-repo/                     mon-repo/
> ├── package.json              └── delta-gold/
> ├── server.js                     ├── package.json
> ├── index.html                    ├── server.js
> └── ...                           └── ...
> ```

### 1. Prérequis

- Un compte [Render](https://render.com)
- Un repository GitHub avec ce code

### Option A — Déploiement one-click (Blueprint)

Le fichier `render.yaml` est inclus dans le repo. Il configure automatiquement le service, les variables d'environnement et le disque persistant.

1. Poussez le code sur GitHub
2. Allez sur [render.com/blueprints](https://render.com/blueprints)
3. Cliquez **New Blueprint Instance**
4. Connectez votre repo GitHub
5. Render détecte `render.yaml` et crée le service automatiquement
6. Renseignez les variables `OWNER_NUMBER`, `OWNER_NAME` et `MISTRAL_API_KEY` dans l'interface
7. Cliquez **Apply** → le service se lance avec le disque persistant déjà monté

### 2. Créer le service

1. Allez sur **Render Dashboard** → **New** → **Web Service**
2. Connectez votre repository GitHub
3. Configurez :

| Champ | Valeur |
|---|---|
| **Name** | `delta-gold` |
| **Environment** | `Node` |
| **Build Command** | `npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | Free ou Basic |
| **Region** | Frankfurt (ou la plus proche) |

### 3. Variables d'environnement

Dans l'onglet **Environment** de votre service Render :

```env
# Requis
OWNER_NUMBER=224612908366
OWNER_NAME=Mcamara
BOT_PREFIX=.

# IA Mistral (optionnel — pour les commandes .gpt, .claude, etc.)
MISTRAL_API_KEY=votre_cle_api_mistral
MISTRAL_MODEL=mistral-small-latest
MISTRAL_INSTRUCTIONS=Tu es Delta Gold, assistant WhatsApp intelligent et amical créé par Mcamara. Réponds de manière concise et utile en français.

# Liens (optionnel)
CHANNEL_LINK=https://whatsapp.com/channel/votre-chaine

# Port (Render utilise la variable PORT automatiquement)
PORT=3000
```

### 4. Disque persistant (important !)

Pour que la session WhatsApp survive aux redémarrages :

1. Allez dans votre service → **Disks**
2. Créez un disque :
   - **Name** : `auth-info`
   - **Mount Path** : `/opt/render/project/src/auth_info`
   - **Size** : 1 GB

### 5. Premier lancement

1. Déployez le service
2. Ouvrez le dashboard : `https://votre-service.onrender.com`
3. Onglet **Connexion** → Entrez votre numéro → **Générer le code de pairing**
4. Sur WhatsApp : ⋮ → Appareils reliés → Lier un appareil → Entrez le code

---

## 💻 Développement local

```bash
# Cloner le repository
git clone https://github.com/votre-username/delta-gold.git
cd delta-gold

# Installer les dépendances
npm install

# Créer le fichier .env
cp .env.example .env
# Éditez .env avec vos informations

# Lancer le bot + dashboard
npm start
```

Le dashboard sera accessible sur **http://localhost:3000**

---

## 📋 Liste des commandes

### 🔧 Outils (23)
`.menu` `.ping` `.owner` `.description` `.developpeur` `.uptime` `.system_status` `.test` `.translate` `.pair` `.repo` `.support` `.allmenu` `.capture` `.gitclone` `.obfuscate` `.qr` `.tempinbox` `.tempmail` `.theme` `.tovv` `.vv` `.vv2`

### 🤖 IA (7)
`.gpt` `.claude` `.gemini` `.copilot` `.blackbox` `.llama` `.dalle`

### 👥 Groupe (41)
`.kick` `.promote` `.demote` `.tagall` `.tag` `.tagadmin` `.close` `.open` `.lock` `.unlock` `.link` `.ginfo` `.gname` `.gdesc` `.getpp` `.revoke` `.kickall` `.warn` `.poll` `.poll2` `.vcf` `.welcome` `.goodbye` `.acceptall` `.rejectall` `.join` `.leave` `.gcreate` et plus...

### 🎮 Fun (11)
`.blague` `.citation` `.fancy` `.fliptext` `.ship` `.readmore` `.rank` `.toprank` `.profile` `.couplepp` `.fake`

### 💋 Réaction (27)
`.embrasser` `.caliner` `.gifler` `.danser` `.enlacer` `.mordre` `.saluer` `.sourire` `.pleurer` `.pousser` `.sauter` `.heureux` `.highfive` `.lancer` `.lecher` `.tenir_main` `.tuer` `.clin_doeil` `.tapoter` `.rougir` `.assommer` `.awoo` `.coup_de_pied` `.croquer` `.embeter` `.gener` `.sourire_fier`

### 👑 Owner (42)
`.ban` `.deban` `.block` `.deblock` `.restart` `.delete` `.clear` `.setvar` `.getvar` `.delvar` `.setsudo` `.delsudo` `.anticall` `.antidelete` `.chatbot` `.onlyadmins` `.jid` `.connect` `.disconnect` et plus...

### 🔄 Conversion (18)
`.sticker` `.ttp` `.attp` `.tts` `.toaudio` `.toimage` `.tovideo` `.quotely` `.circle` `.crop` `.emix` `.fusion` `.remini` `.round` `.stickertovideo` `.take` `.url` `.write`

### 🔍 Recherche (10)
`.google` `.wiki` `.meteo` `.lyrics` `.anime` `.github` `.imdb` `.img` `.shazam` `.stickersearch`

### 📥 Téléchargement (11)
`.song` `.video` `.yta` `.ytv` `.tiktok` `.tiktokaudio` `.tiktokimage` `.igdl` `.fbdl` `.twitterdl` `.app`

### 💰 Économie (11)
`.myecon` `.bonus` `.depot` `.retrait` `.transfer` `.vol` `.slot` `.pari` `.capacite` `.don` `.resetaccount`

### 🎲 Games (4)
`.tictactoe` `.anime-quizz` `.dmots` `.wcg`

### 🖼️ Image Édits (23)
`.affect` `.beautiful` `.blur` `.circle1` `.colorful` `.darkness` `.facepalm` `.greyscale` `.jail` `.pixelate` `.rainbow` `.rip` `.sepia` `.shit` `.threshold` `.trash` `.trigger` `.wanted` `.wasted` `.hitler` `.invert1` `.jokeoverhead` `.delete_image`

### ✨ Logo (53)
`.avengers` `.blackpink` `.captain_america` `.cloud` `.cubic` `.deadpool` `.dragonball` `.football` `.futuris` `.galaxy` `.glass` `.gold1` `.graffiti1` `.hacker` `.metal` `.naruto` `.neon1` `.onepiece` `.paint` `.plasma` `.rain` `.sand` `.sci_fi` `.space` `.steel` `.summery` `.thor` `.thunder` `.typography` `.underwater` `.vintage` `.watercolor` `.wood` et plus...

### 🎵 FX Audio (40)
`.alien` `.bass` `.blown` `.buzz` `.cave` `.chipmunk` `.chorus` `.compressor` `.dark` `.deep` `.distortion` `.dizzy` `.earrape` `.echo` `.fast` `.fat` `.flanger` `.ghost` `.haunting` `.invert` `.lofi` `.mono` `.muted` `.nightcore` `.panorama` `.phaser` `.radio` `.reverb` `.reverse` `.robot` `.slow` `.smooth` `.space` `.squirrel` `.surround` `.telephone` `.tremolo` `.underwater` `.vibrato` `.vintage`

### 🔒 Confidentialité (9)
`.getprivacy` `.groupadd` `.lastseen` `.mypp` `.mystatus` `.online` `.presence` `.read` `.setbio`

### 📱 Status (5)
`.dl_status` `.lecture_status` `.likestatus` `.save` `.sendme`

### ⚙️ Système (5)
`.setvar` `.getvar` `.delvar` `.checkupdate` `.update`

---

## 🔧 Dépannage Render

### Erreur `Cannot find module 'server.js'` (MODULE_NOT_FOUND)

Le fichier `server.js` n'est pas à la racine du repo GitHub.

**Cause** : Vous avez probablement décompressé le zip dans un sous-dossier de votre repo. Render cherche `server.js` à `/opt/render/project/src/server.js`.

**Solution** :
1. Vérifiez que `server.js`, `package.json`, `index.html`, `bot.js` etc. sont à la **racine** du repo GitHub
2. Si vos fichiers sont dans un sous-dossier (ex: `delta-gold/`), déplacez-les à la racine :
   ```bash
   # Depuis la racine du repo
   mv delta-gold/* delta-gold/.* . 2>/dev/null
   rmdir delta-gold
   git add -A && git commit -m "Fix: fichiers a la racine" && git push
   ```
3. Redéployez sur Render

### Erreur `ENOENT: no such file or directory, stat 'index.html'`

Le serveur ne trouve pas les fichiers statiques. Causes possibles :

1. **Structure du repo** : Vérifiez que `index.html` est à la racine du repository (pas dans un sous-dossier)
2. **Log debug** : Dans les logs Render, cherchez :
   ```
   📂 __dirname: /opt/render/project/src
   📄 index.html: /opt/render/project/src/index.html | exists: true
   ```
   Si `exists: false`, les fichiers ne sont pas au bon endroit
3. **Fix appliqué** : `server.js` utilise `express.static(__dirname)` et un fallback `app.get('*')` vers `index.html`

### Erreur `makeWASocket is not a function`

L'import Baileys ne fonctionne pas avec certaines versions. Fix appliqué :

```js
// AVANT (cassé avec certaines versions de Baileys)
import makeWASocket, { DisconnectReason, ... } from '@whiskeysockets/baileys';

// APRÈS (fonctionne avec toutes les versions)
import * as Baileys from '@whiskeysockets/baileys';
const { default: makeWASocket, DisconnectReason, ... } = Baileys;
```

### Erreur `Module not found: @whiskeysockets/baileys`

Les dépendances ne sont pas installées. Vérifiez :
- **Build Command** : `npm run build` (installe + vérifie la structure)
- **package.json** contient `"@whiskeysockets/baileys": "^6.7.12"` dans `dependencies`
- **Node.js version** : Render doit utiliser Node 18+ (configurez dans Environment → Node Version)

### Bot se déconnecte après quelques minutes

- Configurez un **disque persistant** (voir section 4 ci-dessus)
- Le dossier `auth_info` doit être monté sur `/opt/render/project/src/auth_info`
- Sans disque persistant, la session est perdue à chaque redéploiement

### Pairing code ne fonctionne pas

1. Le bot doit être démarré (status "En attente de pairing" dans le dashboard)
2. Le numéro doit être au format international (ex: `+224 612 908 366`)
3. WhatsApp doit supporter les sessions multi-appareils (version récente)
4. Si le code expire (~2 min), regénérez-en un nouveau

### Commandes IA (.gpt, .claude, etc.) ne répondent pas

- Ajoutez `MISTRAL_API_KEY` dans les variables d'environnement Render
- Obtenez une clé sur [console.mistral.ai](https://console.mistral.ai)
- Les commandes IA fonctionnent sans clé mais retournent un message d'erreur explicatif

---

## ⚠️ Notes importantes

- **Pairing Code** : La connexion via pairing code fonctionne avec les sessions multi-appareils de WhatsApp. Le bot reste connecté même si votre téléphone est hors ligne.
- **Mistral AI** : Les commandes IA (`.gpt`, `.claude`, etc.) nécessitent une clé API Mistral valide dans `.env`.
- **Disque persistant** : Sur Render, configurez un disque persistant pour que la session WhatsApp survive aux redéploiements.
- **Prefix** : Toutes les commandes utilisent le préfixe `.` par défaut (configurable dans `.env`).
- **Node.js** : Version 18 ou supérieure requise.

---

## 🛠️ Stack technique

| Composant | Technologie |
|---|---|
| **Runtime** | Node.js ≥ 18 |
| **Serveur** | Express 4 |
| **WhatsApp** | Baileys 6.7 |
| **IA** | Mistral AI API |
| **Dashboard** | Vanilla JS + Tailwind CSS |
| **Hébergement** | Render |

---

## 📄 Licence

Projet développé par **Mcamara**. Tous droits réservés.

---

<p align="center">
  <strong>🏆 Delta Gold</strong> — 335 commandes · 17 catégories · WhatsApp Bot
</p>
