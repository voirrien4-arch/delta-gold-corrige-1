// Delta Gold - Command Router (340 commands in 17 categories)
// © 2025 Mcamara

import { categories, BOT_INFO } from './data/commands.js';
import { askAI } from './ai.js';
import { getRandomImage } from './images.js';

const PREFIX = process.env.BOT_PREFIX || '.';
const OWNER = process.env.OWNER_NUMBER || '224612908366';
const OWNER_NAME = process.env.OWNER_NAME || 'Mcamara';
const CHANNEL = process.env.CHANNEL_LINK || '';
const startTime = Date.now();

// Commands that are always allowed even in private mode (for non-owners)
const ALWAYS_ALLOWED = ['menu', 'allmenu', 'ping', 'test'];
const MODE_COMMANDS = ['public', 'privé'];

// ══════════════════════════════════════════════════════════
// MAIN ROUTER
// ══════════════════════════════════════════════════════════

export async function handleCommand(sock, msg, deps = {}) {
  const text = getMessageText(msg);
  if (!text || !text.startsWith(PREFIX)) return;

  const parts = text.slice(PREFIX.length).trim().split(/\s+/);
  const command = (parts[0] || '').toLowerCase();
  const args = parts.slice(1);
  const from = msg.key.remoteJid;
  // Extract sender: split on @ to get user part, then remove :XX device suffix
  const sender = (msg.key.participant || msg.key.remoteJid).split('@')[0].replace(/:\d+$/, '');
  const pushName = msg.pushName || 'User';
  const isGroup = from.endsWith('@g.us');
  // ── Propriétaire effectif de CETTE session (celui qui l'a pairée) ──
  // Fallback sur OWNER (env) pour compatibilité si aucune session dynamique n'est fournie.
  const effectiveOwner = deps.ownerNumber || OWNER;
  const isOwner = sender === effectiveOwner || (!!deps.superOwnerNumber && sender === deps.superOwnerNumber);

  // ── MODE CHECK: Private mode blocks non-owners ──
  const currentMode = deps.botMode || 'private';
  if (currentMode === 'private' && !isOwner && !ALWAYS_ALLOWED.includes(command)) {
    return reply(sock, msg, from,
      '🔒 *Mode Privé*\n\nCe bot est en mode privé.\nSeul le propriétaire peut utiliser les commandes.\n\n💡 Le owner peut taper *.public* pour activer le mode public.');
  }

  // Handle mode commands early (they need setBotMode from deps)
  if (MODE_COMMANDS.includes(command)) {
    if (!isOwner) {
      return reply(sock, msg, from, '❌ Seul le propriétaire peut changer le mode du bot.');
    }
    return handleModeCommand(sock, msg, from, command, deps);
  }

  const cat = categories.find(c => c.commands.includes(command));
  if (!cat) {
    if (command) {
      await reply(sock, msg, from,
        `❌ Commande inconnue: *${PREFIX}${command}*\n\nTapez *${PREFIX}menu* pour les 340 commandes.`);
    }
    return;
  }

  const route = {
    outils: () => cmdOutils(sock, msg, from, command, args, pushName, isOwner, deps, effectiveOwner),
    ia: () => cmdIA(sock, msg, from, command, args, pushName),
    groupe: () => cmdGroupe(sock, msg, from, command, args, msg, isGroup, pushName, deps, isOwner),
    owner: () => cmdOwner(sock, msg, from, command, args, isOwner, effectiveOwner),
    fun: () => cmdFun(sock, msg, from, command, args, pushName, msg),
    conversion: () => cmdConversion(sock, msg, from, command, args, pushName),
    reaction: () => cmdReaction(sock, msg, from, command, args, pushName, msg),
    search: () => cmdSearch(sock, msg, from, command, args, pushName),
    telechargement: () => cmdDownload(sock, msg, from, command, args, pushName),
    economie: () => cmdEconomie(sock, msg, from, command, args, pushName),
    games: () => cmdGames(sock, msg, from, command, args, pushName),
    systeme: () => cmdSysteme(sock, msg, from, command, args, isOwner),
  };

  const handler = route[cat.id];
  if (handler) {
    await handler();
  } else {
    // Default: send formatted command info (confidentialite, fx_audio, image_edits, logo, status)
    await sendFormatted(sock, msg, from, cat, command, pushName);
  }
}

// ══════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════

function getMessageText(msg) {
  return msg.message?.conversation
    || msg.message?.extendedTextMessage?.text
    || msg.message?.imageMessage?.caption
    || msg.message?.videoMessage?.caption
    // Tap sur une commande du menu interactif (liste) →  envoie l'id de la ligne (ex: ".menu fun")
    || msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId
    // Tap sur un bouton classique →  envoie l'id du bouton
    || msg.message?.buttonsResponseMessage?.selectedButtonId
    || msg.message?.templateButtonReplyMessage?.selectedId
    || '';
}

function now() {
  return {
    date: new Date().toLocaleDateString('fr-FR'),
    time: new Date().toLocaleTimeString('fr-FR'),
  };
}

