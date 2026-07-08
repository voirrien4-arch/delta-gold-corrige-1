// Delta Gold - Main Dashboard UI
// Renders the full bot dashboard with tabs, command grid, chat

import { renderCommandList } from './commands-view.js';
import { renderChat } from './chat-view.js';
import { renderToolsView } from './tools-view.js';
import { getMyPhone, setMyPhone } from './session-client.js';

const t = (key) => window.miniappI18n?.t(key) ?? key;

const MODES = {
  private: { icon: '🔒', label: 'Privé', desc: 'Seulement vous' },
  public: { icon: '🌐', label: 'Public', desc: 'Accessible à tous' },
};

// Format uptime seconds into human-readable string
function formatUptime(seconds) {
  if (!seconds || seconds < 0) return '0s';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (d > 0) parts.push(d + 'j');
  if (h > 0) parts.push(h + 'h');
  if (m > 0) parts.push(m + 'min');
  if (parts.length === 0) parts.push(s + 's');
  return parts.join(' ');
}

// Format phone number for display
function formatPhone(phone) {
  if (!phone) return 'Inconnu';
  const clean = phone.replace(/[^\d]/g, '');
  if (clean.length >= 12) return '+' + clean.slice(0, 3) + ' ' + clean.slice(3, 6) + ' ' + clean.slice(6, 9) + ' ' + clean.slice(9);
  if (clean.length >= 9) return '+' + clean.slice(0, 3) + ' ' + clean.slice(3, 6) + ' ' + clean.slice(6);
  return '+' + clean;
}

export function initDashboard(root) {
  let state = {
    tab: 'pairing',
    mode: 'private',
    botStatus: null,
    searchQuery: '',
    activeCategory: null,
    chatMessages: [],
    pairingStep: 'idle', // idle | loading | success | error
    pairCode: null,
    pairError: null,
    myPhone: getMyPhone(),
  };

  if (state.myPhone) {
    state.pairingStep = 'success';
    loadMode(state);
  }

  render(root, state);

  // Poll bot status immédiatement puis toutes les 5s (seulement si un numéro est pairé)
  pollStatus(state, root);
  setInterval(() => pollStatus(state, root), 5000);
}

function render(root, state) {
  const isConn = state.botStatus?.connected;
  const isReg = state.botStatus?.registered;

  root.innerHTML = `
    <div class="dash">
      <!-- Header -->
      <header class="dash-header">
        <div class="header-top">
          <div class="header-brand">
            <div class="brand-icon">
              <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div>
              <h1 class="brand-title"><span class="text-gold">Delta</span> Gold</h1>
              <p class="brand-sub">340 commandes · 17 catégories</p>
            </div>
          </div>
          <button id="modeToggle" class="mode-toggle ${state.mode === 'public' ? 'mode-public' : ''}"
            aria-label="Changer le mode public/privé">
            <span class="mode-icon">${MODES[state.mode].icon}</span>
            <span class="mode-label">${MODES[state.mode].label}</span>
          </button>
        </div>
        <div id="botStatusBar" class="status-bar">
          <span id="statusDot" class="status-dot ${isConn ? 'status-ok' : isReg ? 'status-warn' : state.botStatus?.initializing ? 'status-checking' : 'status-checking'}"></span>
          <span id="statusText" class="status-text">
            ${isConn ? 'Connecté · +' + (state.botStatus.phone || '...') : state.botStatus?.initializing ? 'Démarrage...' : isReg ? 'Reconnexion...' : 'En attente de pairing'}
          </span>
        </div>
      </header>

      <!-- Tab bar -->
      <nav class="tab-bar" role="tablist">
        <button class="tab ${state.tab === 'pairing' ? 'active' : ''}" data-tab="pairing"
          role="tab" aria-selected="${state.tab === 'pairing'}">
          <span>📱</span> Connexion
        </button>
        <button class="tab ${state.tab === 'commands' ? 'active' : ''}" data-tab="commands"
          role="tab" aria-selected="${state.tab === 'commands'}">
          <span>⚡</span> Commandes
        </button>
        <button class="tab ${state.tab === 'chat' ? 'active' : ''}" data-tab="chat"
          role="tab" aria-selected="${state.tab === 'chat'}">
          <span>💬</span> Chat
        </button>
        <button class="tab ${state.tab === 'tools' ? 'active' : ''}" data-tab="tools"
          role="tab" aria-selected="${state.tab === 'tools'}">
          <span>🔧</span> Outils
        </button>
      </nav>

      <!-- Tab content -->
      <main class="tab-content">
        <div id="tab-pairing" class="tab-pane ${state.tab === 'pairing' ? 'active' : ''}">
          ${renderPairingTab(state)}
        </div>
        <div id="tab-commands" class="tab-pane ${state.tab === 'commands' ? 'active' : ''}">
          ${renderCommandsTab(state)}
        </div>
        <div id="tab-chat" class="tab-pane ${state.tab === 'chat' ? 'active' : ''}">
          <div id="chatContainer"></div>
        </div>
        <div id="tab-tools" class="tab-pane ${state.tab === 'tools' ? 'active' : ''}">
          <div id="toolsContainer"></div>
        </div>
      </main>
    </div>
  `;

  // Init sub-views
  if (state.tab === 'commands') {
    renderCommandList(document.getElementById('cmdListContainer'), state, root);
  }
  if (state.tab === 'chat') {
    renderChat(document.getElementById('chatContainer'), state, root);
  }
  if (state.tab === 'tools') {
    renderToolsView(document.getElementById('toolsContainer'), root);
  }

  bindEvents(root, state);
}

