// Delta Gold - Baileys WhatsApp Connection (MULTI-SESSIONS)
// Chaque membre qui pair son numéro obtient SA PROPRE session Baileys,
// isolée des autres (son propre dossier d'authentification, son propre socket).
// Le membre qui pair un numéro devient automatiquement "owner" de CETTE session.

import * as Baileys from '@whiskeysockets/baileys';
const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = Baileys;
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { handleCommand } from './commands.js';
import { askAI } from './ai.js';

const logger = pino({ level: 'silent' });
const AUTH_ROOT = './auth_info';

// ── Numéro "super admin" optionnel (garde un accès owner sur TOUTES les sessions) ──
const SUPER_OWNER = (process.env.OWNER_NUMBER || '').replace(/[\s\-\(\)\+]/g, '') || null;

const LANG_MAP = {
  fr: { name: 'Français' }, an: { name: 'Anglais' }, pt: { name: 'Portugais' },
  al: { name: 'Allemand' }, ht: { name: 'Haïtien' }, br: { name: 'Brésilien' },
};

// ── sessions: Map<phone, SessionState> ──
const sessions = new Map();

function normalizePhone(phone) {
  return String(phone || '').replace(/[\s\-\(\)\+]/g, '');
}

function newSessionState(phone) {
  return {
    phone,
    sock: null,
    pendingPairing: null,
    isStarting: false,
    botMode: 'public', // chaque bot de membre est public par défaut (c'est SON bot)
    recordingStore: new Map(),
    translationStore: new Map(),
    status: {
      connected: false,
      phone: null,
      registered: false,
      initializing: true,
      lastError: null,
      restarts: 0,
      startTime: Date.now(),
    },
  };
}

function getOrCreateSession(phone) {
  const key = normalizePhone(phone);
  if (!key) throw new Error('Numéro invalide.');
  if (!sessions.has(key)) sessions.set(key, newSessionState(key));
  return sessions.get(key);
}

export function hasSession(phone) {
  return sessions.has(normalizePhone(phone));
}

export function listSessions() {
  return Array.from(sessions.values()).map(s => ({ ...s.status, phone: s.status.phone || s.phone }));
}