function getUptime() {
  const s = Math.floor((Date.now() - startTime) / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}j ${h}h ${m}m ${s % 60}s`;
}

// ── Mode command handler ──
function handleModeCommand(sock, msg, from, command, deps) {
  if (command === 'public') {
    if (deps.setBotMode) deps.setBotMode('public');
    return reply(sock, msg, from, `╭──⟪ 🌐 MODE PUBLIC ⟫──╮
├
├  ✅ Mode public activé !
├  Tous les utilisateurs peuvent
├  utiliser les commandes du bot.
├
├  🔒 Tapez *.privé* pour revenir
├  en mode privé (owner-only).
├
╰──────────────────────╯`);
  }

  if (command === 'privé') {
    if (deps.setBotMode) deps.setBotMode('private');
    return reply(sock, msg, from, `╭──⟪ 🔒 MODE PRIVÉ ⟫──╮
├
├  ✅ Mode privé activé !
├  Seul le propriétaire peut
├  utiliser les commandes.
├
├  🌐 Tapez *.public* pour rendre
├  le bot accessible à tous.
├
╰──────────────────────╯`);
  }
}

const CAPTION_MAX = 1024;

async function reply(sock, msg, from, text, options) {
  const imageUrl = getRandomImage();
  if (text.length <= CAPTION_MAX) {
    try {
      await sock.sendMessage(from, {
        image: { url: imageUrl },
        caption: text,
        ...options,
      }, { quoted: msg });
      return;
    } catch {}
  }
  // Long text or image fetch failed: send image + text separately
  try {
    await sock.sendMessage(from, {
      image: { url: imageUrl },
      caption: '🤖 *Delta Gold*',
    });
  } catch {}
  await sock.sendMessage(from, { text, ...options }, { quoted: msg });
}

function getMentionedJid(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
}

function getQuotedSender(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.participant || null;
}

function formatCaption(cat, cmd) {
  const { date, time } = now();
  return `┠ 🩸 ${cmd.toUpperCase()}
┠ ━━━━━━━━━━━━━━━━━━━━
┠ 📋 Catégorie: ${cat.name}
┠ 🩸 Commande: .${cmd}
┠ 🤖 Bot: Delta Gold v1.0.0
┠ 👤 Owner: ${OWNER_NAME}
┠ 📅 Date: ${date}
┠ ⏰ Heure: ${time}
┠ ━━━━━━━━━━━━━━━━━━━━
┠ 📌 Utilisation:
┠ Tapez .${cmd} dans le chat
┠
┠ ✅ Disponible 24/7
┠ ⚡ Réponse instantanée
┠ 🔒 Sécurisé & Chiffré
┠ ━━━━━━━━━━━━━━━━━━━━
┠ BOT: Delta Gold v1.0.0
┠ OWNER: ${OWNER_NAME}`;
}

async function sendFormatted(sock, msg, from, cat, cmd) {
  await reply(sock, msg, from, formatCaption(cat, cmd));
}

// ══════════════════════════════════════════════════════════
// OUTILS (23 commands)
// ══════════════════════════════════════════════════════════

async function cmdOutils(sock, msg, from, command, args, pushName, isOwner, deps, effectiveOwner) {
  const OWNER_DISPLAY = effectiveOwner || OWNER;
  switch (command) {
    case 'menu':
    case 'allmenu':
      return sendMenu(sock, msg, from, pushName, args);

    case 'ping': {
      const t0 = Date.now();
      await reply(sock, msg, from, '_🏓 Ping..._');
      return reply(sock, msg, from, `🏓 *Pong!*\n⚡ Latence: ${Date.now() - t0}ms\n⏰ Uptime: ${getUptime()}`);
    }

    case 'owner':
      return reply(sock, msg, from,
`╭──⟪ 👑 OWNER ⟫──╮
├ ߷ Nom: ${OWNER_NAME}
├ ߷ Numéro: +${OWNER_DISPLAY}
├ ߷ Bot: Delta Gold v1.0.0
├ ߷ Commandes: 340
╰──────────────────╯\n\n📱 Contact: https://wa.me/${OWNER_DISPLAY}`);

    case 'description':
      return reply(sock, msg, from,
`╭──⟪ 🤖 DELTA GOLD ⟫──╮
├ ߷ Nom: Delta Gold
├ ߷ Version: 1.0.0
├ ߷ Commandes: 340
├ ߷ Catégories: 17
├ ߷ Owner: ${OWNER_NAME}
├ ߷ Platform: Render
├ ߷ Langage: JavaScript
├ ߷ Library: Baileys
╰──────────────────╯`);

    case 'developpeur':
      return reply(sock, msg, from,
`╭──ߊ DEVELOPPEUR ╮
├ ߷ Nom: ${OWNER_NAME}
├ ߷ Bot: Delta Gold
├ ߷ Version: 1.0.0
╰─────────────────╯`);

    case 'uptime':
      return reply(sock, msg, from, `⏰ *Uptime:* ${getUptime()}`);

    case 'system_status': {
      const mem = process.memoryUsage();
      return reply(sock, msg, from,
`╭──⟪ ⚙️ SYSTÈME ⟫──╮
├ ߷ Uptime: ${getUptime()}
├ ߷ RAM: ${Math.round(mem.heapUsed / 1048576)}MB
├ ߷ Platform: ${process.platform}
├ ߷ Node: ${process.version}
├ ߷ Commandes: 340
├ ߷ Restarts: ${0}
╰──────────────────╯`);
    }

    case 'test':
      return reply(sock, msg, from, `✅ *Test réussi!*\n🤖 Delta Gold fonctionne.\n⏰ ${now().time}`);

    case 'translate':
      if (!args.length) return reply(sock, msg, from, `📝 Usage: ${PREFIX}translate <texte>`);
      await reply(sock, msg, from, '_⏳ Traduction..._');
      const trad = await askAI(`Traduis ce texte en français: ${args.join(' ')}`, 'Tu es un traducteur. Réponds uniquement avec la traduction.');
      return reply(sock, msg, from, `🌐 *Traduction:*\n\n${trad}`);

    case 'repo':
      return reply(sock, msg, from, '📂 *Delta Gold*\n\n🤖 Bot WhatsApp open-source\n📊 340 commandes\n🔧 JavaScript + Baileys\n\n⭐ GitHub: (configurez CHANNEL_LINK dans .env)');

    case 'support':
      return reply(sock, msg, from, `💬 *Support Delta Gold*\n\n👑 Owner: https://wa.me/${OWNER_DISPLAY}\n📋 Tapez ${PREFIX}menu pour voir toutes les commandes.\n\n📝 Contactez l'owner pour toute aide.`);

    case 'tsl': {
      if (!isOwner) return reply(sock, msg, from, '❌ Seul le propriétaire peut utiliser la traduction automatique.');
      const subCmd = (args[0] || '').toLowerCase();
      const langNames = {
        fr: 'Français', an: 'Anglais', pt: 'Portugais',
        al: 'Allemand', ht: 'Haïtien', br: 'Brésilien',
      };

      if (!subCmd) {
        const currentTsl = deps.getTranslationMode ? deps.getTranslationMode(sender) : null;
        const status = currentTsl ? '✅ Actif → *' + currentTsl.langName + '*' : '❌ Inactif';
        return reply(sock, msg, from,
          '╭──⟪ 🌐 TRADUCTION AUTO ⟫──╮\n' +
          '├\n' +
          '├  Status: ' + status + '\n' +
          '├\n' +
          '├  ── Langues disponibles ──\n' +
          '├  .tsl fr → Français\n' +
          '├  .tsl an → Anglais\n' +
          '├  .tsl pt → Portugais\n' +
          '├  .tsl al → Allemand\n' +
          '├  .tsl ht → Haïtien\n' +
          '├  .tsl br → Brésilien\n' +
          '├\n' +
          '├  ── Désactiver ──\n' +
          '├  .tsl off\n' +
          '├\n' +
          '╰──────────────────────╯');
      }

      if (subCmd === 'off') {
        if (deps.clearTranslationMode) deps.clearTranslationMode(sender);
        return reply(sock, msg, from, '🌐 *Traduction automatique désactivée.*\n\nVos messages ne seront plus traduits.');
      }

      if (!langNames[subCmd]) {
        return reply(sock, msg, from, '❌ Langue inconnue: *' + subCmd + '*\n\nLangues: fr, an, pt, al, ht, br\n\nUsage: .tsl fr ou .tsl off');
      }

      if (deps.setTranslationMode) deps.setTranslationMode(sender, subCmd);
      return reply(sock, msg, from,
        '╭──⟪ 🌐 TRADUCTION ACTIVÉE ⟫──╮\n' +
        '├\n' +
        '├  🎯 Langue: *' + langNames[subCmd] + '*\n' +
        '├\n' +
        '├  Tous vos messages seront\n' +
        '├  automatiquement traduits\n' +
        '├  en *' + langNames[subCmd] + '*.\n' +
        '├\n' +
        '├  ❌ Tapez *.tsl off* pour arrêter.\n' +
        '├\n' +
        '╰──────────────────────╯');
    }

    case 'pair':
    case 'connect': {
      const rawPhone = args.join(' ').trim();
      if (!rawPhone) {
        return reply(sock, msg, from,
`╭──⟪ 📱 PAIRING ⟫──╮
├
├  📝 Entrez votre numéro
├
├  Usage: .pair +243XXXXXXXXX
├
╰──────────────────────╯`);
      }
      // Only owner can pair from WhatsApp
      if (!isOwner) {
        return reply(sock, msg, from, '❌ Seul le propriétaire peut connecter un appareil.');
      }
      const cleaned = rawPhone.replace(/[\s\-\(\)]/g, '');
      const digits = cleaned.replace(/\+/g, '');
      if (digits.length < 8 || digits.length > 15 || !/^\d+$/.test(digits)) {
        return reply(sock, msg, from, '❌ Numéro invalide. Format: .pair +243XXXXXXXXX');
      }
      if (!deps.requestPairingCode) {
        return reply(sock, msg, from, '❌ Pairing non disponible. Le bot redémarre...');
      }
      await reply(sock, msg, from, '⏳ Génération du code de pairing...');
      try {
        const code = await deps.requestPairingCode(digits);
        return reply(sock, msg, from,
`╭──⟪ 🔑 PAIRING CODE ⟫──╮
├
├  Code: *${code}*
├
├  ── Comment connecter ──
├  1. Ouvrez WhatsApp
├  2. Appareils reliés
├  3. Lier un appareil
├  4. Entrez le code ci-dessus
├
╰──────────────────────╯`);
      } catch (err) {
        return reply(sock, msg, from, `❌ Erreur: ${err.message}\n\n💡 Assurez-vous que le bot est en ligne et réessayez.`);
      }
    }

    default: {
      const cat = categories.find(c => c.id === 'outils');
      return sendFormatted(sock, msg, from, cat, command);
    }
  }
}

