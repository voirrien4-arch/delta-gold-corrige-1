// Delta Gold - Chat View
// WhatsApp-style chat interface for sending commands and viewing responses

import { getRandomImage } from '../images.js';
import { getMyPhone } from './session-client.js';

const t = (key) => window.miniappI18n?.t(key) ?? key;

let chatMessages = [];

export function renderChat(container, state, root) {
  container.innerHTML = `
    <div class="chat">
      <div id="chatMessages" class="chat-messages">
        ${chatMessages.length === 0 ? renderEmptyChat() : ''}
        ${chatMessages.map(m => renderChatBubble(m)).join('')}
      </div>
      <div class="chat-input-bar">
        <input type="text" id="chatInput" class="chat-input"
          placeholder="Tapez une commande (.menu, .ping, .blague...)"
          aria-label="Entrer une commande"
          autocomplete="off">
        <button id="chatSendBtn" class="chat-send-btn" aria-label="Envoyer">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  const input = container.querySelector('#chatInput');
  const sendBtn = container.querySelector('#chatSendBtn');

  if (input) {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendChatCommand(container, state, root);
    });
    input.focus();
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', () => sendChatCommand(container, state, root));
  }

  // Bind suggestion buttons
  container.querySelectorAll('.chat-suggest').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = container.querySelector('#chatInput');
      if (inp) {
        inp.value = btn.dataset.cmd;
        inp.focus();
      }
    });
  });

  scrollToBottom(container);
}

async function sendChatCommand(container, state, root) {
  const input = container.querySelector('#chatInput');
  const text = input?.value?.trim();
  if (!text) return;

  input.value = '';

  // Add user message
  const userMsg = {
    role: 'user',
    text: text,
    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  };
  chatMessages.push(userMsg);
  appendChatBubble(container, userMsg);
  scrollToBottom(container);

  // Show typing indicator
  const typingId = showTyping(container);

  try {
    const phone = getMyPhone();
    if (!phone) {
      removeTyping(container, typingId);
      chatMessages.push({ role: 'bot', text: '⚠️ Paire d\'abord ton numéro dans l\'onglet Pairing.', success: false, time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) });
      appendChatBubble(container, chatMessages[chatMessages.length - 1]);
      scrollToBottom(container);
      return;
    }
    const res = await fetch('/api/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: text, phone }),
    });
    const data = await res.json();

    removeTyping(container, typingId);

    const botMsg = {
      role: 'bot',
      imageUrl: getRandomImage(),
      text: data.success
        ? (data.response || `✅ .${text.replace(/^\./, '').split(' ')[0]} exécuté`)
        : (data.error || '❌ Erreur'),
      success: data.success,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };
    chatMessages.push(botMsg);
    appendChatBubble(container, botMsg);
    scrollToBottom(container);

  } catch {
    removeTyping(container, typingId);
    const errMsg = {
      role: 'bot',
      imageUrl: getRandomImage(),
      text: '❌ Serveur inaccessible. Vérifiez que le bot est démarré.',
      success: false,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };
    chatMessages.push(errMsg);
    appendChatBubble(container, errMsg);
    scrollToBottom(container);
  }
}

function renderEmptyChat() {
  return `
    <div class="chat-empty">
      <div class="chat-empty-icon">💬</div>
      <p class="chat-empty-title">Delta Gold Chat</p>
      <p class="chat-empty-desc">Tapez une commande pour commencer</p>
      <div class="chat-suggestions">
        <button class="chat-suggest" data-cmd=".menu">.menu</button>
        <button class="chat-suggest" data-cmd=".ping">.ping</button>
        <button class="chat-suggest" data-cmd=".blague">.blague</button>
        <button class="chat-suggest" data-cmd=".owner">.owner</button>
        <button class="chat-suggest" data-cmd=".gpt Salut">.gpt</button>
        <button class="chat-suggest" data-cmd=".description">.description</button>
      </div>
    </div>
  `;
}

function renderChatBubble(msg) {
  const isUser = msg.role === 'user';
  const botImage = !isUser && msg.imageUrl;
  return `
    <div class="chat-row ${isUser ? 'chat-row-user' : 'chat-row-bot'}">
      <div class="chat-bubble ${isUser ? 'bubble-user' : 'bubble-bot'}">
        ${botImage ? `<img src="${msg.imageUrl}" alt="Delta Gold" class="bubble-image" loading="lazy">` : ''}
        <div class="bubble-text">${formatMsgText(msg.text)}</div>
        <span class="bubble-time">${msg.time}</span>
      </div>
    </div>
  `;
}

function appendChatBubble(container, msg) {
  const messagesEl = container.querySelector('#chatMessages');
  if (!messagesEl) return;

  // Remove empty state if present
  const empty = messagesEl.querySelector('.chat-empty');
  if (empty) empty.remove();

  const div = document.createElement('div');
  div.innerHTML = renderChatBubble(msg);
  messagesEl.appendChild(div.firstElementChild);
}

function showTyping(container) {
  const messagesEl = container.querySelector('#chatMessages');
  if (!messagesEl) return null;

  const id = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.id = id;
  div.className = 'chat-row chat-row-bot';
  div.innerHTML = `
    <div class="chat-bubble bubble-bot bubble-typing">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>
  `;
  messagesEl.appendChild(div);
  scrollToBottom(container);
  return id;
}

function removeTyping(container, id) {
  if (!id) return;
  const el = container.querySelector(`#${id}`);
  if (el) el.remove();
}

function scrollToBottom(container) {
  const messagesEl = container.querySelector('#chatMessages');
  if (messagesEl) {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }
}

function formatMsgText(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

// Export for suggestion buttons
export function bindSuggestions(container) {
  container.querySelectorAll('.chat-suggest').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = container.querySelector('#chatInput');
      if (input) {
        input.value = btn.dataset.cmd;
        input.focus();
      }
    });
  });
}
