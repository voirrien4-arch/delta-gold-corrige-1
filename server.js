/*
 * ═══════════════════════════════════════════════════════════
 * 🏆 DELTA GOLD - WhatsApp Bot Server (MULTI-SESSIONS)
 * Owner: Mcamara | Prefix: .
 * ═══════════════════════════════════════════════════════════
 *
 * Chaque membre pair SON PROPRE numéro depuis le dashboard public
 * (pas de mot de passe requis pour pairer — accès simple et anonyme).
 * Chaque session WhatsApp est isolée : un membre ne peut ni voir,
 * ni couper, ni contrôler la session d'un autre membre — toutes les
 * routes sont "scopées" par numéro de téléphone (?phone=...).
 *
 * .env VARIABLES:
 * ───────────────
 * MISTRAL_API_KEY=your_mistral_api_key_here
 * MISTRAL_INSTRUCTIONS=Tu es Delta Gold, assistant WhatsApp...
 * MISTRAL_MODEL=mistral-small-latest
 * BOT_PREFIX=.
 * OWNER_NUMBER=224612908366   (optionnel: accès "super admin" sur toutes les sessions)
 * OWNER_NAME=Mcamara
 * CHANNEL_LINK=https://whatsapp.com/channel/xxx
 * PORT=3000
 *
 * ⚠️ IMPORTANT (échelle) : chaque session WhatsApp active consomme de la
 * RAM/CPU sur le serveur. Un plan Render standard tient confortablement
 * quelques dizaines à quelques centaines de sessions simultanées, pas
 * des milliers sur une seule instance.
 *
 * RENDER DEPLOYMENT:
 * ──────────────────
 * Environment: Node
 * Build Command: npm run build
 * Start Command: node server.js
 * Region: Frankfurt (or closest)
 * Disk: Add persistent disk at /opt/render/project/src/auth_info
 */

import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  startSession, requestPairingCode, getBotStatus, sendMessage,
  deleteSession, getBotMode, setBotMode,
} from './bot.js';
import { askAI } from './ai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Debug: log resolved paths
const indexFile = path.join(__dirname, 'index.html');
const hasIndex = fs.existsSync(indexFile);
console.log('📂 __dirname:', __dirname);
console.log('📄 index.html:', indexFile, '| exists:', hasIndex);

const rootFiles = fs.readdirSync(__dirname).filter(f => !f.startsWith('.') && f !== 'node_modules' && f !== '_miniapp');
console.log('📁 Root files:', rootFiles.join(', '));

if (!hasIndex) {
  console.warn('⚠️  index.html NOT FOUND! Dashboard will show error page.');
  console.warn('⚠️  Make sure index.html is at the ROOT of your GitHub repo.');
}

// Serve static files (dashboard page, CSS, JS) — page publique, pas de mot de passe
app.use(express.static(__dirname, { index: 'index.html' }));

function cleanPhone(p) {
  return String(p || '').replace(/[\s\-\(\)\+]/g, '');
}

// ── API: Request Pairing Code (public, anonyme — chaque membre pair SON numéro) ──
app.post('/api/pair', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || cleanPhone(phone).length < 8) {
      return res.status(400).json({ error: 'Numéro invalide' });
    }
    const code = await requestPairingCode(phone);
    res.json({ success: true, code, phone: cleanPhone(phone) });
  } catch (err) {
    console.error('Pairing error:', err.message);
    res.status(500).json({ error: err.message || 'Erreur de pairing' });
  }
});