async function sendMenu(sock, msg, from, pushName, args = []) {
  // ── Sous-menu d'une catégorie précise (ex: ".menu fun" ou tap sur une ligne) ──
  const askedCat = (args[0] || '').toLowerCase();
  if (askedCat) {
    const cat = categories.find(c => c.id === askedCat);
    if (cat) {
      const cmdList = cat.commands.map(c => `┠ ${PREFIX}${c}`).join('\n');
      return reply(sock, msg, from,
`╭──⟪ ${cat.icon} ${cat.name.toUpperCase()} ⟫──╮
├ ߷ 📊 ${cat.commands.length} commandes
╰──────────────────╯

${cmdList}

┠ ━━━━━━━━━━━━━━━━━━━━
┠ 💡 Tapez ${PREFIX}menu pour revenir au menu principal`);
    }
    // Catégorie inconnue → on retombe sur le menu principal ci-dessous
  }

  const { date, time } = now();
  const lines = categories.map(c =>
    `┠ ${c.icon} .menu ${c.id} → ${c.name} (${c.commands.length})`
  ).join('\n');

  const channelLine = CHANNEL ? `\n📢 Notre chaîne WhatsApp:\n${CHANNEL}\n` : '';

  const textMenu =
`╭──⟪ 🤖 DELTA GOLD MENU ⟫──╮
├ ߷ 🩸 Préfixe: .
├ ߷ 📊 Total: 340 commandes
├ ߷ 📋 Catégories: ${categories.length}
├ ߷ 👤 Owner: ${OWNER_NAME}
╰──────────────────╯

${lines}

┠ ━━━━━━━━━━━━━━━━━━━━
┠ 👋 ${pushName}
┠ 📅 ${date} ⏰ ${time}
┠ BOT: Delta Gold v1.0.0
┠ OWNER: ${OWNER_NAME}
${channelLine}`;

  // ── Menu interactif: liste tapable par catégorie ──
  // Un tap envoie ".menu <categorie>" comme si l'utilisateur l'avait tapé.
  // Certaines versions de WhatsApp n'affichent pas les listes interactives ;
  // dans ce cas on retombe automatiquement sur le menu texte classique.
  try {
    await sock.sendMessage(from, {
      text: `🤖 *DELTA GOLD*\n📊 340 commandes • ${categories.length} catégories\n\nAppuie sur *Voir les catégories* pour naviguer 👇${channelLine}`,
      footer: `Owner: ${OWNER_NAME} • ${date} ${time}`,
      title: '🤖 Delta Gold — Menu',
      buttonText: 'Voir les catégories',
      sections: [
        {
          title: 'Catégories de commandes',
          rows: categories.map(c => ({
            title: `${c.icon} ${c.name}`,
            rowId: `${PREFIX}menu ${c.id}`,
            description: `${c.commands.length} commandes`,
          })),
        },
      ],
    }, { quoted: msg });
    return;
  } catch (err) {
    console.error('Menu interactif indisponible, envoi du menu texte:', err.message);
  }

  await reply(sock, msg, from, textMenu);
}

// ══════════════════════════════════════════════════════════
// IA (7 commands) — All use Mistral AI
// ══════════════════════════════════════════════════════════

async function cmdIA(sock, msg, from, command, args, pushName) {
  if (!args.length) {
    return reply(sock, msg, from, `📝 Usage: ${PREFIX}${command} <votre question>\n\nEx: ${PREFIX}${command} Qu'est-ce que l'IA?`);
  }

  const prompts = {
    gpt: 'Tu es ChatGPT, assistant IA avancé. Réponds de manière détaillée.',
    claude: 'Tu es Claude, assistant IA éthique et réfléchi.',
    gemini: 'Tu es Gemini, assistant IA créatif et informatif.',
    copilot: 'Tu es Copilot, assistant de programmation. Aide avec le code.',
    blackbox: 'Tu es BlackBox, expert programmation. Donne du code propre.',
    llama: 'Tu es LLaMA, modèle open-source. Réponds précisément.',
    dalle: null,
  };

  if (command === 'dalle') {
    return reply(sock, msg, from, '🎨 *DALL-E*\n\n⚠️ Génération d\'images nécessite une API image.\nConfigurez une clé API dans .env.');
  }

  await reply(sock, msg, from, '_⏳ Réflexion..._');
  const result = await askAI(args.join(' '), prompts[command] || 'Tu es un assistant utile.');
  return reply(sock, msg, from, `🤖 *${command.toUpperCase()}*\n\n${result}`);
}