// ── Démarrer (ou redémarrer) la session d'un membre ──
export async function startSession(phone) {
  const s = getOrCreateSession(phone);
  if (s.isStarting) return s;
  s.isStarting = true;

  try {
    s.status.initializing = true;
    s.status.lastError = null;

    if (s.sock) {
      try {
        s.sock.ev.removeAllListeners('connection.update');
        s.sock.ev.removeAllListeners('creds.update');
        s.sock.ev.removeAllListeners('messages.upsert');
        s.sock.ev.removeAllListeners('group-participants.update');
        s.sock.end(undefined);
      } catch {}
      s.sock = null;
      await new Promise(r => setTimeout(r, 500));
    }

    const authDir = path.join(AUTH_ROOT, s.phone);
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      logger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      printQRInTerminal: false,
      browser: ['Delta Gold', 'Safari', '3.0'],
      __testPhone: s.phone, // ignoré par Baileys en prod, utilisé pour les tests/simulations
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
    });
    s.sock = sock;

    s.status.registered = sock.authState.creds.registered;
    s.status.initializing = false;
    console.log(`🔑 [${s.phone}] Session registered: ${s.status.registered}`);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        await handlePendingPairing(s);
      }

      if (connection === 'close') {
        s.status.connected = false;
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const errMsg = lastDisconnect?.error?.message || 'Connexion fermée';
        console.log(`🔌 [${s.phone}] Connexion fermée: ${errMsg} (code: ${statusCode})`);

        if (s.pendingPairing) {
          s.pendingPairing.reject(new Error('Socket déconnecté pendant le pairing. Réessayez.'));
          s.pendingPairing = null;
        }

        if (statusCode === DisconnectReason.loggedOut) {
          console.log(`❌ [${s.phone}] Session expirée. Suppression des credentials...`);
          try { fs.rmSync(authDir, { recursive: true, force: true }); } catch {}
          s.status.registered = false;
          s.status.lastError = 'Session expirée. Veuillez vous reconnecter.';
        } else {
          s.status.lastError = `Déconnecté: ${errMsg}`;
        }

        s.status.restarts++;
        const delay = statusCode === DisconnectReason.loggedOut ? 2000 : 5000;
        console.log(`🔄 [${s.phone}] Reconnexion dans ${delay / 1000}s... (tentative #${s.status.restarts})`);
        setTimeout(() => { s.isStarting = false; startSession(s.phone); }, delay);

      } else if (connection === 'open') {
        s.status.connected = true;
        s.status.registered = true;
        s.status.lastError = null;
        s.status.phone = sock.user?.id?.split(':')[0] || s.phone;
        console.log(`✅ [${s.phone}] Delta Gold connecté: +${s.status.phone}`);

        if (s.pendingPairing) {
          s.pendingPairing.reject(new Error('Le bot s\'est connecté automatiquement ! Aucun code nécessaire.'));
          s.pendingPairing = null;
        }
      }
    });

    // ── Traitement des messages (isolé par session) ──
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      const prefix = process.env.BOT_PREFIX || '.';

      for (const msg of messages) {
        if (!msg.message) continue;
        const msgFrom = msg.key.remoteJid;

        // ── Messages du propriétaire de CETTE session (fromMe): traduction en direct ──
        if (msg.key.fromMe) {
          const rawText = msg.message?.conversation
            || msg.message?.extendedTextMessage?.text
            || msg.message?.imageMessage?.caption
            || msg.message?.videoMessage?.caption
            || '';

          if (rawText && !rawText.startsWith(prefix) && s.translationStore.has(s.phone)) {
            const { langName } = s.translationStore.get(s.phone);
            try {
              const translated = await askAI(
                'Traduis ce texte en ' + langName + '. Réponds UNIQUEMENT avec la traduction, rien d\'autre.\n\nTexte: ' + rawText,
                'Tu es un traducteur professionnel. Tu réponds uniquement avec la traduction demandée, sans explication ni commentaire ni guillemets.'
              );
              if (translated && !translated.startsWith('⚠️')) {
                await sock.sendMessage(msgFrom, { edit: msg.key, text: translated });
              }
            } catch (err) {
              console.error(`[${s.phone}] Translation edit error:`, err.message);
            }
          }
          continue;
        }

        // Enregistrement de messages si actif pour ce groupe
        if (msgFrom?.endsWith('@g.us') && s.recordingStore.has(msgFrom)) {
          const text = msg.message?.conversation
            || msg.message?.extendedTextMessage?.text
            || msg.message?.imageMessage?.caption
            || msg.message?.videoMessage?.caption
            || '[média]';
          s.recordingStore.get(msgFrom).push({
            sender: (msg.key.participant || msg.key.remoteJid).split('@')[0].replace(/:\d+$/, ''),
            pushName: msg.pushName || 'Inconnu',
            text,
            time: new Date().toISOString(),
          });
        }

        try {
          await handleCommand(sock, msg, {
            requestPairingCode: (phoneToLink) => requestPairingCode(phoneToLink),
            recordingStore: s.recordingStore,
            botMode: s.botMode,
            setBotMode: (m) => { if (m === 'public' || m === 'private') s.botMode = m; },
            setTranslationMode: (key, lang) => {
              const entry = LANG_MAP[lang];
              if (!entry) return false;
              s.translationStore.set(key, { lang, langName: entry.name });
              return true;
            },
            clearTranslationMode: (key) => s.translationStore.delete(key),
            getTranslationMode: (key) => s.translationStore.get(key) || null,
            translationStore: s.translationStore,
            // ── Propriétaire de CETTE session = le membre qui l'a pairée ──
            ownerNumber: s.phone,
            superOwnerNumber: SUPER_OWNER,
          });
        } catch (err) {
          console.error(`[${s.phone}] Handler error:`, err.message);
        }
      }
    });

    // ── Bienvenue / au revoir (par session) ──
    sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
      const ownerJid = s.phone + '@s.whatsapp.net';
      const CHANNEL = process.env.CHANNEL_LINK || '';

      if (action === 'remove' && participants.includes(ownerJid)) {
        try {
          await sock.sendMessage(id, { text: 'Ce groupe était naze🫵😂' });
        } catch (err) {
          console.error(`[${s.phone}] Farewell message error:`, err.message);
        }
        return;
      }

      if (action === 'add') {
        for (const p of participants) {
          try {
            await sock.sendMessage(id, {
              text: `👋 Bienvenue @${p.split('@')[0]} !\n\nOn est content de t'avoir parmi nous 🎉${CHANNEL ? `\n\n📢 Rejoins aussi notre chaîne WhatsApp :\n${CHANNEL}` : ''}`,
              mentions: [p],
            });
          } catch (err) {
            console.error(`[${s.phone}] Welcome message error:`, err.message);
          }
        }
      }

      if (action === 'remove') {
        for (const p of participants) {
          try {
            await sock.sendMessage(id, {
              text: `👋 @${p.split('@')[0]} a quitté le groupe.${CHANNEL ? `\n\n📢 Retrouve-nous quand même sur notre chaîne WhatsApp :\n${CHANNEL}` : ''}`,
              mentions: [p],
            });
          } catch (err) {
            console.error(`[${s.phone}] Goodbye message error:`, err.message);
          }
        }
      }
    });

    s.isStarting = false;

    if (s.pendingPairing && !s.status.connected) {
      await handlePendingPairing(s);
    }

  } catch (err) {
    console.error(`[${s.phone}] Bot start error:`, err.message);
    s.status.initializing = false;
    s.status.lastError = 'Erreur de démarrage: ' + err.message;
    s.status.restarts++;
    s.isStarting = false;
    if (s.pendingPairing) {
      s.pendingPairing.reject(new Error('Erreur de démarrage: ' + err.message));
      s.pendingPairing = null;
    }
    setTimeout(() => startSession(s.phone), 5000);
  }

  return s;
}

