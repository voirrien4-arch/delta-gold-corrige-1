// Delta Gold - Command List View
// Renders searchable command buttons grouped by category

import { getRandomImage } from '../images.js';
import { getMyPhone } from './session-client.js';

const t = (key) => window.miniappI18n?.t(key) ?? key;

export function renderCommandList(container, state, root) {
  const cats = getFilteredCategories(state);

  if (!cats.length) {
    container.innerHTML = `
      <div class="cmd-empty">
        <span class="cmd-empty-icon">🔍</span>
        <p class="cmd-empty-text">Aucune commande trouvée pour "${escHtml(state.searchQuery)}"</p>
        <p class="cmd-empty-hint">Essayez un autre terme</p>
      </div>
    `;
    return;
  }

  let totalVisible = 0;

  container.innerHTML = cats.map(cat => {
    const cmds = getFilteredCommands(cat, state.searchQuery);
    if (!cmds.length) return '';
    totalVisible += cmds.length;

    return `
      <div class="cmd-section" data-cat="${cat.id}">
        <div class="cmd-section-header">
          <span class="cmd-section-icon">${cat.icon}</span>
          <span class="cmd-section-name">${cat.name}</span>
          <span class="cmd-section-count">${cmds.length} cmd</span>
        </div>
        <div class="cmd-grid">
          ${cmds.map(cmd => `
            <button class="cmd-btn" data-cmd="${cmd}" data-cat-id="${cat.id}"
              aria-label="Exécuter .${cmd}" title=".${cmd}">
              <span class="cmd-btn-prefix">.</span>${cmd}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }).filter(Boolean).join('');

  // Bind command button clicks
  container.querySelectorAll('.cmd-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cmd = btn.dataset.cmd;
      executeCommand(cmd, state, root);
    });
  });
}

async function executeCommand(cmd, state, root) {
  // Visual feedback
  const btn = root.querySelector(`.cmd-btn[data-cmd="${cmd}"]`);
  if (btn) {
    btn.classList.add('cmd-btn-executing');
    btn.disabled = true;
  }

  try {
    const phone = getMyPhone();
    if (!phone) {
      showToast(root, '⚠️ Paire d\'abord ton numéro dans l\'onglet Pairing.', 'error');
      return;
    }
    const res = await fetch('/api/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: cmd, prefix: '.', phone }),
    });
    const data = await res.json();

    if (data.success) {
      showToast(root, `✅ .${cmd} envoyé`, 'success');
      showCommandImage(root, cmd);
    } else {
      showToast(root, `❌ ${data.error || 'Erreur'}`, 'error');
    }
  } catch {
    showToast(root, '❌ Serveur inaccessible', 'error');
  } finally {
    if (btn) {
      btn.classList.remove('cmd-btn-executing');
      btn.disabled = false;
    }
  }
}

function showToast(root, msg, type) {
  const existing = root.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  toast.setAttribute('role', 'alert');
  root.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('toast-visible'));
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function showCommandImage(root, cmd) {
  const existing = root.querySelector('.cmd-image-preview');
  if (existing) existing.remove();

  const wrapper = document.createElement('div');
  wrapper.className = 'cmd-image-preview';
  wrapper.innerHTML = `
    <img src="${getRandomImage()}" alt="Delta Gold" class="cmd-preview-img" loading="lazy">
    <span class="cmd-preview-label">.${cmd}</span>
  `;
  root.appendChild(wrapper);

  requestAnimationFrame(() => wrapper.classList.add('cmd-image-visible'));
  setTimeout(() => {
    wrapper.classList.remove('cmd-image-visible');
    setTimeout(() => wrapper.remove(), 400);
  }, 3000);
}

function getFilteredCategories(state) {
  const allCats = [
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

  if (state.activeCategory) {
    return allCats.filter(c => c.id === state.activeCategory);
  }

  if (state.searchQuery) {
    return allCats.map(cat => ({
      ...cat,
      commands: cat.commands.filter(cmd => cmd.includes(state.searchQuery.toLowerCase()))
    })).filter(cat => cat.commands.length > 0);
  }

  return allCats;
}

function getFilteredCommands(cat, query) {
  if (!query) return cat.commands;
  const q = query.toLowerCase();
  return cat.commands.filter(cmd => cmd.includes(q));
}

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