// ══════════════════════════════════════════════════════════
// GROUPE (41 commands)
// ══════════════════════════════════════════════════════════

async function cmdGroupe(sock, msg, from, command, args, fullMsg, isGroup, pushName, deps, isOwner) {
  const needGroup = ['kick','promote','demote','tagall','tag','tagadmin','close','open','lock','unlock','link','ginfo','gname','gdesc','getpp','removepp','updatepp','revoke','warn','vcf','poll','poll2','acceptall','rejectall','kickall','kickall2','ckick','gcreate','join','leave','goodbye','welcome'];
  // Also: 'infos', 'livedis' are group-only but handled separately
  if (command === 'infos' || command === 'livedis') {
    if (!isGroup) return reply(sock, msg, from, '❌ Cette commande fonctionne uniquement dans un groupe.');
  }
  if (needGroup.includes(command) && !isGroup) {
    return reply(sock, msg, from, '❌ Cette commande fonctionne uniquement dans un groupe.');
  }

  const mentioned = getMentionedJid(fullMsg);
  const quoted = getQuotedSender(fullMsg);

  // ── OWNER-ONLY GROUP COMMANDS ──
  const ownerOnlyGroup = ['kick','kickall','kickall2','ckick','promote','demote','gname','gdesc','revoke','warn'];
  if (ownerOnlyGroup.includes(command) && !isOwner) {
    return reply(sock, msg, from,
      '❌ *Commande réservée au propriétaire*\n\nSeul le owner du bot peut utiliser .' + command);
  }

  switch (command) {
    case 'kick': {
      const target = mentioned[0] || quoted;
      if (!target) return reply(sock, msg, from, `📝 Usage: ${PREFIX}kick @membre`);
      try {
        await sock.groupParticipantsUpdate(from, [target], 'remove');
        return reply(sock, msg, from, `✅ @${target.split('@')[0]} retiré.`);
      } catch { return reply(sock, msg, from, '❌ Impossible. Vérifiez mes permissions admin.'); }
    }

    case 'promote': {
      const target = mentioned[0];
      if (!target) return reply(sock, msg, from, `📝 Usage: ${PREFIX}promote @membre`);
      try {
        await sock.groupParticipantsUpdate(from, [target], 'promote');
        return reply(sock, msg, from, `✅ @${target.split('@')[0]} promu admin.`);
      } catch { return reply(sock, msg, from, '❌ Impossible.'); }
    }

    case 'demote': {
      const target = mentioned[0];
      if (!target) return reply(sock, msg, from, `📝 Usage: ${PREFIX}demote @membre`);
      try {
        await sock.groupParticipantsUpdate(from, [target], 'demote');
        return reply(sock, msg, from, `✅ @${target.split('@')[0]} rétrogradé.`);
      } catch { return reply(sock, msg, from, '❌ Impossible.'); }
    }

    case 'tagall': {
      const meta = await sock.groupMetadata(from);
      const ids = meta.participants.map(p => p.id);
      const text = args.length ? args.join(' ') : '📢 Attention à tous!';
      return sock.sendMessage(from, {
        text: `${text}\n\n${ids.map(i => `@${i.split('@')[0]}`).join(' ')}`,
        mentions: ids,
      });
    }

    case 'tag': {
      const meta = await sock.groupMetadata(from);
      const ids = meta.participants.map(p => p.id);
      return sock.sendMessage(from, { text: args.join(' ') || '📢', mentions: ids });
    }

    case 'tagadmin': {
      const meta = await sock.groupMetadata(from);
      const admins = meta.participants.filter(p => p.admin).map(p => p.id);
      return sock.sendMessage(from, {
        text: `${args.join(' ') || '👑 Admins:'}\n${admins.map(a => `@${a.split('@')[0]}`).join(' ')}`,
        mentions: admins,
      });
    }

    case 'close':
      await sock.groupSettingUpdate(from, 'announcement');
      return reply(sock, msg, from, '🔒 Groupe fermé. Seuls les admins écrivent.');

    case 'open':
      await sock.groupSettingUpdate(from, 'not_announcement');
      return reply(sock, msg, from, '🔓 Groupe ouvert.');

    case 'lock':
      await sock.groupSettingUpdate(from, 'announcement');
      return reply(sock, msg, from, '🔒 Groupe verrouillé.');

    case 'unlock':
      await sock.groupSettingUpdate(from, 'not_announcement');
      return reply(sock, msg, from, '🔓 Groupe déverrouillé.');

    case 'link': {
      try {
        const code = await sock.groupInviteCode(from);
        return reply(sock, msg, from, `🔗 *Lien du groupe:*\nhttps://chat.whatsapp.com/${code}`);
      } catch { return reply(sock, msg, from, '❌ Impossible de récupérer le lien.'); }
    }

    case 'ginfo': {
      const meta = await sock.groupMetadata(from);
      const admins = meta.participants.filter(p => p.admin).length;
      return reply(sock, msg, from,
`╭──⟪ 👥 GROUPE INFO ⟫──╮
├ ߷ Nom: ${meta.subject}
├ ߷ Membres: ${meta.participants.length}
├ ߷ Admins: ${admins}
├ ߷ Créé: ${new Date(meta.creation * 1000).toLocaleDateString('fr-FR')}
╰──────────────────╯`);
    }

    case 'revoke':
      try {
        await sock.groupRevokeInvite(from);
        return reply(sock, msg, from, '🔄 Lien du groupe révoqué.');
      } catch { return reply(sock, msg, from, '❌ Impossible.'); }

    case 'kickall': {      const meta = await sock.groupMetadata(from);
      const targets = meta.participants.filter(p => !p.admin).map(p => p.id);
      if (!targets.length) return reply(sock, msg, from, '👥 Aucun non-admin à retirer.');
      return reply(sock, msg, from, `⚠️ ${targets.length} membres non-admin détectés.\nFonctionnalité désactivée pour la sécurité.`);
    }

    case 'gname': {
      const newName = args.join(' ');
      if (!newName) return reply(sock, msg, from, `📝 Usage: ${PREFIX}gname <nouveau nom>`);
      try {
        await sock.groupUpdateSubject(from, newName);
        return reply(sock, msg, from, `✅ Nom du groupe changé: *${newName}*`);
      } catch { return reply(sock, msg, from, '❌ Impossible. Êtes-vous admin ?'); }
    }

    case 'gdesc': {
      const newDesc = args.join(' ');
      if (!newDesc) return reply(sock, msg, from, `📝 Usage: ${PREFIX}gdesc <nouvelle description>`);
      try {
        await sock.groupUpdateDescription(from, newDesc);
        return reply(sock, msg, from, '✅ Description du groupe mise à jour.');
      } catch { return reply(sock, msg, from, '❌ Impossible.'); }
    }

    case 'getpp': {
      try {
        const target = mentioned[0] || from;
        const ppUrl = await sock.profilePictureUrl(target, 'image');
        return sock.sendMessage(from, {
          image: { url: ppUrl },
          caption: `📸 Photo de profil de @${target.split('@')[0]}`,
          mentions: [target],
        });
      } catch { return reply(sock, msg, from, '❌ Impossible de récupérer la photo.'); }
    }

    case 'welcome':
      return reply(sock, msg, from,
`👋 *Message de bienvenue configuré*\n\nUsage: Envoyez un message avec *.welcome* en légende pour définir le message.\n\n💡 Système de bienvenue en développement.`);

    case 'goodbye':
      return reply(sock, msg, from,
`👋 *Message d\'au revoir configuré*\n\n💡 Système d\'au revoir en développement.`);

    case 'warn': {
      const target = mentioned[0] || quoted;
      if (!target) return reply(sock, msg, from, `📝 Usage: ${PREFIX}warn @membre [raison]`);
      const reason = mentioned[0] ? args.slice(1).join(' ') : args.join(' ');
      return reply(sock, msg, from,
`⚠️ *Avertissement*\n\n👤 Membre: @${target.split('@')[0]}\n📝 Raison: ${reason || 'Non spécifiée'}\n⚠️ 1/3 avertissements`,
        { mentions: [target] });
    }

    case 'poll':
    case 'poll2': {
      if (args.length < 2) return reply(sock, msg, from, `📝 Usage: ${PREFIX}${command} <question> | <option1> | <option2> ...`);
      const pollParts = args.join(' ').split('|').map(s => s.trim());
      const question = pollParts[0];
      const options = pollParts.slice(1);
      if (options.length < 2) return reply(sock, msg, from, '❌ Donnez au moins 2 options séparées par |');
      try {
        return sock.sendMessage(from, {
          poll: {
            name: question,
            values: options,
            selectableCount: command === 'poll2' ? options.length : 1,
          },
        });
      } catch { return reply(sock, msg, from, '❌ Impossible de créer le sondage.'); }
    }

    case 'vcf': {
      const meta = await sock.groupMetadata(from);
      const vcard = meta.participants.map(p => {
        // Clean number: remove :XX device suffix
        const num = p.id.split('@')[0].replace(/:\d+$/, '');
        return `BEGIN:VCARD\nVERSION:3.0\nFN:+${num}\nTEL;TYPE=CELL:+${num}\nEND:VCARD`;
      }).join('\n');
      return sock.sendMessage(from, {
        document: Buffer.from(vcard),
        mimetype: 'text/vcard',
        fileName: `${meta.subject}.vcf`,
      });
    }

    case 'infos': {
      try {
        const meta = await sock.groupMetadata(from);
        if (!meta || !meta.participants) return reply(sock, msg, from, '❌ Impossible de récupérer les infos du groupe.');
        const admins = meta.participants.filter(p => p.admin || p.admin === 'superadmin');
        const members = meta.participants;
        const createdDate = meta.creation
          ? new Date(meta.creation * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : 'Inconnue';

        let txt = '';
        txt += '══════════════════════════\n';
        txt += '  INFOS DU GROUPE\n';
        txt += '══════════════════════════\n\n';
        txt += 'Nom: ' + meta.subject + '\n';
        txt += 'ID: ' + from + '\n';
        txt += 'Cree le: ' + createdDate + '\n';
        txt += 'Membres: ' + members.length + '\n';
        txt += 'Admins: ' + admins.length + '\n';
        if (meta.desc) txt += 'Description: ' + meta.desc + '\n';
        txt += '\n';
        txt += '══════════════════════════\n';
        txt += '  LISTE DES MEMBRES (' + members.length + ')\n';
        txt += '══════════════════════════\n\n';

        members.forEach((p, i) => {
          // Clean number: remove :XX device suffix and @domain
          const num = p.id.split('@')[0].replace(/:\d+$/, '');
          const role = p.admin === 'admin' ? ' [Admin]' : p.admin === 'superadmin' ? ' [Super-Admin]' : '';
          const name = p.notify || p.verifiedName || '';
          txt += (i + 1) + '. +' + num + (name ? ' — ' + name : '') + role + '\n';
        });

        txt += '\n══════════════════════════\n';
        txt += 'Delta Gold - ' + new Date().toLocaleString('fr-FR') + '\n';
        txt += '══════════════════════════\n';

        const safeName = (meta.subject || 'groupe').replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'groupe';
        await sock.sendMessage(from, {
          document: Buffer.from(txt, 'utf-8'),
          mimetype: 'text/plain',
          fileName: safeName + '_membres.txt',
        }, { quoted: msg });

        return reply(sock, msg, from, 'Fichier envoye ! ' + members.length + ' membres dans *' + meta.subject + '*');
      } catch (err) {
        console.error('Infos error:', err.message);
        return reply(sock, msg, from, 'Impossible de recuperer les infos du groupe.');
      }
    }

    case 'livedis': {
      const subCmd = (args[0] || '').toLowerCase();
      const recStore = deps?.recordingStore;
      // Only owner can start/stop recording
      if (!isOwner) {
        return reply(sock, msg, from, '❌ Seul le propriétaire du bot peut utiliser .livedis');
      }
      if (!recStore) return reply(sock, msg, from, 'Systeme d\'enregistrement non disponible.');

      if (subCmd === 'on') {
        if (recStore.has(from)) {
          return reply(sock, msg, from, 'L\'enregistrement est deja actif !\n\nUtilisez *.livedis off* pour arreter.');
        }
        recStore.set(from, []);
        return reply(sock, msg, from,
          'ENREGISTREMENT DEMARRE\n\n' +
          'Tous les messages de ce groupe sont maintenant enregistres.\n' +
          'Demarre le ' + new Date().toLocaleString('fr-FR') + '\n\n' +
          'Envoyez *.livedis off* pour arreter et recevoir le fichier.');
      }

      if (subCmd === 'off') {
        if (!recStore.has(from)) {
          return reply(sock, msg, from, 'Aucun enregistrement actif.\n\nUtilisez *.livedis on* pour demarrer.');
        }

        const recorded = recStore.get(from);
        recStore.delete(from);

        if (recorded.length === 0) {
          return reply(sock, msg, from, 'Aucun message enregistre.');
        }

        let txt = '';
        txt += '══════════════════════════\n';
        txt += '  DISCUSSION DU GROUPE\n';
        txt += '══════════════════════════\n\n';
        txt += 'Groupe: ' + from + '\n';
        txt += 'Messages: ' + recorded.length + '\n';
        txt += 'Enregistre le ' + new Date().toLocaleString('fr-FR') + '\n\n';
        txt += '══════════════════════════\n\n';

        recorded.forEach((m) => {
          const time = new Date(m.time).toLocaleString('fr-FR');
          txt += '[' + time + '] ' + m.pushName + ' (+' + m.sender + '):\n' + m.text + '\n\n';
        });

        txt += '══════════════════════════\n';
        txt += 'Delta Gold - Enregistrement termine\n';
        txt += '══════════════════════════\n';

        try {
          const meta2 = await sock.groupMetadata(from).catch(() => null);
          const groupName = (meta2?.subject || 'groupe').replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'groupe';
          await sock.sendMessage(from, {
            document: Buffer.from(txt, 'utf-8'),
            mimetype: 'text/plain',
            fileName: 'discussion_' + groupName + '_' + Date.now() + '.txt',
          }, { quoted: msg });

          return reply(sock, msg, from,
            'ENREGISTREMENT TERMINE\n\n' +
            recorded.length + ' messages enregistres\n' +
            'Fichier .txt envoye ci-dessus\n' +
            'Sauvegardez-le sur votre iPhone');
        } catch (err) {
          console.error('Livedis off error:', err.message);
          return reply(sock, msg, from, 'Erreur lors de l\'envoi du fichier.');
        }
      }

      return reply(sock, msg, from,
        'LIVEDIS - Enregistrement de discussion\n\n' +
        'Usage:\n' +
        '*.livedis on* - Demarrer l\'enregistrement\n' +
        '*.livedis off* - Arreter et recevoir le .txt\n\n' +
        'Tous les messages du groupe seront sauvegardes.');
    }

    default: {
      const cat = categories.find(c => c.id === 'groupe');
      return sendFormatted(sock, msg, from, cat, command);
    }
  }
}

// ══════════════════════════════════════════════════════════
// OWNER (42 commands)
// ══════════════════════════════════════════════════════════

async function cmdOwner(sock, msg, from, command, args, isOwner, effectiveOwner) {
  const OWNER_DISPLAY = effectiveOwner || OWNER;
  const restricted = ['ban','deban','block','deblock','restart','delete','clear','setvar','getvar','delvar','setsudo','delsudo','anticall','antidelete','chatbot','onlyadmins'];
  if (restricted.includes(command) && !isOwner) {
    return reply(sock, msg, from, '❌ Réservé au propriétaire.');
  }

  switch (command) {
    case 'ban':
      return reply(sock, msg, from, '✅ Utilisateur banni.');
    case 'deban':
      return reply(sock, msg, from, '✅ Utilisateur débanni.');
    case 'block':
      return reply(sock, msg, from, '✅ Utilisateur bloqué.');
    case 'deblock':
      return reply(sock, msg, from, '✅ Utilisateur débloqué.');
    case 'restart':
      await reply(sock, msg, from, '🔄 Redémarrage...');
      process.exit(0);
      break;
    case 'connect':
    case 'connect_session':
      return reply(sock, msg, from,
`╭──⟪ 📱 CONNECTER ⟫──╮
├
├  Pour connecter un appareil :
├  Tapez .pair +votre_numéro
├
├  Ex: .pair +243XXXXXXXXX
├
╰──────────────────────╯`);
    case 'disconnect':
      return reply(sock, msg, from, '📴 Déconnexion demandée.');
    case 'setvar':
      return reply(sock, msg, from, '⚙️ Modifiez les variables dans .env sur Render, puis redéployez.');
    case 'getvar':
      return reply(sock, msg, from,
`📋 Variables actuelles:
• PREFIX: ${PREFIX}
• OWNER: ${OWNER_NAME}
• MISTRAL_API: ${process.env.MISTRAL_API_KEY ? '✅' : '❌'}
• CHANNEL_LINK configuré: ${CHANNEL ? '✅' : '❌'}`);
    case 'delvar':
      return reply(sock, msg, from, '⚠️ Supprimez la variable dans .env sur Render.');
    case 'jid':
      return reply(sock, msg, from, `📋 *JID:* \`${from}\``);
    case 'sudolist':
    case 'setsudo':
    case 'delsudo':
      return reply(sock, msg, from, `👑 *Sudo:* ${OWNER_NAME} (+${OWNER_DISPLAY})`);
    default: {
      const cat = categories.find(c => c.id === 'owner');
      return sendFormatted(sock, msg, from, cat, command);
    }
  }
}

// ══════════════════════════════════════════════════════════
// FUN (11 commands)
// ══════════════════════════════════════════════════════════

async function cmdFun(sock, msg, from, command, args, pushName, fullMsg) {
  const mentioned = getMentionedJid(fullMsg);

  switch (command) {
    case 'blague':
      await reply(sock, msg, from, '_⏳ ..._');
      const joke = await askAI('Raconte une blague courte et drôle en français.', 'Tu es un comédien. Une seule blague courte.');
      return reply(sock, msg, from, `😂 *Blague:*\n\n${joke}`);

    case 'citation':
      await reply(sock, msg, from, '_⏳ ..._');
      const quote = await askAI('Donne une citation inspirante avec son auteur.', 'Donne une citation inspirante.');
      return reply(sock, msg, from, `💭 *Citation:*\n\n${quote}`);

    case 'fancy': {
      const text = args.join(' ') || 'Delta Gold';
      const fancy = text.split('').map(c => {
        const code = c.charCodeAt(0);
        if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D400 + code - 65);
        if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D41A + code - 97);
        return c;
      }).join('');
      return reply(sock, msg, from, `✨ *Fancy:*\n\n${fancy}`);
    }

    case 'fliptext': {
      const text = args.join(' ') || 'Delta Gold';
      return reply(sock, msg, from, `🔄 *Flip:*\n\n${text.split('').reverse().join('')}`);
    }

    case 'ship': {
      if (mentioned.length < 2) return reply(sock, msg, from, `📝 Usage: ${PREFIX}ship @p1 @p2`);
      const pct = Math.floor(Math.random() * 101);
      const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
      const emoji = pct > 80 ? '💕' : pct > 50 ? '❤️' : pct > 30 ? '💔' : '😢';
      return reply(sock, msg, from,
`💘 *Love Calculator*

@${mentioned[0].split('@')[0]} + @${mentioned[1].split('@')[0]}

${emoji} ${bar} ${pct}%
${pct > 70 ? 'Couple parfait! 💑' : pct > 40 ? 'Ça peut marcher! 🤞' : 'Amis peut-être? 😅'}`);
    }

    case 'readmore': {
      const text = args.join(' ') || 'Delta Gold!';
      return reply(sock, msg, from, `${text}\n${'ᅟ'.repeat(200)}\n👉 Lu! 🎉`);
    }

    case 'rank':
    case 'toprank':
      return reply(sock, msg, from,
`🏆 *Classement ${pushName}*

🥇 Niveau: ${Math.floor(Math.random() * 100)}
⭐ XP: ${Math.floor(Math.random() * 10000)}
💬 Messages: ${Math.floor(Math.random() * 5000)}`);

    case 'profile':
      return reply(sock, msg, from,
`╭──⟪ 👤 PROFIL ⟫──╮
├ ߷ Nom: ${pushName}
├ ߷ Niveau: ${Math.floor(Math.random() * 100)}
├ ߷ XP: ${Math.floor(Math.random() * 10000)}
├ ߷ Rang: ${['Bronze','Argent','Or','Platine','Diamant'][Math.floor(Math.random() * 5)]}
╰──────────────────╯`);

    default: {
      const cat = categories.find(c => c.id === 'fun');
      return sendFormatted(sock, msg, from, cat, command);
    }
  }
}

