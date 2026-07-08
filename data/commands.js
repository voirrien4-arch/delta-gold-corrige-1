// Delta Gold Bot - Complete Commands Database
// © 2025 Mcamara

export const BOT_INFO = {
  name: 'Delta Gold',
  prefix: '.',
  owner: 'Mcamara',
  ownerPhone: '224612908366',
  version: '1.0.0',
  platform: 'Linux/Render',
  totalCommands: 340,
  channel: '',
};

export const categories = [
  {
    id: 'confidentialite', icon: '🔒', name: 'Confidentialité',
    commands: ['getprivacy','groupadd','lastseen','mypp','mystatus','online','presence','read','setbio']
  },
  {
    id: 'conversion', icon: '🔄', name: 'Conversion',
    commands: ['attp','circle','crop','emix','fusion','quotely','remini','round','sticker','stickertovideo','take','toaudio','toimage','tovideo','ttp','tts','url','write']
  },
  {
    id: 'fun', icon: '🎮', name: 'Fun',
    commands: ['blague','citation','couplepp','fake','fancy','fliptext','profile','rank','readmore','ship','toprank']
  },
  {
    id: 'fx_audio', icon: '🎵', name: 'FX Audio',
    commands: ['alien','bass','blown','buzz','cave','chipmunk','chorus','compressor','dark','deep','distortion','dizzy','earrape','echo','fast','fat','flanger','ghost','haunting','invert','lofi','mono','muted','nightcore','panorama','phaser','radio','reverb','reverse','robot','slow','smooth','space','squirrel','surround','telephone','tremolo','underwater','vibrato','vintage']
  },
  {
    id: 'groupe', icon: '👥', name: 'Groupe',
    commands: ['acceptall','antibot','antidemote','antilink','antigc','antipromote','antispam','antitag','ckick','close','demote','demotealert','gcreate','gdesc','getpp','ginfo','gname','goodbye','infos','join','kick','kickall','kickall2','leave','link','livedis','lock','open','poll','poll2','promote','promotealert','rejectall','removepp','revoke','tag','tagadmin','tagall','unlock','updatepp','vcf','warn','welcome']
  },
  {
    id: 'ia', icon: '🤖', name: 'IA',
    commands: ['blackbox','claude','copilot','dalle','gemini','gpt','llama']
  },
  {
    id: 'image_edits', icon: '🖼️', name: 'Image Édits',
    commands: ['affect','beautiful','blur','circle1','colorful','darkness','delete_image','facepalm','greyscale','hitler','invert1','jail','jokeoverhead','pixelate','rainbow','rip','sepia','shit','threshold','trash','trigger','wanted','wasted']
  },
  {
    id: 'logo', icon: '✨', name: 'Logo',
    commands: ['avengers','blackpink','blackpink2','blackpink3','boobs','captain_america','cloud','cloud2','cubic','deadpool','dragonball','dragonball2','effacer','football','football2','football3','futuris','galaxy','glass','gold1','gold2','gold3','gold4','gold5','graffiti1','graffiti2','graffiti3','green_effect','hacker','metal','naruto','neon1','neon2','neon3','onepiece','paint','plasma','rain','sand','sci_fi','logo_space','steel','summery','thor','thunder','typography','logo_underwater','logo_vintage','watercolor','wood']
  },
  {
    id: 'outils', icon: '🔧', name: 'Outils',
    commands: ['allmenu','capture','description','developpeur','gitclone','menu','obfuscate','owner','pair','ping','privé','public','qr','repo','support','system_status','tempinbox','tempmail','test','theme','tovv','translate','tsl','uptime','vv','vv2']
  },
  {
    id: 'economie', icon: '💰', name: 'OVl-Économie',
    commands: ['bonus','capacite','depot','don','myecon','pari','resetaccount','retrait','slot','transfer','vol']
  },
  {
    id: 'games', icon: '🎲', name: 'OVl-Games',
    commands: ['anime-quizz','dmots','tictactoe','wcg']
  },
  {
    id: 'owner', icon: '👑', name: 'Owner',
    commands: ['addstickcmd','anticall','antidelete','ban','bangroup','block','chatbot','clear','connect','connect_session','deban','debangroup','deblock','delete','delmention','delprivate_cmd','delpublic_cmd','delstickcmd','delsudo','disconnect','fetch_sc','getmention','getstickcmd','jid','lecture_msg','levelup','listprivate_cmd','listpublic_cmd','onlyadmins','pginstall','pglist','pgremove','react_msg','restart','setmention','setprivate_cmd','setpublic_cmd','setsudo','sudolist','tgs']
  },
  {
    id: 'reaction', icon: '💋', name: 'Réaction',
    commands: ['assommer','awoo','caliner','clin_doeil','coup_de_pied','croquer','danser','embeter','embrasser','enlacer','gener','gifler','heureux','highfive','lancer','lecher','mordre','pleurer','pousser','rougir','saluer','sauter','sourire','sourire_fier','tapoter','tenir_main','tuer']
  },
  {
    id: 'search', icon: '🔍', name: 'Search',
    commands: ['anime','github','google','imdb','img','lyrics','meteo','shazam','stickersearch','wiki']
  },
  {
    id: 'status', icon: '📱', name: 'Status',
    commands: ['dl_status','lecture_status','likestatus','save','sendme']
  },
  {
    id: 'systeme', icon: '⚙️', name: 'Système',
    commands: ['checkupdate','delvar','getvar','setvar','update']
  },
  {
    id: 'telechargement', icon: '📥', name: 'Téléchargement',
    commands: ['app','fbdl','igdl','song','tiktok','tiktokaudio','tiktokimage','twitterdl','video','yta','ytv']
  }
];

export function getNow() {
  return {
    date: new Date().toLocaleDateString('fr-FR'),
    time: new Date().toLocaleTimeString('fr-FR')
  };
}

export function generateCaption(cat, cmd) {
  const { date, time } = getNow();
  return `┠ ${cat.icon} ${cmd.toUpperCase()}
┠ ━━━━━━━━━━━━━━━━━━━━
┠ 📋 Catégorie: ${cat.name}
┠ 🩸 Commande: .${cmd}
┠ 🤖 Bot: Delta Gold v1.0.0
┠ 👤 Owner: Mcamara
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
┠ OWNER: Mcamara
┠ TOTAL: 340 COMMANDES`;
}

export function generateWelcomeCaption() {
  const { date, time } = getNow();
  return `╭──⟪ 🤖 DELTA GOLD BOT ⟫──╮
├ ߷ Préfixe      : .
├ ߷ Owner         : Mcamara
├ ߷ Commandes     : 340
├ ߷ Date          : ${date}
├ ߷ Heure         : ${time}
├ ߷ Plateforme    : Render
├ ߷ Langage       : JavaScript
├ ߷ Library       : Baileys
├ ߷ Version       : 1.0.0
╰──────────────────────╯`;
}

export function generateMenuCaption() {
  const lines = categories.map(c => `┠ ${c.icon} .menu ${c.id} → ${c.name} (${c.commands.length})`).join('\n');
  return `╭──⟪ 🤖 DELTA GOLD MENU ⟫──╮
├ ߷ 🩸 Préfixe: .
├ ߷ 📊 Total: 340 commandes
├ ߷ 📋 Catégories: ${categories.length}
╰──────────────────────╯

${lines}

┠ ━━━━━━━━━━━━━━━━━━━━
┠ BOT: Delta Gold v1.0.0
┠ OWNER: Mcamara
┠ © 2025 Tous droits réservés`;
}