function renderPairingTab(state) {
  const bs = state.botStatus;
  const isInMiniapp = window.self !== window.top;
  const downloadSection = isInMiniapp ? renderDownloadSection() : '';
  const isConnected = bs?.connected;
  const isRegistered = bs?.registered;
  const isInitializing = bs?.initializing;
  const lastError = bs?.lastError;
  const pairingStep = state.pairingStep;

  // ── CONNECTED STATE: Show connection info ──
  if (isConnected) {
    return `
      <div class="pair-hero pair-hero-connected">
        <div class="pair-hero-glow"></div>
        <div class="pair-connected-badge">
          <div class="pair-connected-ring">
            <svg viewBox="0 0 24 24" fill="none" width="48" height="48" stroke="#00A884" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h2 class="pair-connected-title">Bot connecté</h2>
          <p class="pair-connected-phone">${formatPhone(bs.phone)}</p>
        </div>

        <div class="pair-info-grid">
          <div class="pair-info-card">
            <span class="pair-info-icon">⏱️</span>
            <span class="pair-info-value">${formatUptime(bs.uptime)}</span>
            <span class="pair-info-label">Uptime</span>
          </div>
          <div class="pair-info-card">
            <span class="pair-info-icon">⚡</span>
            <span class="pair-info-value">340</span>
            <span class="pair-info-label">Commandes</span>
          </div>
          <div class="pair-info-card">
            <span class="pair-info-icon">🔄</span>
            <span class="pair-info-value">${bs.restarts || 0}</span>
            <span class="pair-info-label">Redémarrages</span>
          </div>
          <div class="pair-info-card">
            <span class="pair-info-icon">🛡️</span>
            <span class="pair-info-value">Multi</span>
            <span class="pair-info-label">Appareils</span>
          </div>
        </div>

        <div class="pair-security-bar">
          <svg width="14" height="14" fill="none" stroke="#00A884" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
          <span>Session multi-appareils chiffrée de bout en bout</span>
        </div>

        <div class="pair-disconnect-section">
          <p class="pair-disconnect-hint">Pour connecter un autre numéro, déconnectez d'abord la session actuelle.</p>
          <button id="pairDisconnectBtn" class="pair-btn-outline pair-btn-danger">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            Déconnecter cette session
          </button>
        </div>
      </div>
      ${downloadSection}
    `;
  }

  // ── INITIALIZING STATE: Bot is starting up ──
  if (isInitializing) {
    return `
      <div class="pair-hero">
        <div class="pair-illustration">
          <div class="pair-phone-mockup">
            <div class="pair-phone-screen">
              <div class="pair-phone-header-bar"></div>
              <div class="pair-phone-wa-icon">
                <svg viewBox="0 0 24 24" fill="#8696A0" width="32" height="32">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div class="pair-phone-lines">
                <div class="pair-phone-line" style="width:60%"></div>
                <div class="pair-phone-line" style="width:45%"></div>
              </div>
            </div>
          </div>
          <div class="pair-pulse-ring"></div>
        </div>
        <h2 class="pair-main-title">Démarrage du bot...</h2>
        <p class="pair-main-desc">Le bot WhatsApp est en cours d'initialisation. Patientez quelques secondes.</p>
        <div class="pair-form-card" style="text-align:center; padding:24px;">
          <div class="pair-btn-spinner" style="margin:0 auto 12px; width:24px; height:24px; border-width:3px; border-color:rgba(218,165,32,0.2); border-top-color:#DAA520;"></div>
          <p style="color:#8696A0; font-size:13px; margin:0;">Connexion au serveur WhatsApp...</p>
        </div>
      </div>
      ${downloadSection}
    `;
  }

  // ── REGISTERED BUT NOT CONNECTED: Session exists but disconnected ──
  if (isRegistered && !isConnected) {
    return `
      <div class="pair-hero">
        <div class="pair-illustration">
          <div class="pair-phone-mockup">
            <div class="pair-phone-screen">
              <div class="pair-phone-header-bar"></div>
              <div class="pair-phone-wa-icon">
                <svg viewBox="0 0 24 24" fill="#F59E0B" width="32" height="32">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div class="pair-phone-lines">
                <div class="pair-phone-line" style="width:60%"></div>
                <div class="pair-phone-line" style="width:45%"></div>
              </div>
            </div>
          </div>
          <div class="pair-pulse-ring" style="border-color:rgba(245,158,11,0.3)"></div>
        </div>
        <h2 class="pair-main-title">Session existante</h2>
        <p class="pair-main-desc">Une session WhatsApp existe déjà. Le bot essaie de se reconnecter automatiquement.</p>

        ${lastError ? `
          <div class="pair-alert pair-alert-error" style="margin-bottom:16px; max-width:340px;">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>${lastError}</span>
          </div>
        ` : ''}

        <div class="pair-form-card" style="text-align:center;">
          <p style="color:#8696A0; font-size:13px; margin:0 0 16px;">
            ${bs?.restarts > 0 ? `Tentatives de reconnexion: ${bs.restarts}` : 'En attente de reconnexion...'}
          </p>
          <div style="display:flex; flex-direction:column; gap:10px;">
            <button id="pairResetBtn" class="pair-main-btn" style="background:linear-gradient(135deg,#B8860B,#DAA520);">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              <span>Supprimer et générer un nouveau code</span>
            </button>
            <p style="color:rgba(134,150,160,0.6); font-size:11px; margin:0;">
              ⚠️ Cela supprimera l'ancienne session et vous devrez re-pairer le numéro
            </p>
          </div>
        </div>
      </div>
      ${downloadSection}
    `;
  }

  // ── DISCONNECTED STATE: Show pairing form ──
  const showCode = pairingStep === 'success' && state.pairCode;
  const showError = pairingStep === 'error' && state.pairError;
  const isLoading = pairingStep === 'loading';

  return `
    <div class="pair-hero">
      <!-- Connection illustration -->
      <div class="pair-illustration">
        <div class="pair-phone-mockup">
          <div class="pair-phone-screen">
            <div class="pair-phone-header-bar"></div>
            <div class="pair-phone-wa-icon">
              <svg viewBox="0 0 24 24" fill="#00A884" width="32" height="32">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div class="pair-phone-lines">
              <div class="pair-phone-line" style="width:60%"></div>
              <div class="pair-phone-line" style="width:45%"></div>
            </div>
          </div>
        </div>
        <div class="pair-pulse-ring"></div>
        <div class="pair-pulse-ring pair-pulse-ring-2"></div>
      </div>

      <h2 class="pair-main-title">Connecter votre WhatsApp</h2>
      <p class="pair-main-desc">Lie un appareil au bot Delta Gold pour activer les 340 commandes</p>

      <!-- Steps indicator -->
      <div class="pair-steps-bar">
        <div class="pair-step-item ${isRegistered || showCode ? 'pair-step-done' : (isLoading ? 'pair-step-active' : '')}">
          <div class="pair-step-num">1</div>
          <span>Numéro</span>
        </div>
        <div class="pair-step-line ${isRegistered || showCode ? 'pair-step-line-done' : ''}"></div>
        <div class="pair-step-item ${showCode ? 'pair-step-done' : (isLoading ? 'pair-step-active' : '')}">
          <div class="pair-step-num">2</div>
          <span>Code</span>
        </div>
        <div class="pair-step-line ${showCode ? 'pair-step-line-done' : ''}"></div>
        <div class="pair-step-item ${isConnected ? 'pair-step-done' : ''}">
          <div class="pair-step-num">3</div>
          <span>Connecté</span>
        </div>
      </div>

      <!-- Phone input form -->
      <div class="pair-form-card">
        <div class="pair-form-header">
          <svg width="20" height="20" fill="none" stroke="#DAA520" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
          </svg>
          <span>Entrez le numéro de téléphone à connecter</span>
        </div>

        <div class="pair-input-group">
          <div class="pair-country-select-wrap">
            <select id="pairCountry" class="pair-country-select" aria-label="Code pays">
              <option value="224">🇬🇳 +224</option>
              <option value="243">🇨🇩 +243</option>
              <option value="225">🇨🇮 +225</option>
              <option value="221">🇸🇳 +221</option>
              <option value="223">🇲🇱 +223</option>
              <option value="226">🇧🇫 +226</option>
              <option value="227">🇳🇪 +227</option>
              <option value="228">🇹🇬 +228</option>
              <option value="229">🇧🇯 +229</option>
              <option value="237">🇨🇲 +237</option>
              <option value="241">🇬🇦 +241</option>
              <option value="236">🇨🇫 +236</option>
              <option value="235">🇹🇩 +235</option>
              <option value="242">🇨🇬 +242</option>
              <option value="33">🇫🇷 +33</option>
              <option value="1">🇺🇸 +1</option>
              <option value="44">🇬🇧 +44</option>
            </select>
          </div>
          <input type="tel" id="dashPhone" class="pair-phone-input"
            placeholder="612 908 366" maxlength="14"
            aria-label="Numéro de téléphone sans indicatif"
            value="${!isConnected && isRegistered ? '' : ''}">
        </div>

        <button id="dashPairBtn" class="pair-main-btn ${isLoading ? 'pair-main-btn-loading' : ''}" ${isLoading ? 'disabled' : ''}>
          ${isLoading ? `
            <span class="pair-btn-spinner"></span>
            <span>Génération du code...</span>
          ` : `
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
            </svg>
            <span>Générer le code de pairing</span>
          `}
        </button>

        <!-- Error display -->
        ${showError ? `
          <div class="pair-alert pair-alert-error">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>${state.pairError}</span>
          </div>
        ` : ''}

        <!-- Code display -->
        ${showCode ? `
          <div class="pair-code-result" id="pairCodeResult">
            <div class="pair-code-header">
              <svg width="20" height="20" fill="none" stroke="#00A884" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
              <span>Code de pairing généré</span>
            </div>
            <div class="pair-code-display">
              <span class="pair-code-digits" id="pairCodeDigits">${state.pairCode}</span>
              <button id="pairCopyBtn" class="pair-copy-btn" aria-label="Copier le code" title="Copier">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
                </svg>
              </button>
            </div>
            <div class="pair-code-steps-list">
              <div class="pair-step-guide">
                <div class="pair-step-guide-num">1</div>
                <div>
                  <strong>Ouvrez WhatsApp</strong>
                  <span>sur le téléphone à connecter</span>
                </div>
              </div>
              <div class="pair-step-guide">
                <div class="pair-step-guide-num">2</div>
                <div>
                  <strong>Appareils reliés</strong>
                  <span>⋮ → Appareils reliés → Lier un appareil</span>
                </div>
              </div>
              <div class="pair-step-guide">
                <div class="pair-step-guide-num">3</div>
                <div>
                  <strong>Entrez le code</strong>
                  <span>Tapez le code à 8 chiffres ci-dessus</span>
                </div>
              </div>
            </div>
            <div class="pair-code-timer">
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>Le code expire dans ~2 minutes</span>
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Alternative method -->
      <div class="pair-alt-section">
        <div class="pair-alt-divider">
          <span>ou</span>
        </div>
        <div class="pair-alt-card">
          <div class="pair-alt-icon">💬</div>
          <div class="pair-alt-content">
            <strong>Via WhatsApp directement</strong>
            <p>Si le bot tourne déjà, envoyez <code>.pair +votre-numéro</code> dans le chat WhatsApp du bot pour obtenir le code instantanément.</p>
          </div>
        </div>
      </div>

      <!-- Security footer -->
      <div class="pair-security-bar">
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
        </svg>
        <span>Chiffrement de bout en bout · Multi-appareils · Session sécurisée</span>
      </div>
    </div>
    ${downloadSection}
  `;
}
function renderDownloadSection() {
  return `
    <div class="dl-source-section">
      <div class="dl-source-card">
        <div class="dl-source-header">
          <span class="dl-source-icon">📦</span>
          <div>
            <strong>Code source complet</strong>
            <p>Téléchargez les fichiers pour déployer sur Render</p>
          </div>
        </div>
        <button id="dlSourceBtn" class="dl-source-btn" aria-label="Télécharger le code source">
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          Télécharger .zip
        </button>
      </div>
      <span class="dl-source-note">Visible uniquement dans le miniapp — invisible après déploiement</span>
    </div>
  `;
}
async function handleDownloadSource() {
  const btn = document.getElementById('dlSourceBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> Préparation...';
  }
  try {
    if (!window.JSZip) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
        s.onload = resolve;
        s.onerror = () => reject(new Error('Impossible de charger JSZip'));
        document.head.appendChild(s);
      });
    }
    const zip = new window.JSZip();
    const files = [
      'README.md', 'package.json', '.env.example', 'render.yaml',
      'index.html', 'styles.css', 'main.js',
      'server.js', 'bot.js', 'ai.js', 'commands.js', 'images.js',
      'data/commands.js',
      'ui/dashboard.js', 'ui/chat-view.js', 'ui/commands-view.js',
      'ui/tools-view.js',
      'locales/en.json',
    ];
    let loaded = 0;
    for (const file of files) {
      try {
        const res = await fetch('./' + file);
        if (res.ok) { zip.file(file, await res.text()); loaded++; }
      } catch {}
    }
    if (loaded === 0) throw new Error('Aucun fichier récupéré');
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'delta-gold-bot-source.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (btn) {
      btn.innerHTML = '<svg width="16" height="16" fill="none" stroke="#00A884" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Téléchargé !';
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = '<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg> Télécharger .zip';
      }, 3000);
    }
  } catch (err) {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '❌ ' + (err.message || 'Erreur');
      setTimeout(() => {
        btn.innerHTML = '<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg> Télécharger .zip';
      }, 3000);
    }
  }
}

function renderCommandsTab(state) {
  return `
    <div class="cmd-search-bar">
      <svg class="cmd-search-icon" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" stroke-linecap="round"/>
      </svg>
      <input type="text" id="cmdSearch" class="cmd-search-input"
        placeholder="Rechercher parmi 340 commandes..."
        value="${state.searchQuery || ''}"
        aria-label="Rechercher une commande">
    </div>
    <div id="cmdCategoryGrid" class="cmd-cat-grid"></div>
    <div id="cmdListContainer" class="cmd-list-container"></div>
  `;
}

function bindEvents(root, state) {
  // Tab switching
  root.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      state.tab = btn.dataset.tab;
      state.activeCategory = null;
      state.searchQuery = '';
      render(root, state);
    });
  });

  // Mode toggle
  const modeBtn = root.querySelector('#modeToggle');
  if (modeBtn) {
    modeBtn.addEventListener('click', () => {
      state.mode = state.mode === 'private' ? 'public' : 'private';
      saveMode(state, state.mode);
      render(root, state);
    });
  }

  // Pairing form
  const pairBtn = root.querySelector('#dashPairBtn');
  const phoneInput = root.querySelector('#dashPhone');
  if (pairBtn && phoneInput) {
    pairBtn.addEventListener('click', () => handlePairing(state, root));
    phoneInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handlePairing(state, root);
    });
    // Auto-format phone input: strip non-digits
    phoneInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^\d\s]/g, '').trim();
    });
  }

  // Copy code button
  const copyBtn = root.querySelector('#pairCopyBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const code = root.querySelector('#pairCodeDigits')?.textContent;
      if (code) {
        navigator.clipboard.writeText(code).then(() => {
          copyBtn.innerHTML = `<svg width="16" height="16" fill="none" stroke="#00A884" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`;
          setTimeout(() => {
            copyBtn.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>`;
          }, 2000);
        });
      }
    });
  }

  // Disconnect button
  const disconnectBtn = root.querySelector('#pairDisconnectBtn');
  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', () => handleDisconnect(state, root));
  }

  // Reset session button (for registered-but-not-connected state)
  const resetBtn = root.querySelector('#pairResetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => handleResetSession(state, root));
  }

  // Download source button (miniapp only)
  const dlBtn = root.querySelector('#dlSourceBtn');
  if (dlBtn) {
    dlBtn.addEventListener('click', handleDownloadSource);
  }

  // Command search
  const searchInput = root.querySelector('#cmdSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      state.activeCategory = null;
      const listEl = document.getElementById('cmdListContainer');
      if (listEl) renderCommandList(listEl, state, root);
      const gridEl = document.getElementById('cmdCategoryGrid');
      if (gridEl) renderCategoryGrid(gridEl, state, root);
    });
  }

  // Category grid
  const gridEl = root.querySelector('#cmdCategoryGrid');
  if (gridEl) {
    renderCategoryGrid(gridEl, state, root);
  }
}

