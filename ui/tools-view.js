// Delta Gold - Quick Tools View
// Dashboard-native tools that work without WhatsApp
// © 2025 Mcamara

import { getMyPhone } from './session-client.js';

const TOOLS = [
  { id: 'status', icon: '📊', name: 'Statut Système', desc: 'RAM, uptime, connexion' },
  { id: 'ai', icon: '🤖', name: 'Assistant IA', desc: 'Discuter avec l\'IA' },
  { id: 'restart', icon: '🔄', name: 'Redémarrer', desc: 'Relancer le bot' },
  { id: 'password', icon: '🔑', name: 'Mot de Passe', desc: 'Générer un MDP' },
  { id: 'qr', icon: '📱', name: 'QR Code', desc: 'Créer un QR code' },
  { id: 'fancy', icon: '✨', name: 'Fancy Text', desc: 'Unicode décoratif' },
  { id: 'counter', icon: '📝', name: 'Compteur', desc: 'Mots & caractères' },
  { id: 'random', icon: '🎲', name: 'Aléatoire', desc: 'Nombre au hasard' },
];

let activeTool = null;
let aiMessages = [];

export function renderToolsView(container, root) {
  if (activeTool) {
    renderToolPanel(container, root, activeTool);
  } else {
    renderToolGrid(container, root);
  }
}

function renderToolGrid(container, root) {
  container.innerHTML = `
    <div class="tools-grid">
      ${TOOLS.map(tool => `
        <button class="tool-card" data-tool="${tool.id}" aria-label="${tool.name}">
          <span class="tool-card-icon">${tool.icon}</span>
          <span class="tool-card-name">${tool.name}</span>
          <span class="tool-card-desc">${tool.desc}</span>
        </button>
      `).join('')}
    </div>
  `;
  container.querySelectorAll('.tool-card').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTool = btn.dataset.tool;
      renderToolsView(container, root);
    });
  });
}

function renderToolPanel(container, root, toolId) {
  const tool = TOOLS.find(t => t.id === toolId);
  container.innerHTML = `
    <div class="tool-panel">
      <div class="tool-panel-header">
        <button class="tool-panel-back" aria-label="Retour" id="tool-back">← Retour</button>
        <div class="tool-panel-title-wrap">
          <span class="tool-panel-icon">${tool.icon}</span>
          <span class="tool-panel-title">${tool.name}</span>
        </div>
      </div>
      <div class="tool-panel-body" id="tool-body"></div>
    </div>
  `;
  container.querySelector('#tool-back').addEventListener('click', () => {
    activeTool = null;
    renderToolsView(container, root);
  });
  const body = container.querySelector('#tool-body');
  switch (toolId) {
    case 'status': renderStatusTool(body); break;
    case 'ai': renderAITool(body); break;
    case 'restart': renderRestartTool(body); break;
    case 'password': renderPasswordTool(body); break;
    case 'qr': renderQRTool(body); break;
    case 'fancy': renderFancyTool(body); break;
    case 'counter': renderCounterTool(body); break;
    case 'random': renderRandomTool(body); break;
  }
}

// ── Statut Système ──