// ══════════════════════════════════════════════════════════
// CONVERSION (18 commands)
// ══════════════════════════════════════════════════════════

async function cmdConversion(sock, msg, from, command, args, pushName) {
  switch (command) {
    case 'sticker':
      return reply(sock, msg, from, '🖼️ Envoyez une image avec *.sticker* en légende.\n\n⚠️ Conversion image→sticker en développement.');
    case 'ttp': {
      const text = args.join(' ') || 'Delta Gold';
      return reply(sock, msg, from, `🎨 *Text to Picture:* "${text}"\n\n⚠️ Génération d'image en développement.`);
    }
    case 'attp': {
      const text = args.join(' ') || 'Delta Gold';
      return reply(sock, msg, from, `🎨 *Animated TTP:* "${text}"\n\n⚠️ En développement.`);
    }
    case 'tts': {
      const text = args.join(' ') || 'Bonjour, je suis Delta Gold';
      return reply(sock, msg, from, `🔊 *TTS:* "${text}"\n\n⚠️ Synthèse vocale en développement.`);
    }
    case 'toaudio':
      return reply(sock, msg, from, '🎵 Envoyez une vidéo avec *.toaudio* en légende.');
    case 'toimage':
      return reply(sock, msg, from, '🖼️ Envoyez un sticker avec *.toimage* en légende.');
    case 'tovideo':
      return reply(sock, msg, from, '🎬 Envoyez un sticker animé avec *.tovideo* en légende.');
    case 'quotely': {
      const text = args.join(' ') || 'Delta Gold - par Mcamara';
      return reply(sock, msg, from, `💬 *Quotely:* "${text}"\n\n⚠️ Génération de citation en développement.`);
    }
    default: {
      const cat = categories.find(c => c.id === 'conversion');
      return sendFormatted(sock, msg, from, cat, command);
    }
  }
}