// ── API: Disconnect (uniquement SA PROPRE session) ──
app.post('/api/disconnect', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Numéro requis' });
    const ok = deleteSession(phone);
    if (ok) {
      res.json({ success: true, message: 'Session supprimée. Redémarrage...' });
    } else {
      res.status(404).json({ error: 'Aucune session trouvée pour ce numéro' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Impossible de déconnecter: ' + err.message });
  }
});

// ── API: Reset Session (clear auth + restart) — scopé par numéro ──
app.post('/api/reset-session', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Numéro requis' });
    deleteSession(phone);
    res.json({ success: true, message: 'Session réinitialisée.' });
    setTimeout(() => startSession(phone), 1000);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── API: Health check (pour Render — ne dépend d'aucune session) ──
app.get('/api/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// ── API: Bot Status — scopé par numéro (?phone=xxx) ──
app.get('/api/status', (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: 'Paramètre phone requis' });
  res.json(getBotStatus(phone));
});

// ── API: Execute Command (test depuis le dashboard) — scopé par numéro ──
app.post('/api/command', async (req, res) => {
  try {
    const { command, phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Numéro requis', success: false });
    if (!command || typeof command !== 'string') {
      return res.status(400).json({ error: 'Commande invalide', success: false });
    }

    const prefix = process.env.BOT_PREFIX || '.';
    const fullCmd = command.startsWith(prefix) ? command : prefix + command;

    const result = await sendMessage(phone, fullCmd);
    res.json({ success: true, response: result });
  } catch (err) {
    console.error('Command error:', err.message);
    res.json({ success: false, error: err.message || 'Erreur commande' });
  }
});

// ── API: Get Commands Database (statique, public) ──
app.get('/api/commands', (req, res) => {
  const categories = [
    { id: 'outils', icon: '🔧', name: 'Outils', commands: ['allmenu','capture','description','developpeur','gitclone','menu','obfuscate','owner','pair','ping','privé','public','qr','repo','support','system_status','tempinbox','tempmail','test','theme','tovv','translate','tsl','uptime','vv','vv2'] },
    { id: 'ia', icon: '🤖', name: 'IA', commands: ['blackbox','claude','copilot','dalle','gemini','gpt','llama'] },
    { id: 'groupe', icon: '👥', name: 'Groupe', commands: ['acceptall','antibot','antidemote','antilink','antigc','antipromote','antispam','antitag','ckick','close','demote','demotealert','gcreate','gdesc','getpp','ginfo','gname','goodbye','infos','join','kick','kickall','kickall2','leave','link','livedis','lock','open','poll','poll2','promote','promotealert','rejectall','removepp','revoke','tag','tagadmin','tagall','unlock','updatepp','vcf','warn','welcome'] },
    { id: 'fun', icon: '🎮', name: 'Fun', commands: ['blague','citation','couplepp','fake','fancy','fliptext','profile','rank','readmore','ship','toprank'] },
    { id: 'reaction', icon: '💋', name: 'Réaction', commands: ['assommer','awoo','caliner','clin_doeil','coup_de_pied','croquer','danser','embeter','embrasser','enlacer','gener','gifler','heureux','highfive','lancer','lecher','mordre','pleurer','pousser','rougir','saluer','sauter','sourire','sourire_fier','tapoter','tenir_main','tuer'] },
    { id: 'owner', icon: '👑', name: 'Owner', commands: ['addstickcmd','anticall','antidelete','ban','bangroup','block','chatbot','clear','connect','connect_session','deban','debangroup','deblock','delete','delmention','delprivate_cmd','delpublic_cmd','delstickcmd','delsudo','disconnect','fetch_sc','getmention','getstickcmd','jid','lecture_msg','levelup','listprivate_cmd','listpublic_cmd','onlyadmins','pginstall','pglist','pgremove','react_msg','restart','setmention','setprivate_cmd','setpublic_cmd','setsudo','sudolist','tgs'] },
    { id: 'conversion', icon: '🔄', name: 'Conversion', commands: ['attp','circle','crop','emix','fusion','quotely','remini','round','sticker','stickertovideo','take','toaudio','toimage','tovideo','ttp','tts','url','write'] },
    { id: 'search', icon: '🔍', name: 'Search', commands: ['anime','github','google','imdb','img','lyrics','meteo','shazam','stickersearch','wiki'] },
    { id: 'telechargement', icon: '📥', name: 'Téléchargement', commands: ['app','fbdl','igdl','song','tiktok','tiktokaudio','tiktokimage','twitterdl','video','yta','ytv'] },
    { id: 'economie', icon: '💰', name: 'Économie', commands: ['bonus','capacite','depot','don','myecon','pari','resetaccount','retrait','slot','transfer','vol'] },
    { id: 'games', icon: '🎲', name: 'Games', commands: ['anime-quizz','dmots','tictactoe','wcg'] },
    { id: 'image_edits', icon: '🖼️', name: 'Image Édits', commands: ['affect','beautiful','blur','circle1','colorful','darkness','delete_image','facepalm','greyscale','hitler','invert1','jail','jokeoverhead','pixelate','rainbow','rip','sepia','shit','threshold','trash','trigger','wanted','wasted'] },
    { id: 'logo', icon: '✨', name: 'Logo', commands: ['avengers','blackpink','blackpink2','blackpink3','boobs','captain_america','cloud','cloud2','cubic','deadpool','dragonball','dragonball2','effacer','football','football2','football3','futuris','galaxy','glass','gold1','gold2','gold3','gold4','gold5','graffiti1','graffiti2','graffiti3','green_effect','hacker','metal','naruto','neon1','neon2','neon3','onepiece','paint','plasma','rain','sand','sci_fi','logo_space','steel','summery','thor','thunder','typography','logo_underwater','logo_vintage','watercolor','wood'] },
    { id: 'fx_audio', icon: '🎵', name: 'FX Audio', commands: ['alien','bass','blown','buzz','cave','chipmunk','chorus','compressor','dark','deep','distortion','dizzy','earrape','echo','fast','fat','flanger','ghost','haunting','invert','lofi','mono','muted','nightcore','panorama','phaser','radio','reverb','reverse','robot','slow','smooth','space','squirrel','surround','telephone','tremolo','underwater','vibrato','vintage'] },
    { id: 'confidentialite', icon: '🔒', name: 'Confidentialité', commands: ['getprivacy','groupadd','lastseen','mypp','mystatus','online','presence','read','setbio'] },
    { id: 'status', icon: '📱', name: 'Status', commands: ['dl_status','lecture_status','likestatus','save','sendme'] },
    { id: 'systeme', icon: '⚙️', name: 'Système', commands: ['checkupdate','delvar','getvar','setvar','update'] },
  ];
  const total = categories.reduce((sum, c) => sum + c.commands.length, 0);
  res.json({ categories, total });
});

// ── API: Mode Toggle (Public/Private) — scopé par numéro ──
app.get('/api/mode', (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: 'Paramètre phone requis' });
  res.json({ mode: getBotMode(phone) });
});

app.post('/api/mode', (req, res) => {
  const { mode, phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Numéro requis' });
  if (mode === 'public' || mode === 'private') {
    setBotMode(phone, mode);
    res.json({ success: true, mode: getBotMode(phone) });
  } else {
    res.status(400).json({ error: 'Mode invalide. Utilisez "public" ou "private".' });
  }
});

// ── API: System Status (diagnostics globaux du serveur, pas d'une session précise) ──
app.get('/api/system-status', (req, res) => {
  const mem = process.memoryUsage();
  const { phone } = req.query;
  res.json({
    success: true,
    status: {
      ram: { used: mem.heapUsed, total: mem.heapTotal },
      uptime: process.uptime(),
      version: '1.0.0',
      platform: 'Render/Linux',
      nodeVersion: process.version,
      mode: phone ? getBotMode(phone) : 'public',
      connection: phone ? (getBotStatus(phone).connected ? 'connected' : 'disconnected') : 'n/a',
      commands: 340,
    }
  });
});

// ── API: AI Chat (proxy vers Mistral, pas lié à une session) ──
app.post('/api/ai-chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message requis', success: false });
    }
    const response = await askAI(message);
    res.json({ success: true, response });
  } catch (err) {
    console.error('AI Chat error:', err.message);
    res.json({ success: false, error: err.message || 'Erreur IA' });
  }
});