function renderStatusTool(body) {
  body.innerHTML = '<div class="tool-loading"><div class="spinner-gold"></div><p>Chargement du statut...</p></div>';
  const phone = getMyPhone();
  fetch('/api/system-status' + (phone ? '?phone=' + encodeURIComponent(phone) : ''))
    .then(r => r.json())
    .then(data => {
      if (!data.success) throw new Error(data.error || 'Erreur');
      const s = data.status;
      const ramPct = Math.round((s.ram.used / s.ram.total) * 100);
      body.innerHTML = `
        <div class="tool-status-grid">
          <div class="tool-status-item">
            <span class="tsi-icon">${s.connection === 'connected' ? '🟢' : '🔴'}</span>
            <span class="tsi-label">Connexion</span>
            <span class="tsi-value">${s.connection === 'connected' ? 'Connecté' : 'Déconnecté'}</span>
          </div>
          <div class="tool-status-item">
            <span class="tsi-icon">💾</span>
            <span class="tsi-label">RAM</span>
            <span class="tsi-value">${formatBytes(s.ram.used)} / ${formatBytes(s.ram.total)}</span>
            <div class="tsi-bar"><div class="tsi-bar-fill" style="width:${ramPct}%"></div></div>
          </div>
          <div class="tool-status-item">
            <span class="tsi-icon">⏱️</span>
            <span class="tsi-label">Uptime</span>
            <span class="tsi-value">${formatUptime(s.uptime)}</span>
          </div>
          <div class="tool-status-item">
            <span class="tsi-icon">⚙️</span>
            <span class="tsi-label">Node.js</span>
            <span class="tsi-value">${s.nodeVersion}</span>
          </div>
          <div class="tool-status-item">
            <span class="tsi-icon">🖥️</span>
            <span class="tsi-label">Plateforme</span>
            <span class="tsi-value">${s.platform}</span>
          </div>
          <div class="tool-status-item">
            <span class="tsi-icon">🔒</span>
            <span class="tsi-label">Mode</span>
            <span class="tsi-value">${s.mode === 'private' ? 'Privé' : 'Public'}</span>
          </div>
          <div class="tool-status-item">
            <span class="tsi-icon">📋</span>
            <span class="tsi-label">Commandes</span>
            <span class="tsi-value">${s.commands}</span>
          </div>
          <div class="tool-status-item">
            <span class="tsi-icon">📦</span>
            <span class="tsi-label">Version</span>
            <span class="tsi-value">v${s.version}</span>
          </div>
        </div>
        <button class="tool-action-btn" id="status-refresh">🔄 Rafraîchir</button>
      `;
      body.querySelector('#status-refresh').addEventListener('click', () => renderStatusTool(body));
    })
    .catch(err => {
      body.innerHTML = `
        <div class="tool-error-state">
          <span class="tool-error-icon">❌</span>
          <p class="tool-error-text">Impossible de charger le statut</p>
          <p class="tool-error-detail">${escHtml(err.message)}</p>
          <button class="tool-action-btn" id="status-retry">Réessayer</button>
        </div>
      `;
      body.querySelector('#status-retry')?.addEventListener('click', () => renderStatusTool(body));
    });
}

// ── Assistant IA ──