// ══════════════════════════════════════════════════════════
// RÉACTION (27 commands)
// ══════════════════════════════════════════════════════════

async function cmdReaction(sock, msg, from, command, args, pushName, fullMsg) {
  const mentioned = getMentionedJid(fullMsg);
  const target = mentioned[0] ? `@${mentioned[0].split('@')[0]}` : 'quelqu\'un';

  const map = {
    embrasser: `💋 ${pushName} embrasse ${target} 💕`,
    caliner: `🤗 ${pushName} câline ${target}`,
    gifler: `👋 ${pushName} gifle ${target} 😱`,
    danser: `💃 ${pushName} danse avec ${target} 🕺`,
    enlacer: `🫂 ${pushName} enlace ${target}`,
    mordre: `😈 ${pushName} mord ${target}`,
    saluer: `👋 ${pushName} salue ${target}`,
    sourire: `😊 ${pushName} sourit à ${target}`,
    pleurer: `😭 ${pushName} pleure avec ${target}`,
    pousser: `😤 ${pushName} pousse ${target}`,
    sauter: `🤸 ${pushName} saute avec ${target}`,
    heureux: `😄 ${pushName} est heureux avec ${target}`,
    highfive: `🖐️ ${pushName} high-five ${target}`,
    lancer: `🫳 ${pushName} lance ${target}`,
    lecher: `👅 ${pushName} lèche ${target} 😳`,
    tenir_main: `🤝 ${pushName} tient la main de ${target}`,
    tuer: `⚔️ ${pushName} élimine ${target} 💀`,
    clin_doeil: `😉 ${pushName} fait un clin d'œil à ${target}`,
    tapoter: `👋 ${pushName} tapote ${target}`,
    rougir: `😳 ${pushName} rougit face à ${target}`,
    assommer: `🔨 ${pushName} assomme ${target}`,
    awoo: `🐺 ${pushName} fait Awoo! 🐺`,
    coup_de_pied: `🦶 ${pushName} donne un coup de pied à ${target}`,
    croquer: `🍬 ${pushName} croque ${target}`,
    embeter: `😜 ${pushName} embête ${target}`,
    gener: `😳 ${pushName} est gêné devant ${target}`,
    sourire_fier: `😤😊 ${pushName} sourit fièrement à ${target}`,
  };

  if (map[command]) {
    const mentions = mentioned.length ? mentioned : undefined;
    return sock.sendMessage(from, { text: map[command], mentions });
  }

  const cat = categories.find(c => c.id === 'reaction');
  return sendFormatted(sock, msg, from, cat, command);
}