export function renderCategoryGrid(gridEl, state, root) {
  const cats = getCategories();
  const active = state.activeCategory;

  if (state.searchQuery) {
    gridEl.innerHTML = '';
    return;
  }

  gridEl.innerHTML = cats.map(cat => `
    <button class="cat-btn ${active === cat.id ? 'cat-active' : ''}" data-cat="${cat.id}"
      aria-label="${cat.name}">
      <span class="cat-icon">${cat.icon}</span>
      <span class="cat-name">${cat.name}</span>
      <span class="cat-count">${cat.commands.length}</span>
    </button>
  `).join('');

  gridEl.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const catId = btn.dataset.cat;
      state.activeCategory = state.activeCategory === catId ? null : catId;
      state.searchQuery = '';
      const searchInput = document.getElementById('cmdSearch');
      if (searchInput) searchInput.value = '';
      renderCategoryGrid(gridEl, state, root);
      const listEl = document.getElementById('cmdListContainer');
      if (listEl) renderCommandList(listEl, state, root);
    });
  });
}

async function handlePairing(state, root) {
  const country = root.querySelector('#pairCountry')?.value || '224';
  const phoneNum = root.querySelector('#dashPhone')?.value?.trim();

  if (!phoneNum) {
    state.pairingStep = 'error';
    state.pairError = 'Entrez le numéro de téléphone';
    render(root, state);
    return;
  }

  const digits = phoneNum.replace(/[\s\-\(\)]/g, '');
  if (digits.length < 6 || digits.length > 12 || !/^\d+$/.test(digits)) {
    state.pairingStep = 'error';
    state.pairError = 'Numéro invalide. Vérifiez et réessayez.';
    render(root, state);
    return;
  }

  const fullPhone = '+' + country + digits;

  state.pairingStep = 'loading';
  state.pairError = null;
  state.pairCode = null;
  render(root, state);

  try {
    const res = await fetch('/api/pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: fullPhone }),
    });
    const data = await res.json();

    if (res.ok && data.success && data.code) {
      state.pairingStep = 'success';
      state.pairCode = data.code;
      state.pairError = null;
      state.myPhone = data.phone || fullPhone.replace(/[^\d]/g, '');
      setMyPhone(state.myPhone);
    } else {
      state.pairingStep = 'error';
      state.pairError = data.error || 'Impossible de générer le code. Le bot est-il démarré ?';
    }
  } catch (err) {
    state.pairingStep = 'error';
    state.pairError = 'Serveur inaccessible. Vérifiez que le bot est en cours d\'exécution.';
  }

  render(root, state);
}