// ── Traiter une demande de pairing en attente ──
async function handlePendingPairing(s) {
  if (!s.pendingPairing || !s.sock) return;
  const { resolve, reject } = s.pendingPairing;

  try {
    if (s.status.connected) {
      reject(new Error('Ce numéro est déjà connecté ! Aucun code nécessaire.'));
      s.pendingPairing = null;
      return;
    }

    // Petite marge de sécurité: demander le code trop vite après l'ouverture du
    // socket fait parfois échouer avec "Connection Closed" côté serveurs WhatsApp.
    await new Promise(r => setTimeout(r, 2500));
    if (!s.sock || s.sock.ended) return; // socket a changé/fermé entre-temps

    console.log(`📱 [${s.phone}] Génération du code de pairing...`);
    let code;
    try {
      code = await s.sock.requestPairingCode(s.phone);
    } catch (firstErr) {
      // Une seule nouvelle tentative automatique sur les erreurs transitoires connues.
      const transient = /connection closed|timed out|econnreset/i.test(firstErr.message || '');
      if (transient && s.sock && !s.sock.ended) {
        console.warn(`⚠️ [${s.phone}] Échec transitoire ("${firstErr.message}"), nouvelle tentative dans 2s...`);
        await new Promise(r => setTimeout(r, 2000));
        if (!s.sock || s.sock.ended) return;
        code = await s.sock.requestPairingCode(s.phone);
      } else {
        throw firstErr;
      }
    }

    console.log(`✅ [${s.phone}] Code de pairing généré: ${code}`);
    resolve(code);
    s.pendingPairing = null;
  } catch (err) {
    console.error(`❌ [${s.phone}] Erreur pairing:`, err.message);
    reject(new Error(`Impossible de générer le code: ${err.message}`));
    s.pendingPairing = null;
  }
}

// ── Demander un code de pairing pour un numéro (crée la session si besoin) ──
export async function requestPairingCode(phone) {
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone || cleanPhone.length < 8) {
    throw new Error('Numéro invalide.');
  }

  const s = getOrCreateSession(cleanPhone);

  return new Promise(async (resolve, reject) => {
    if (s.status.connected) {
      reject(new Error('Ce numéro est déjà connecté ! Aucun code de pairing nécessaire.'));
      return;
    }

    // Session existante mais déconnectée → on repart d'une session propre
    if (s.status.registered && !s.pendingPairing) {
      console.log(`🔄 [${cleanPhone}] Session existante détectée — nouveau pairing...`);
      try {
        if (s.sock) {
          s.sock.ev.removeAllListeners('connection.update');
          s.sock.ev.removeAllListeners('creds.update');
          s.sock.ev.removeAllListeners('messages.upsert');
          s.sock.ev.removeAllListeners('group-participants.update');
          s.sock.end(undefined);
        }
      } catch {}
      s.sock = null;

      const authDir = path.join(AUTH_ROOT, cleanPhone);
      if (fs.existsSync(authDir)) fs.rmSync(authDir, { recursive: true, force: true });

      s.status.registered = false;
      s.status.connected = false;
      s.status.phone = null;
      s.status.lastError = null;
      s.isStarting = false;
    }

    if (s.pendingPairing) {
      s.pendingPairing.reject(new Error('Annulé — nouvelle demande.'));
    }
    s.pendingPairing = { resolve, reject };

    if (!s.sock || s.isStarting === false && !s.status.connected && !s.sock) {
      // Pas de socket actif → on démarre la session (elle traitera le pendingPairing au moment du QR)
      startSession(cleanPhone);
    } else if (s.sock && !s.status.connected) {
      await handlePendingPairing(s);
    } else {
      startSession(cleanPhone);
    }

    setTimeout(() => {
      if (s.pendingPairing) {
        s.pendingPairing.reject(new Error('Délai d\'attente dépassé. Réessayez.'));
        s.pendingPairing = null;
      }
    }, 30000);
  });
}