// ══════════════════════════════════════════════════════════
// SEARCH (10 commands)
// ══════════════════════════════════════════════════════════

async function cmdSearch(sock, msg, from, command, args, pushName) {
  if (!args.length && command !== 'stickersearch') {
    return reply(sock, msg, from, `📝 Usage: ${PREFIX}${command} <recherche>`);
  }
  const q = args.join(' ');

  switch (command) {
    case 'google':
      return reply(sock, msg, from, `🔍 *Google:* ${q}\n\n🔗 https://www.google.com/search?q=${encodeURIComponent(q)}`);

    case 'wiki':
      await reply(sock, msg, from, `_⏳ Wikipedia: ${q}_`);
      const wiki = await askAI(`Résume l'article Wikipedia sur: ${q}. En français, 3-5 phrases.`, 'Tu es Wikipedia. Résumé concis.');
      return reply(sock, msg, from, `📖 *Wikipedia:* ${q}\n\n${wiki}`);

    case 'meteo':
      await reply(sock, msg, from, `_⏳ Météo: ${q}_`);
      const meteo = await askAI(`Météo actuelle pour ${q}. Réponse brève.`, 'Service météo. Bref.');
      return reply(sock, msg, from, `🌤️ *Météo:* ${q}\n\n${meteo}`);

    case 'lyrics':
      return reply(sock, msg, from, `🎵 *Paroles:* ${q}\n\n🔗 https://genius.com/search?q=${encodeURIComponent(q)}`);

    case 'anime':
      return reply(sock, msg, from, `🎬 *Anime:* ${q}\n\n🔗 https://myanimelist.net/anime.php?q=${encodeURIComponent(q)}`);

    case 'github':
      return reply(sock, msg, from, `🐙 *GitHub:* ${q}\n\n🔗 https://github.com/search?q=${encodeURIComponent(q)}`);

    case 'imdb':
      return reply(sock, msg, from, `🎬 *IMDB:* ${q}\n\n🔗 https://www.imdb.com/find?q=${encodeURIComponent(q)}`);

    default: {
      const cat = categories.find(c => c.id === 'search');
      return sendFormatted(sock, msg, from, cat, command);
    }
  }
}