async function handleDisconnect(state, root) {
  if (!state.myPhone) return;
  if (!confirm('Déconnecter la session WhatsApp actuelle ? Vous devrez re-pairer le numéro.')) return;
  try {
    const res = await fetch('/api/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: state.myPhone }),
    });
    if (res.ok) {
      state.botStatus = null;
      state.pairingStep = 'idle';
      state.pairCode = null;
      render(root, state);
      setTimeout(() => pollStatus(state, root), 2000);
    }
  } catch {}
}

async function handleResetSession(state, root) {
  if (!state.myPhone) return;
  if (!confirm('Supprimer la session existante et générer un nouveau code de pairing ?')) return;
  try {
    state.pairingStep = 'loading';
    render(root, state);
    const res = await fetch('/api/reset-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: state.myPhone }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      state.botStatus = null;
      state.pairingStep = 'idle';
      state.pairCode = null;
      state.pairError = null;
      render(root, state);
      // Wait for bot to restart then poll
      setTimeout(() => pollStatus(state, root), 3000);
    } else {
      state.pairingStep = 'error';
      state.pairError = data.error || 'Impossible de réinitialiser la session';
      render(root, state);
    }
  } catch (err) {
    state.pairingStep = 'error';
    state.pairError = 'Erreur serveur. Réessayez.';
    render(root, state);
  }
}