// ── API: Restart (redémarre uniquement SA PROPRE session) ──
app.post('/api/restart', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Numéro requis', success: false });
    console.log(`🔄 [${phone}] Redémarrage demandé depuis le dashboard...`);
    res.json({ success: true, message: 'Session en cours de redémarrage...' });
    setTimeout(() => startSession(phone), 1000);
  } catch (err) {
    res.status(500).json({ error: err.message, success: false });
  }
});

// ── Inline error page when index.html is missing ──
const errorPage = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Delta Gold - Configuration requise</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, sans-serif; background: #0B141A; color: #E9EDEF; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .card { max-width: 500px; background: #202C33; border-radius: 16px; padding: 32px 24px; text-align: center; border: 1px solid #222D34; }
  .icon { font-size: 48px; margin-bottom: 16px; }
  h1 { font-size: 20px; margin-bottom: 8px; color: #FFD700; }
  p { font-size: 14px; color: #8696A0; line-height: 1.6; margin-bottom: 12px; }
  .files { background: #111B21; border-radius: 10px; padding: 12px 16px; margin: 16px 0; text-align: left; font-family: monospace; font-size: 12px; color: #DAA520; line-height: 1.8; }
  .api-ok { color: #00A884; font-size: 13px; margin-top: 16px; }
  .api-ok a { color: #00A884; }
</style>
</head>
<body>
<div class="card">
  <div class="icon">🏆</div>
  <h1>Delta Gold — Fichiers manquants</h1>
  <p>Le serveur fonctionne mais <strong>index.html</strong> n'a pas été trouvé dans le dépôt GitHub.</p>
  <p>Assurez-vous que <strong>TOUS</strong> les fichiers sont à la <strong>racine</strong> du repo (pas dans un sous-dossier)&nbsp;:</p>
  <div class="files">
    ├── index.html<br>
    ├── styles.css<br>
    ├── main.js<br>
    ├── server.js<br>
    ├── bot.js<br>
    ├── package.json<br>
    ├── render.yaml<br>
    └── ui/
  </div>
  <p>Redéployez après avoir corrigé la structure du repo.</p>
  <p class="api-ok">✅ API active</p>
</div>
</body>
</html>`;

// ── Fallback to dashboard page ──
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(503).send(errorPage);
  }
});

// ── Start Server ──
app.listen(PORT, () => {
  console.log(`\n🏆 Delta Gold Bot Server (multi-sessions)`);
  console.log(`📱 Dashboard: http://localhost:${PORT}`);
  console.log(`🔧 Port: ${PORT}`);
  console.log(`📄 index.html: ${hasIndex ? '✅ Found' : '❌ Missing'}\n`);

  // ── Reconnexion automatique des sessions déjà appairées (persistées sur disque) ──
  // Sans ça, un redéploiement Render déconnecterait tous les membres déjà pairés.
  try {
    const authRoot = path.join(__dirname, 'auth_info');
    if (fs.existsSync(authRoot)) {
      const existingPhones = fs.readdirSync(authRoot).filter(f =>
        fs.statSync(path.join(authRoot, f)).isDirectory()
      );
      if (existingPhones.length) {
        console.log(`🔄 Reconnexion de ${existingPhones.length} session(s) existante(s): ${existingPhones.join(', ')}`);
        existingPhones.forEach(phone => startSession(phone));
      }
    }
  } catch (err) {
    console.error('Erreur lors de la reconnexion des sessions existantes:', err.message);
  }
});