function renderAITool(body) {
  body.innerHTML = `
    <div class="tool-ai">
      <div class="tool-ai-messages" id="ai-messages">
        ${aiMessages.length === 0 ? `
          <div class="tool-ai-empty">
            <span class="tool-ai-empty-icon">🤖</span>
            <p>Posez une question à l'IA</p>
            <p class="tool-ai-hint">Utilise le modèle Mistral configuré dans .env</p>
          </div>
        ` : aiMessages.map(m => `
          <div class="tool-ai-msg tool-ai-${m.role}">
            <div class="tool-ai-bubble">${escHtml(m.content)}</div>
          </div>
        `).join('')}
      </div>
      <div class="tool-ai-input-bar">
        <input type="text" class="tool-ai-input" id="ai-input" placeholder="Votre question..." autocomplete="off">
        <button class="tool-ai-send" id="ai-send" aria-label="Envoyer">➤</button>
      </div>
    </div>
  `;
  const input = body.querySelector('#ai-input');
  const sendBtn = body.querySelector('#ai-send');
  const messagesEl = body.querySelector('#ai-messages');
  function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    aiMessages.push({ role: 'user', content: text });
    input.value = '';
    updateAIMessages(messagesEl);
    const loadingEl = document.createElement('div');
    loadingEl.className = 'tool-ai-msg tool-ai-assistant';
    loadingEl.innerHTML = '<div class="tool-ai-bubble"><div class="tool-ai-typing"><span></span><span></span><span></span></div></div>';
    messagesEl.appendChild(loadingEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    fetch('/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    })
      .then(r => r.json())
      .then(data => {
        loadingEl.remove();
        const response = data.success ? data.response : ('Erreur: ' + (data.error || 'Serveur indisponible'));
        aiMessages.push({ role: 'assistant', content: response });
        updateAIMessages(messagesEl);
      })
      .catch(err => {
        loadingEl.remove();
        aiMessages.push({ role: 'assistant', content: 'Erreur: ' + err.message });
        updateAIMessages(messagesEl);
      });
  }
  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function updateAIMessages(container) {
  container.innerHTML = aiMessages.map(m => `
    <div class="tool-ai-msg tool-ai-${m.role}">
      <div class="tool-ai-bubble">${escHtml(m.content)}</div>
    </div>
  `).join('');
  container.scrollTop = container.scrollHeight;
}

// ── Redémarrer ──

function renderRestartTool(body) {
  body.innerHTML = `
    <div class="tool-restart">
      <div class="tool-restart-icon">🔄</div>
      <p class="tool-restart-text">Redémarrer le bot WhatsApp ?</p>
      <p class="tool-restart-hint">Le bot sera déconnecté brièvement pendant le redémarrage.</p>
      <button class="tool-action-btn tool-action-danger" id="restart-confirm">🔄 Redémarrer maintenant</button>
      <div id="restart-status"></div>
    </div>
  `;
  body.querySelector('#restart-confirm').addEventListener('click', async () => {
    const btn = body.querySelector('#restart-confirm');
    const status = body.querySelector('#restart-status');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner-gold"></div> Redémarrage...';
    try {
      const phone = getMyPhone();
      if (!phone) throw new Error('Aucun numéro pairé.');
      const res = await fetch('/api/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (data.success) {
        status.innerHTML = '<div class="tool-success-msg">✅ Bot redémarré avec succès</div>';
      } else { throw new Error(data.error || 'Erreur'); }
    } catch (err) {
      status.innerHTML = '<div class="tool-error-msg">❌ ' + escHtml(err.message) + '</div>';
      btn.disabled = false;
      btn.textContent = '🔄 Réessayer';
    }
  });
}

// ── Mot de Passe ──

function renderPasswordTool(body) {
  const state = { length: 16, upper: true, lower: true, digits: true, symbols: true };
  function render() {
    body.innerHTML = `
      <div class="tool-password">
        <div class="tool-pwd-display">
          <span class="tool-pwd-text" id="pwd-text">Cliquez sur Générer</span>
          <button class="tool-copy-btn" id="pwd-copy" aria-label="Copier">📋</button>
        </div>
        <div id="pwd-strength"></div>
        <div class="tool-pwd-options">
          <label class="tool-pwd-slider-wrap">
            <span>Longueur: <strong id="pwd-len-val">${state.length}</strong></span>
            <input type="range" min="6" max="64" value="${state.length}" id="pwd-length" class="tool-pwd-slider">
          </label>
          <div class="tool-pwd-checks">
            <label class="tool-check"><input type="checkbox" id="pwd-upper" ${state.upper ? 'checked' : ''}> Majuscules (A-Z)</label>
            <label class="tool-check"><input type="checkbox" id="pwd-lower" ${state.lower ? 'checked' : ''}> Minuscules (a-z)</label>
            <label class="tool-check"><input type="checkbox" id="pwd-digits" ${state.digits ? 'checked' : ''}> Chiffres (0-9)</label>
            <label class="tool-check"><input type="checkbox" id="pwd-symbols" ${state.symbols ? 'checked' : ''}> Symboles (!@#$)</label>
          </div>
        </div>
        <button class="tool-action-btn" id="pwd-generate">🔑 Générer</button>
      </div>
    `;
    const slider = body.querySelector('#pwd-length');
    slider.addEventListener('input', () => {
      state.length = parseInt(slider.value);
      body.querySelector('#pwd-len-val').textContent = state.length;
    });
    ['upper', 'lower', 'digits', 'symbols'].forEach(key => {
      body.querySelector('#pwd-' + key).addEventListener('change', (e) => { state[key] = e.target.checked; });
    });
    body.querySelector('#pwd-generate').addEventListener('click', () => {
      const pwd = generatePassword(state);
      body.querySelector('#pwd-text').textContent = pwd;
      updateStrength(body.querySelector('#pwd-strength'), pwd);
    });
    body.querySelector('#pwd-copy').addEventListener('click', () => {
      const text = body.querySelector('#pwd-text').textContent;
      if (text && text !== 'Cliquez sur Générer') { copyToClipboard(text); showToastMsg(body, 'Copié !'); }
    });
  }
  render();
}

function generatePassword(opts) {
  let chars = '';
  if (opts.upper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (opts.lower) chars += 'abcdefghijklmnopqrstuvwxyz';
  if (opts.digits) chars += '0123456789';
  if (opts.symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';
  const arr = new Uint32Array(opts.length);
  crypto.getRandomValues(arr);
  return Array.from(arr, v => chars[v % chars.length]).join('');
}

function updateStrength(el, pwd) {
  let score = 0;
  if (pwd.length >= 12) score++;
  if (pwd.length >= 20) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const levels = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'];
  const colors = ['#EF4444', '#F59E0B', '#F59E0B', '#00A884', '#00A884'];
  const idx = Math.min(Math.floor(score / 1.5), 4);
  el.innerHTML = `
    <div class="tool-strength-bar"><div class="tool-strength-fill" style="width:${(idx + 1) * 20}%; background:${colors[idx]}"></div></div>
    <span class="tool-strength-label" style="color:${colors[idx]}">${levels[idx]}</span>
  `;
}

// ── QR Code ──

function renderQRTool(body) {
  body.innerHTML = `
    <div class="tool-qr">
      <div class="tool-input-row">
        <input type="text" class="tool-input" id="qr-input" placeholder="Texte ou URL...">
        <button class="tool-action-btn" id="qr-generate">📱 Générer</button>
      </div>
      <div id="qr-result"></div>
    </div>
  `;
  const input = body.querySelector('#qr-input');
  const result = body.querySelector('#qr-result');
  function generate() {
    const text = input.value.trim();
    if (!text) return;
    const url = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(text);
    result.innerHTML = `
      <div class="tool-qr-image-wrap">
        <img src="${url}" alt="QR Code" class="tool-qr-image" loading="lazy">
      </div>
      <button class="tool-action-btn tool-action-sm" id="qr-download">⬇ Télécharger</button>
    `;
    body.querySelector('#qr-download').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = url; a.download = 'qr-code.png'; a.target = '_blank'; a.click();
    });
  }
  body.querySelector('#qr-generate').addEventListener('click', generate);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') generate(); });
}

// ── Fancy Text ──

function renderFancyTool(body) {
  const STYLES = {
    fraktur: { name: '𝔉𝔯𝔞𝔨𝔱𝔲𝔯', lower: '𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔫𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷', upper: '𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ' },
    bold: { name: '𝐁𝐨𝐥𝐝', lower: '𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳', upper: '𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙' },
    italic: { name: '𝐼𝑡𝑎𝑙𝑖𝑐', lower: '𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻', upper: '𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡' },
    circled: { name: 'ⓒⓘⓡⓒⓛⓔⓓ', lower: 'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ', upper: 'ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ' },
    smallcaps: { name: 'ꜱᴍᴀʟʟ ᴄᴀᴘꜱ', lower: 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ', upper: 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ' },
    double: { name: '𝔻𝕠𝕦𝕓𝕝𝕖', lower: '𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫', upper: '𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ' },
  };
  body.innerHTML = `
    <div class="tool-fancy">
      <textarea class="tool-textarea" id="fancy-input" placeholder="Tapez votre texte ici..." rows="3"></textarea>
      <div class="tool-fancy-styles" id="fancy-styles">
        ${Object.entries(STYLES).map(([key, style]) => '<button class="tool-fancy-btn" data-style="' + key + '">' + style.name + '</button>').join('')}
      </div>
      <div id="fancy-output"><p class="tool-fancy-placeholder">Sélectionnez un style ci-dessus</p></div>
    </div>
  `;
  const input = body.querySelector('#fancy-input');
  const output = body.querySelector('#fancy-output');
  body.querySelectorAll('.tool-fancy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = input.value.trim();
      if (!text) { output.innerHTML = '<p class="tool-fancy-placeholder">Tapez d\'abord un texte</p>'; return; }
      const style = STYLES[btn.dataset.style];
      const converted = convertToFancy(text, style);
      output.innerHTML = '<div class="tool-fancy-result"><p class="tool-fancy-text">' + escHtml(converted) + '</p><button class="tool-copy-btn" id="fancy-copy">📋 Copier</button></div>';
      output.querySelector('#fancy-copy').addEventListener('click', () => { copyToClipboard(converted); showToastMsg(body, 'Copié !'); });
    });
  });
}