// ── Supprimer la session d'un membre ──
export function deleteSession(phone) {
  const key = normalizePhone(phone);
  const s = sessions.get(key);
  if (!s) return false;

  try {
    if (s.pendingPairing) {
      s.pendingPairing.reject(new Error('Session supprimée.'));
      s.pendingPairing = null;
    }
    const authDir = path.join(AUTH_ROOT, key);
    if (fs.existsSync(authDir)) fs.rmSync(authDir, { recursive: true, force: true });

    s.status.registered = false;
    s.status.connected = false;
    s.status.phone = null;
    s.status.lastError = null;

    if (s.sock) {
      try {
        s.sock.ev.removeAllListeners('connection.update');
        s.sock.ev.removeAllListeners('creds.update');
        s.sock.ev.removeAllListeners('messages.upsert');
        s.sock.ev.removeAllListeners('group-participants.update');
        s.sock.end(undefined);
      } catch {}
      s.sock = null;
    }
    s.isStarting = false;
    console.log(`🗑️ [${key}] Session supprimée`);
    return true;
  } catch (err) {
    console.error(`[${key}] Erreur suppression session:`, err.message);
    return false;
  }
}

// ── Statut d'une session ──
export function getBotStatus(phone) {
  const key = normalizePhone(phone);
  const s = sessions.get(key);
  if (!s) {
    return {
      connected: false, phone: null, registered: false,
      initializing: false, lastError: null, restarts: 0, uptime: 0,
      exists: false,
    };
  }
  return {
    connected: s.status.connected,
    phone: s.status.phone,
    registered: s.status.registered,
    initializing: s.status.initializing,
    lastError: s.status.lastError,
    restarts: s.status.restarts,
    uptime: Math.floor((Date.now() - s.status.startTime) / 1000),
    exists: true,
  };
}

export function getBotMode(phone) {
  const s = sessions.get(normalizePhone(phone));
  return s ? s.botMode : 'public';
}

export function setBotMode(phone, mode) {
  const s = getOrCreateSession(phone);
  if (mode === 'public' || mode === 'private') s.botMode = mode;
}

// ── Envoyer une commande "test" depuis le dashboard web pour une session donnée ──
export async function sendMessage(phone, commandText) {
  const key = normalizePhone(phone);
  const s = sessions.get(key);
  if (!s || !s.sock) throw new Error('Ce bot n\'est pas encore connecté. Pairez-le d\'abord.');

  const ownerJid = key + '@s.whatsapp.net';
  const syntheticMsg = {
    key: { remoteJid: ownerJid, fromMe: false, id: 'WEB-' + Date.now(), participant: ownerJid },
    pushName: 'Web Dashboard',
    message: { conversation: commandText },
  };

  let capturedResponse = '';
  const originalSend = s.sock.sendMessage.bind(s.sock);
  s.sock.sendMessage = async (jid, content, options) => {
    // reply() envoie { image, caption } ou { video, caption } (caption à la racine),
    // ou { text } en repli si l'image échoue / texte trop long.
    if (typeof content?.caption === 'string') capturedResponse = content.caption;
    else if (typeof content?.text === 'string') capturedResponse = content.text;
    else if (content?.document) capturedResponse = 'Document envoyé: ' + (content.fileName || 'fichier');
    return originalSend(jid, content, options);
  };

  try {
    await handleCommand(s.sock, syntheticMsg, {
      requestPairingCode: (p) => requestPairingCode(p),
      recordingStore: s.recordingStore,
      botMode: s.botMode,
      setBotMode: (m) => { if (m === 'public' || m === 'private') s.botMode = m; },
      setTranslationMode: (k, l) => { const e = LANG_MAP[l]; if (!e) return false; s.translationStore.set(k, { lang: l, langName: e.name }); return true; },
      clearTranslationMode: (k) => s.translationStore.delete(k),
      getTranslationMode: (k) => s.translationStore.get(k) || null,
      translationStore: s.translationStore,
      ownerNumber: s.phone,
      superOwnerNumber: SUPER_OWNER,
    });
  } finally {
    s.sock.sendMessage = originalSend;
  }

  return capturedResponse || 'Commande exécutée (pas de réponse textuelle)';
}