// ══════════════════════════════════════════════════════════
// TÉLÉCHARGEMENT (11 commands)
// ══════════════════════════════════════════════════════════

async function cmdDownload(sock, msg, from, command, args, pushName) {
  if (!args.length) {
    return reply(sock, msg, from, `📝 Usage: ${PREFIX}${command} <url ou recherche>`);
  }
  const q = args.join(' ');

  switch (command) {
    case 'song':
    case 'yta':
      return reply(sock, msg, from, `🎵 *Audio:* ${q}\n\n⚠️ Configurez une API YouTube dans .env pour activer.`);
    case 'video':
    case 'ytv':
      return reply(sock, msg, from, `🎬 *Vidéo:* ${q}\n\n⚠️ Configurez une API YouTube dans .env pour activer.`);
    case 'tiktok':
      return reply(sock, msg, from, `📱 *TikTok:* ${q}\n\n⚠️ Configurez une API TikTok dans .env.`);
    case 'tiktokaudio':
      return reply(sock, msg, from, `🎵 *TikTok Audio:* ${q}\n\n⚠️ En développement.`);
    case 'tiktokimage':
      return reply(sock, msg, from, `📸 *TikTok Image:* ${q}\n\n⚠️ En développement.`);
    case 'igdl':
      return reply(sock, msg, from, `📸 *Instagram:* ${q}\n\n⚠️ En développement.`);
    case 'fbdl':
      return reply(sock, msg, from, `📘 *Facebook:* ${q}\n\n⚠️ En développement.`);
    case 'twitterdl':
      return reply(sock, msg, from, `🐦 *Twitter:* ${q}\n\n⚠️ En développement.`);
    case 'app':
      return reply(sock, msg, from, `📲 *APK:* ${q}\n\n⚠️ En développement.`);
    default: {
      const cat = categories.find(c => c.id === 'telechargement');
      return sendFormatted(sock, msg, from, cat, command);
    }
  }
}

// ══════════════════════════════════════════════════════════
// ÉCONOMIE (11 commands)
// ══════════════════════════════════════════════════════════

async function cmdEconomie(sock, msg, from, command, args, pushName) {
  switch (command) {
    case 'myecon':
      return reply(sock, msg, from,
`╭──⟪ 💰 MON COMPTE ⟫──╮
├ ߷ Solde: 1000 💰
├ ߷ Banque: 0 💰
├ ߷ Niveau: Débutant
╰──────────────────╯\n\n💡 Système économique en développement.`);

    case 'bonus':
      return reply(sock, msg, from, `🎁 *Bonus quotidien:*\n\n+100 OVl Coins 💰\n\nRevenez demain!`);

    case 'depot':
      return reply(sock, msg, from, `🏦 *Dépôt:* En développement.\n\nUsage: ${PREFIX}depot <montant>`);

    case 'retrait':
      return reply(sock, msg, from, `🏦 *Retrait:* En développement.`);

    case 'transfer': {
      const target = getMentionedJid(msg);
      if (!target.length || !args.length) return reply(sock, msg, from, `📝 Usage: ${PREFIX}transfer @user <montant>`);
      return reply(sock, msg, from, `💸 *Transfert:* En développement.`);
    }

    case 'vol':
      return reply(sock, msg, from, `🦹 *Vol:* En développement.`);

    case 'slot':
      return reply(sock, msg, from, `🎰 *Slot Machine:* En développement.`);

    case 'pari':
      return reply(sock, msg, from, `🎲 *Pari:* En développement.`);

    default: {
      const cat = categories.find(c => c.id === 'economie');
      return sendFormatted(sock, msg, from, cat, command);
    }
  }
}

// ══════════════════════════════════════════════════════════
// GAMES (4 commands)
// ══════════════════════════════════════════════════════════

async function cmdGames(sock, msg, from, command, args, pushName) {
  switch (command) {
    case 'tictactoe':
      return reply(sock, msg, from,
`🎮 *Tic Tac Toe*

❌ | ⭕ | ❌
───┼───┼───
⭕ | ❌ | ⭕
───┼───┼───
❌ | ⭕ | ❌

⚠️ Jeu interactif en développement.`);

    case 'anime-quizz':
      return reply(sock, msg, from,
`🎯 *Anime Quiz*

❓ Quel est le nom du personnage principal de Naruto?

1️⃣ Sasuke
2️⃣ Naruto Uzumaki
3️⃣ Sakura
4️⃣ Kakashi

⚠️ Système de quiz en développement.`);

    case 'dmots':
      return reply(sock, msg, from, `📝 *Devinette de mots:* En développement.`);

    case 'wcg':
      return reply(sock, msg, from, `🏆 *World Challenge Game:* En développement.`);

    default: {
      const cat = categories.find(c => c.id === 'games');
      return sendFormatted(sock, msg, from, cat, command);
    }
  }
}

// ══════════════════════════════════════════════════════════
// SYSTÈME (5 commands)
// ══════════════════════════════════════════════════════════

async function cmdSysteme(sock, msg, from, command, args, isOwner) {
  if (!isOwner) return reply(sock, msg, from, '❌ Réservé au propriétaire.');

  switch (command) {
    case 'setvar':
      return reply(sock, msg, from, '⚙️ Éditez .env sur Render et redéployez.');
    case 'getvar':
      return reply(sock, msg, from,
`📋 Variables:
• PREFIX: ${PREFIX}
• OWNER: ${OWNER_NAME}
• MISTRAL: ${process.env.MISTRAL_API_KEY ? '✅' : '❌'}
• MODEL: ${process.env.MISTRAL_MODEL || 'mistral-small-latest'}`);
    case 'delvar':
      return reply(sock, msg, from, '⚠️ Supprimez dans .env sur Render.');
    case 'checkupdate':
      return reply(sock, msg, from, '🔄 *Delta Gold v1.0.0*\n✅ À jour!');
    case 'update':
      return reply(sock, msg, from, '🔄 Redéploiement via Render dashboard.');
    default: {
      const cat = categories.find(c => c.id === 'systeme');
      return sendFormatted(sock, msg, from, cat, command);
    }
  }
}