function convertToFancy(text, style) {
  const aLower = 'abcdefghijklmnopqrstuvwxyz';
  const aUpper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const map = {};
  for (let i = 0; i < 26; i++) {
    map[aLower[i]] = style.lower[i];
    map[aUpper[i]] = style.upper[i];
  }
  return text.split('').map(ch => map[ch] || ch).join('');
}

// ── Compteur ──

function renderCounterTool(body) {
  body.innerHTML = `
    <div class="tool-counter">
      <textarea class="tool-textarea" id="counter-input" placeholder="Collez ou tapez votre texte ici..." rows="6"></textarea>
      <div class="tool-counter-stats" id="counter-stats">
        <div class="tool-counter-item"><span class="tci-value" id="tc-chars">0</span><span class="tci-label">Caractères</span></div>
        <div class="tool-counter-item"><span class="tci-value" id="tc-words">0</span><span class="tci-label">Mots</span></div>
        <div class="tool-counter-item"><span class="tci-value" id="tc-lines">0</span><span class="tci-label">Lignes</span></div>
        <div class="tool-counter-item"><span class="tci-value" id="tc-sentences">0</span><span class="tci-label">Phrases</span></div>
        <div class="tool-counter-item"><span class="tci-value" id="tc-readtime">0 min</span><span class="tci-label">Lecture</span></div>
      </div>
    </div>
  `;
  body.querySelector('#counter-input').addEventListener('input', (e) => {
    const text = e.target.value;
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text ? text.split('\n').length : 0;
    const sentences = text.trim() ? text.split(/[.!?]+/).filter(s => s.trim()).length : 0;
    const readTime = Math.max(1, Math.ceil(words / 200));
    body.querySelector('#tc-chars').textContent = chars;
    body.querySelector('#tc-words').textContent = words;
    body.querySelector('#tc-lines').textContent = lines;
    body.querySelector('#tc-sentences').textContent = sentences;
    body.querySelector('#tc-readtime').textContent = readTime + ' min';
  });
}