async function pollStatus(state, root) {
  if (!state.myPhone) return;
  try {
    const res = await fetch('/api/status?phone=' + encodeURIComponent(state.myPhone));
    const data = await res.json();
    state.botStatus = data;

    // Update header status bar without full re-render
    const dot = root.querySelector('#statusDot');
    const text = root.querySelector('#statusText');
    if (dot && text) {
      if (data.connected) {
        dot.className = 'status-dot status-ok';
        text.textContent = `Connecté · +${data.phone || '...'}`;
      } else if (data.initializing) {
        dot.className = 'status-dot status-checking';
        text.textContent = 'Démarrage...';
      } else if (data.registered) {
        dot.className = 'status-dot status-warn';
        text.textContent = data.lastError ? 'Session expirée' : 'Reconnexion...';
      } else {
        dot.className = 'status-dot status-checking';
        text.textContent = 'En attente de pairing';
      }
      text.className = 'status-text';
    }

    // If on pairing tab and status changed, re-render the tab
    if (state.tab === 'pairing') {
      const pairPane = root.querySelector('#tab-pairing');
      if (pairPane) {
        pairPane.innerHTML = renderPairingTab(state);
        // Re-bind pairing events
        const pairBtn = root.querySelector('#dashPairBtn');
        const phoneInput = root.querySelector('#dashPhone');
        if (pairBtn && phoneInput) {
          pairBtn.addEventListener('click', () => handlePairing(state, root));
          phoneInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handlePairing(state, root);
          });
        }
        const disconnectBtn = root.querySelector('#pairDisconnectBtn');
        if (disconnectBtn) {
          disconnectBtn.addEventListener('click', () => handleDisconnect(state, root));
        }
        const resetBtn2 = root.querySelector('#pairResetBtn');
        if (resetBtn2) {
          resetBtn2.addEventListener('click', () => handleResetSession(state, root));
        }
        const copyBtn = root.querySelector('#pairCopyBtn');
        if (copyBtn) {
          copyBtn.addEventListener('click', () => {
            const code = root.querySelector('#pairCodeDigits')?.textContent;
            if (code) {
              navigator.clipboard.writeText(code).then(() => {
                copyBtn.innerHTML = `<svg width="16" height="16" fill="none" stroke="#00A884" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`;
                setTimeout(() => {
                  copyBtn.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>`;
                }, 2000);
              });
            }
          });
        }
        const dlBtn2 = root.querySelector('#dlSourceBtn');
        if (dlBtn2) {
          dlBtn2.addEventListener('click', handleDownloadSource);
        }
      }
    }
  } catch {
    const dot = root.querySelector('#statusDot');
    const text = root.querySelector('#statusText');
    if (dot && text) {
      dot.className = 'status-dot status-err';
      text.textContent = 'Serveur inaccessible';
      text.className = 'status-text';
    }
  }
}

async function saveMode(state, mode) {
  if (!state.myPhone) return;
  try {
    await fetch('/api/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, phone: state.myPhone }),
    });
  } catch {}
}

async function loadMode(state) {
  if (!state.myPhone) return;
  try {
    const res = await fetch('/api/mode?phone=' + encodeURIComponent(state.myPhone));
    const data = await res.json();
    if (data.mode) state.mode = data.mode;
  } catch {}
}

function getCategories() {
  return [
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
}