// ── Aléatoire ──

function renderRandomTool(body) {
  body.innerHTML = `
    <div class="tool-random">
      <div class="tool-random-section">
        <h4 class="tool-section-title">🎲 Nombre aléatoire</h4>
        <div class="tool-random-range">
          <input type="number" class="tool-input tool-input-sm" id="rand-min" value="1" min="0" placeholder="Min">
          <span class="tool-range-sep">à</span>
          <input type="number" class="tool-input tool-input-sm" id="rand-max" value="100" min="1" placeholder="Max">
          <button class="tool-action-btn tool-action-sm" id="rand-go">🎲</button>
        </div>
        <div id="rand-result"></div>
      </div>
      <div class="tool-random-section">
        <h4 class="tool-section-title">🪙 Pile ou Face</h4>
        <div class="tool-coin-flip">
          <button class="tool-action-btn" id="coin-flip">🪙 Lancer</button>
          <div id="coin-result"></div>
        </div>
      </div>
      <div class="tool-random-section">
        <h4 class="tool-section-title">🎯 Tirage au sort</h4>
        <textarea class="tool-textarea" id="pick-input" placeholder="Un élément par ligne..." rows="3"></textarea>
        <button class="tool-action-btn" id="pick-go">🎯 Tirer</button>
        <div id="pick-result"></div>
      </div>
    </div>
  `;
  body.querySelector('#rand-go').addEventListener('click', () => {
    const min = parseInt(body.querySelector('#rand-min').value) || 0;
    const max = parseInt(body.querySelector('#rand-max').value) || 100;
    if (min >= max) return;
    const result = Math.floor(Math.random() * (max - min + 1)) + min;
    body.querySelector('#rand-result').innerHTML = '<span class="tool-random-number">' + result + '</span>';
  });
  body.querySelector('#coin-flip').addEventListener('click', () => {
    const result = Math.random() < 0.5 ? 'Pile 🪙' : 'Face 🪙';
    body.querySelector('#coin-result').innerHTML = '<span class="tool-coin-text">' + result + '</span>';
  });
  body.querySelector('#pick-go').addEventListener('click', () => {
    const text = body.querySelector('#pick-input').value.trim();
    if (!text) return;
    const items = text.split('\n').map(s => s.trim()).filter(Boolean);
    if (!items.length) return;
    const picked = items[Math.floor(Math.random() * items.length)];
    body.querySelector('#pick-result').innerHTML = '<span class="tool-pick-text">🎯 ' + escHtml(picked) + '</span>';
  });
}

// ── Helpers ──

function formatUptime(seconds) {
  if (!seconds || seconds < 0) return '0s';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d > 0) parts.push(d + 'j');
  if (h > 0) parts.push(h + 'h');
  if (m > 0) parts.push(m + 'min');
  if (parts.length === 0) parts.push(s + 's');
  return parts.join(' ');
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else { fallbackCopy(text); }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
}

function showToastMsg(parent, msg) {
  const existing = parent.querySelector('.tool-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'tool-toast';
  toast.textContent = msg;
  toast.setAttribute('role', 'status');
  parent.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('tool-toast-visible'));
  setTimeout(() => {
    toast.classList.remove('tool-toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, 1500);
}

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
