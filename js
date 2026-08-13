(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const shell = document.getElementById("gameShell") || canvas?.parentElement;
  if (!canvas || !shell) throw new Error('Missing <canvas id="game"> inside #gameShell.');

  const ctx = canvas.getContext("2d");
  const $ = id => document.getElementById(id);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const rand = (a, b) => a + Math.random() * (b - a);
  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  const ui = {
    start: $("startScreen"), startBtn: $("startBtn"), end: $("endScreen"),
    endTitle: $("endTitle"), endBody: $("endBody"), retryBtn: $("restartBtn"), wipeBtn: $("wipeBtn"),
    levelPanel: $("levelPanel"), hud: $("hud"), quest: $("questBox"), questTitle: $("questTitle"),
    questProgress: $("questProgress"), hpBar: $("hpBar"), mpBar: $("mpBar"), xpBar: $("xpBar"),
    hpText: $("hpText"), mpText: $("mpText"), xpText: $("xpText"), rank: $("rankText"),
    level: $("levelText"), weapon: $("weaponText"), combo: $("comboText"), bossWrap: $("bossWrap"),
    bossName: $("bossName"), bossBar: $("bossBar"), toast: $("systemToast"), toastTitle: $("toastTitle"),
    toastBody: $("toastBody")
  };

  const SAVE = "riftAscensionAdventureFinal";
  const WORLD_W = 5000;
  const GRAVITY = 1850;

  const CLASSES = {
    archer: { name: "Archer", icon: "➶", stat: "perception", bonus: "+1 PER", color: "#70f1a0", text: "Higher critical chance and better loot." },
    tank: { name: "Tank", icon: "⬢", stat: "vitality", bonus: "+1 VIT", color: "#70b8ff", text: "More health and damage reduction." },
    mage: { name: "Mage", icon: "✦", stat: "intelligence", bonus: "+1 INT", color: "#c88cff", text: "More mana and stronger Rift Wave." },
    fighter: { name: "Fighter", icon: "⚔", stat: "strength", bonus: "+1 STR", color: "#ff8a70", text: "Stronger light and heavy attacks." }
  };

  // ============================================================
  // MAIN CHARACTER IMAGE LINKS
  // ============================================================
  // Paste a DIRECT image URL into each `url` value.
  // Recommended: transparent PNG or WebP, full body, facing right.
  // Leave a URL blank to use the built-in Canvas character instead.
  //
  // Good direct URL:
  // https://example.com/archer.png
  //
  // Not a direct URL:
  // https://drive.google.com/file/d/.../view
  const CHARACTER_IMAGES = {
    archer: {
      url: "PASTE_ARCHER_DIRECT_IMAGE_URL_HERE",
      height: 122,
      offsetX: 0,
      offsetY: 0
    },

    tank: {
      url: "PASTE_TANK_DIRECT_IMAGE_URL_HERE",
      height: 126,
      offsetX: 0,
      offsetY: 0
    },

    mage: {
      url: "PASTE_MAGE_DIRECT_IMAGE_URL_HERE",
      height: 122,
      offsetX: 0,
      offsetY: 0
    },

    fighter: {
      url: "PASTE_FIGHTER_DIRECT_IMAGE_URL_HERE",
      height: 122,
      offsetX: 0,
      offsetY: 0
    }
  };

  const CHARACTER_TEXTURES = {};

  function hasCharacterImageUrl(url) {
    return (
      typeof url === "string" &&
      url.trim().length > 0 &&
      !url.includes("PASTE_")
    );
  }

  function loadCharacterImages() {
    Object.entries(CHARACTER_IMAGES).forEach(([classId, settings]) => {
      if (!hasCharacterImageUrl(settings.url)) {
        CHARACTER_TEXTURES[classId] = {
          image: null,
          ready: false,
          failed: false
        };
        return;
      }

      const image = new Image();
      image.decoding = "async";

      CHARACTER_TEXTURES[classId] = {
        image,
        ready: false,
        failed: false
      };

      image.addEventListener("load", () => {
        CHARACTER_TEXTURES[classId].ready = true;
      });

      image.addEventListener("error", () => {
        CHARACTER_TEXTURES[classId].failed = true;
        console.warn(
          `Could not load the ${classId} image. Check that the URL points directly to a PNG, WebP, JPG, or GIF file:`,
          settings.url
        );
      });

      image.src = settings.url.trim();
    });
  }

  loadCharacterImages();

  // ============================================================
  // DROPBOX MUSIC AND SOUND-EFFECT LINKS
  // ============================================================
  // You can paste the links through the in-game "Sound Links" panel.
  // The game converts ordinary Dropbox share links to raw browser links.

  const AUDIO_SAVE = "riftAscensionAudioLinksV1";

  const DEFAULT_AUDIO_LINKS = {
    music: {
      menu: "https://www.dropbox.com/scl/fi/158uffjqdvn5bpvqonk3x/Rift-Ascension.mp3?rlkey=xok258cfaac0dog25u0x9x8ei&st=jw8dl2x9&raw=1",
      levels: ["https://www.dropbox.com/scl/fi/158uffjqdvn5bpvqonk3x/Rift-Ascension.mp3?rlkey=xok258cfaac0dog25u0x9x8ei&st=jw8dl2x9&raw=1", "https://www.dropbox.com/scl/fi/158uffjqdvn5bpvqonk3x/Rift-Ascension.mp3?rlkey=xok258cfaac0dog25u0x9x8ei&st=jw8dl2x9&raw=1", "https://www.dropbox.com/scl/fi/158uffjqdvn5bpvqonk3x/Rift-Ascension.mp3?rlkey=xok258cfaac0dog25u0x9x8ei&st=jw8dl2x9&raw=1", "https://www.dropbox.com/scl/fi/158uffjqdvn5bpvqonk3x/Rift-Ascension.mp3?rlkey=xok258cfaac0dog25u0x9x8ei&st=jw8dl2x9&raw=1", "https://www.dropbox.com/scl/fi/158uffjqdvn5bpvqonk3x/Rift-Ascension.mp3?rlkey=xok258cfaac0dog25u0x9x8ei&st=jw8dl2x9&raw=1"],
      boss: ""
    },

    sfx: {
      levelUp: "",
      enemyKill: "",
      bossKill: "",
      magicBall: "",
      swordSwing: "",
      heroDeath: ""
    },

    musicVolume: 0.35,
    sfxVolume: 0.7,
    muted: false
  };

  function cloneDefaultAudioLinks() {
    return {
      music: {
        menu: "",
        levels: ["", "", "", "", ""],
        boss: ""
      },
      sfx: {
        levelUp: "",
        enemyKill: "",
        bossKill: "",
        magicBall: "",
        swordSwing: "",
        heroDeath: ""
      },
      musicVolume: DEFAULT_AUDIO_LINKS.musicVolume,
      sfxVolume: DEFAULT_AUDIO_LINKS.sfxVolume,
      muted: false
    };
  }

  function normalizeDropboxAudioLink(value) {
    const text = String(value || "").trim();

    if (!text || text.includes("PASTE_")) {
      return "";
    }

    try {
      const url = new URL(text);
      const host = url.hostname.toLowerCase();

      if (
        host === "dropbox.com" ||
        host.endsWith(".dropbox.com")
      ) {
        url.searchParams.delete("dl");
        url.searchParams.set("raw", "1");
      }

      return url.toString();
    } catch {
      return text;
    }
  }

  function cleanAudioLinks(data) {
    const clean = cloneDefaultAudioLinks();

    if (!data || typeof data !== "object") {
      return clean;
    }

    clean.music.menu = String(data.music?.menu || "");
    clean.music.boss = String(data.music?.boss || "");

    for (let index = 0; index < 5; index += 1) {
      clean.music.levels[index] = String(
        data.music?.levels?.[index] || ""
      );
    }

    Object.keys(clean.sfx).forEach(name => {
      clean.sfx[name] = String(data.sfx?.[name] || "");
    });

    clean.musicVolume = clamp(
      Number(data.musicVolume ?? clean.musicVolume),
      0,
      1
    );

    clean.sfxVolume = clamp(
      Number(data.sfxVolume ?? clean.sfxVolume),
      0,
      1
    );

    clean.muted = Boolean(data.muted);

    return clean;
  }

  function loadAudioLinks() {
    try {
      return cleanAudioLinks(
        JSON.parse(localStorage.getItem(AUDIO_SAVE))
      );
    } catch {
      return cloneDefaultAudioLinks();
    }
  }

  let AUDIO_LINKS = loadAudioLinks();

  const audioEngine = {
    unlocked: false,
    currentMusicKey: "",
    music: new Audio(),
    sfxTemplates: {}
  };

  audioEngine.music.loop = true;
  audioEngine.music.preload = "auto";

  function saveAudioLinks() {
    localStorage.setItem(
      AUDIO_SAVE,
      JSON.stringify(AUDIO_LINKS)
    );
  }

  function applyAudioVolumes() {
    audioEngine.music.volume = AUDIO_LINKS.muted
      ? 0
      : AUDIO_LINKS.musicVolume;
  }

  function rebuildSoundEffects() {
    audioEngine.sfxTemplates = {};

    Object.entries(AUDIO_LINKS.sfx).forEach(([name, link]) => {
      const source = normalizeDropboxAudioLink(link);

      if (!source) {
        return;
      }

      const audio = new Audio(source);
      audio.preload = "auto";
      audio.volume = AUDIO_LINKS.muted ? 0 : AUDIO_LINKS.sfxVolume;

      audioEngine.sfxTemplates[name] = audio;
    });

    applyAudioVolumes();
  }

  function unlockAudio() {
    if (audioEngine.unlocked) {
      return;
    }

    audioEngine.unlocked = true;

    // A silent play/pause during a user gesture helps browsers authorize
    // later music and sound playback.
    audioEngine.music.muted = true;

    const attempt = audioEngine.music.play();

    if (attempt?.catch) {
      attempt.catch(() => {});
    }

    audioEngine.music.pause();
    audioEngine.music.currentTime = 0;
    audioEngine.music.muted = false;
    applyAudioVolumes();
  }

  function playSound(name) {
    if (AUDIO_LINKS.muted) {
      return;
    }

    const template = audioEngine.sfxTemplates[name];

    if (!template) {
      return;
    }

    const sound = template.cloneNode();
    sound.volume = AUDIO_LINKS.sfxVolume;

    const attempt = sound.play();

    if (attempt?.catch) {
      attempt.catch(error => {
        console.warn(`Could not play ${name}:`, error);
      });
    }
  }

  function stopMusic() {
    audioEngine.music.pause();
    audioEngine.currentMusicKey = "";
  }

  function playMusic(sourceLink, key) {
    const source = normalizeDropboxAudioLink(sourceLink);

    if (!source || AUDIO_LINKS.muted) {
      stopMusic();
      return;
    }

    if (
      audioEngine.currentMusicKey === key &&
      !audioEngine.music.paused
    ) {
      return;
    }

    audioEngine.currentMusicKey = key;
    audioEngine.music.pause();
    audioEngine.music.src = source;
    audioEngine.music.currentTime = 0;
    applyAudioVolumes();

    const attempt = audioEngine.music.play();

    if (attempt?.catch) {
      attempt.catch(error => {
        console.warn(
          "Music did not start. Click inside the game once, then try again:",
          error
        );
      });
    }
  }

  function playMenuMusic() {
    playMusic(AUDIO_LINKS.music.menu, "menu");
  }

  function playLevelMusic() {
    const link = AUDIO_LINKS.music.levels[game.levelIndex] || "";
    playMusic(link, `level-${game.levelIndex}`);
  }

  function playBossMusic() {
    playMusic(AUDIO_LINKS.music.boss, `boss-${game.levelIndex}`);
  }

  rebuildSoundEffects();

  const WEAPONS = [
    ["Training Blade", 0, "#d7e2ff"], ["Riftfang", 5, "#58e5ff"], ["Venom Edge", 10, "#99ff65"],
    ["Frostbite", 15, "#83d9ff"], ["Void Talon", 21, "#c482ff"], ["Dragon Fang", 28, "#ffd86b"]
  ];

  const TYPES = {
    goblin: ["Rift Goblin", "human", "melee", 46, 58, 44, 10, 92, 25, "#3f516e"],
    wolf: ["Ironfang Wolf", "wolf", "melee", 62, 40, 38, 12, 155, 30, "#31516d"],
    archer: ["Crystal Archer", "human", "ranged", 46, 58, 42, 9, 58, 35, "#404a75", "#ff6c91"],
    brute: ["Dungeon Brute", "human", "melee", 72, 90, 120, 19, 55, 80, "#70465c"],
    spider: ["Venom Spider", "spider", "melee", 60, 38, 55, 14, 135, 42, "#6c4374"],
    cultist: ["Venom Cultist", "human", "ranged", 48, 62, 58, 13, 60, 48, "#5b3d68", "#98ff56"],
    frostWolf: ["Frostfang", "wolf", "melee", 64, 42, 72, 16, 165, 52, "#5685a5"],
    iceMage: ["Ice Mage", "human", "ranged", 48, 62, 68, 15, 58, 56, "#466e91", "#75dcff"],
    shadow: ["Shadow Soldier", "human", "melee", 50, 64, 86, 18, 120, 62, "#352c50"],
    wraith: ["Void Wraith", "wraith", "ranged", 52, 66, 76, 17, 72, 65, "#5a3c80", "#bd6fff"],
    drake: ["Rift Drake", "drake", "melee", 82, 58, 115, 21, 128, 78, "#854d43"],
    flameMage: ["Flame Acolyte", "human", "ranged", 48, 62, 90, 19, 62, 72, "#7b443e", "#ff8b45"]
  };

  const LEVELS = [
    { name:"Ruined Gate", rank:"E-Rank Rift", bg:["#050716","#11162b","#090b13"], stone:"#39445b", accent:"#795cff", platforms:[[1380,118,320],[3240,132,360]], enemies:[[620,"goblin"],[920,"wolf"],[1210,"archer"],[1780,"goblin"],[2100,"wolf"],[2410,"brute"],[2860,"archer"],[3190,"goblin"]], boss:["Stone Executioner","executioner",700,24,70,"#596174"] },
    { name:"Venom Nest", rank:"D-Rank Rift", bg:["#07100b","#17251a","#080d09"], stone:"#394f3c", accent:"#8bff55", platforms:[[1150,105,350],[3070,145,390]], enemies:[[580,"spider"],[860,"cultist"],[1180,"spider"],[1640,"goblin"],[1950,"cultist"],[2280,"spider"],[2700,"brute"],[3150,"cultist"],[3550,"spider"]], boss:["Venom Queen","venom",980,27,88,"#704474"] },
    { name:"Frozen Citadel", rank:"C-Rank Rift", bg:["#06121c","#163149","#081018"], stone:"#4c758d", accent:"#74ddff", platforms:[[1420,145,340],[3350,112,370]], enemies:[[610,"frostWolf"],[900,"iceMage"],[1270,"frostWolf"],[1710,"brute"],[2080,"iceMage"],[2450,"frostWolf"],[2850,"iceMage"],[3290,"frostWolf"],[3720,"brute"]], boss:["Frost Warden","frost",1300,31,82,"#4f809d"] },
    { name:"Abyssal Forest", rank:"B-Rank Rift", bg:["#090611","#20132e","#0b0711"], stone:"#4d3c5e", accent:"#ba6eff", platforms:[[1280,125,360],[3180,155,400]], enemies:[[590,"shadow"],[890,"wraith"],[1220,"shadow"],[1650,"wolf"],[2010,"wraith"],[2380,"shadow"],[2780,"brute"],[3190,"wraith"],[3620,"shadow"],[4000,"wraith"]], boss:["Abyss Stalker","shadow",1750,35,135,"#593c79"] },
    { name:"Dragon Rift", rank:"A-Rank Rift", bg:["#150705","#35130f","#100706"], stone:"#74483e", accent:"#ff8b45", platforms:[[1360,112,350],[3260,138,390]], enemies:[[600,"drake"],[930,"flameMage"],[1270,"drake"],[1710,"brute"],[2070,"flameMage"],[2430,"drake"],[2840,"flameMage"],[3290,"drake"],[3710,"brute"],[4100,"flameMage"]], boss:["Rift Dragon","dragon",2400,42,105,"#8d493e"] }
  ];

  let W = 1280, H = 720, DPR = 1, floorY = 640;
  const input = { left:false, right:false, jump:false, light:false, heavy:false, dash:false, skill:false };
  const game = { state:"menu", levelIndex:0, player:null, enemies:[], projectiles:[], drops:[], particles:[], texts:[], cameraX:0, kills:0, nextSpawn:0, bossSpawned:false, elapsed:0, shake:0, toastTimer:0, last:performance.now() };

  function resize() {
    const r = shell.getBoundingClientRect();
    W = Math.max(320, Math.floor(r.width || innerWidth));
    H = Math.max(340, Math.floor(r.height || innerHeight));
    DPR = Math.min(devicePixelRatio || 1, 2);
    floorY = H - clamp(H * 0.11, 46, 72);
    canvas.width = Math.floor(W * DPR); canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
  }
  resize();

  function level() { return LEVELS[game.levelIndex]; }
  function platforms() { return [{x:0,y:floorY,w:WORLD_W,h:120,floor:true}, ...level().platforms.map(([x,lift,w])=>({x,y:floorY-lift,w,h:22}))]; }
  function rank(n) { return n>=15?"S":n>=11?"A":n>=8?"B":n>=5?"C":n>=3?"D":"E"; }
  function load() { try { return JSON.parse(localStorage.getItem(SAVE)) || {}; } catch { return {}; } }
  function save() { if (!game.player?.classId) return; localStorage.setItem(SAVE, JSON.stringify({classId:game.player.classId,stats:game.player.stats,level:game.player.level,xp:game.player.xp,weaponIndex:game.player.weaponIndex,levelIndex:game.levelIndex})); }

  function makePlayer(classId, saved=null) {
    const stats = saved?.stats ? {...saved.stats} : {strength:1,agility:1,vitality:1,intelligence:1,perception:1};
    if (!saved) stats[CLASSES[classId].stat]++;
    const lv = saved?.level || 1, maxHp = 100 + (stats.vitality-1)*20, maxMp = 60 + (stats.intelligence-1)*14;
    return {classId,x:120,y:floorY-70,w:42,h:70,vx:0,vy:0,facing:1,grounded:true,jumps:0,level:lv,xp:saved?.xp||0,xpNeed:Math.floor(100*1.22**(lv-1)),stats,weaponIndex:clamp(saved?.weaponIndex||0,0,WEAPONS.length-1),hp:maxHp,maxHp,mp:maxMp,maxMp,attackTimer:0,attackCd:0,attackType:"light",attackId:0,combo:0,comboTimer:0,dashTimer:0,dashCd:0,skillCd:0,invuln:0,flash:0};
  }

  function makeEnemy(type,x,scale=1) {
    const t=TYPES[type];
    return {type,name:t[0],shape:t[1],behavior:t[2],x,y:floorY-t[4],w:t[3],h:t[4],vx:0,facing:-1,hp:Math.round(t[5]*scale),maxHp:Math.round(t[5]*scale),damage:Math.round(t[6]*scale),speed:t[7],xp:Math.round(t[8]*scale),color:t[9],projectileColor:t[10],attackCd:rand(.2,.9),specialCd:0,warning:0,queued:false,flash:0,lastAttack:-1,dead:false,boss:false};
  }

  function makeBoss() {
    const [name,style,hp,damage,speed,color]=level().boss;
    const spider=style==="venom", dragon=style==="dragon";
    const w=dragon?180:spider?150:120, h=dragon?120:spider?105:150;
    return {type:"boss",name,style,shape:spider?"spider":dragon?"drake":"human",behavior:"boss",boss:true,x:WORLD_W-430,y:floorY-h,w,h,vx:0,facing:-1,hp,maxHp:hp,damage,speed,xp:500,color,attackCd:1.2,specialCd:2.4,warning:0,queued:false,flash:0,lastAttack:-1,dead:false};
  }

  function injectUI() {
    const style=document.createElement("style");
    style.textContent=`
      .riftOverlay{position:absolute;inset:0;z-index:80;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(3,5,15,.9);backdrop-filter:blur(8px);font-family:system-ui;color:#eef5ff}.riftOverlay.active{display:flex}.riftPanel{width:min(900px,96%);max-height:92%;overflow:auto;padding:24px;border:1px solid rgba(120,165,255,.42);border-radius:18px;background:linear-gradient(145deg,rgba(16,23,46,.98),rgba(8,11,25,.98));box-shadow:0 24px 80px #000b}.riftPanel h2{text-align:center;font-size:clamp(26px,5vw,44px);margin:0 0 7px}.riftPanel>p{text-align:center;color:#aebbd0}.classGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.classCard{cursor:pointer;text-align:left;padding:17px;border:1px solid #445170;border-radius:14px;background:#121a31;color:#eef5ff;transition:.18s}.classCard:hover{transform:translateY(-5px);border-color:var(--c)}.classIcon{font-size:34px;color:var(--c)}.classPortrait{display:block;width:100%;height:150px;object-fit:contain;object-position:center bottom;margin:0 auto 8px;filter:drop-shadow(0 8px 12px #0009)}.classBonus{font-weight:900;color:var(--c)}.classCard p{font-size:13px;color:#aebbd0}.riftButton{display:block;margin:18px auto 0;padding:12px 24px;border:0;border-radius:9px;background:#6d5dff;color:white;font-weight:900;cursor:pointer}#attributeHud{display:grid;grid-template-columns:repeat(5,minmax(42px,1fr));gap:5px;margin-top:8px;padding:6px;border:1px solid #6ee8ff40;border-radius:8px;background:#040814c8}.statCell{text-align:center;padding:4px 2px;border-radius:6px;background:#28345494}.statCell b{display:block;font-size:9px;color:#9db0cc}.statCell span{font-weight:900}.scratchBtn{margin-left:8px}@media(max-width:720px){.classGrid{grid-template-columns:repeat(2,1fr)}.riftPanel{padding:16px}}
    `;
    document.head.appendChild(style);

    const classO=document.createElement("div"); classO.id="classOverlay"; classO.className="riftOverlay";
    classO.innerHTML=`<div class="riftPanel"><h2>Choose Your Hunter Class</h2><p>Each class receives one permanent starting bonus.</p><div class="classGrid">${Object.entries(CLASSES).map(([id,c])=>{const imageUrl=CHARACTER_IMAGES[id]?.url;const portrait=hasCharacterImageUrl(imageUrl)?`<img class="classPortrait" src="${imageUrl}" alt="${c.name}">`:`<div class="classIcon">${c.icon}</div>`;return `<button class="classCard" data-class="${id}" style="--c:${c.color}">${portrait}<h3>${c.name}</h3><div class="classBonus">${c.bonus}</div><p>${c.text}</p></button>`;}).join("")}</div></div>`;
    shell.appendChild(classO);

    const trans=document.createElement("div"); trans.id="transitionOverlay"; trans.className="riftOverlay";
    trans.innerHTML=`<div class="riftPanel"><h2 id="transitionTitle"></h2><p id="transitionBody"></p><button id="nextLevelBtn" class="riftButton">Enter Next Rift</button></div>`;
    shell.appendChild(trans);

    const statHud=document.createElement("div"); statHud.id="attributeHud";
    statHud.innerHTML=[['STR','strength'],['AGI','agility'],['VIT','vitality'],['INT','intelligence'],['PER','perception']].map(([a,s])=>`<div class="statCell"><b>${a}</b><span id="stat-${s}">1</span></div>`).join("");
    const xpAnchor=ui.xpBar?.parentElement?.parentElement || ui.xpBar?.parentElement || ui.hud;
    xpAnchor?.insertAdjacentElement?.("afterend",statHud) || ui.hud?.appendChild(statHud);

    if (ui.end) {
      const scratch=document.createElement("button"); scratch.id="scratchBtn"; scratch.className=(ui.retryBtn?.className||"riftButton")+" scratchBtn"; scratch.textContent="Restart From Scratch"; scratch.style.display="none";
      (ui.retryBtn?.parentElement||ui.end).appendChild(scratch);
      scratch.addEventListener("click",restartScratch);
    }

    classO.querySelectorAll("[data-class]").forEach(b=>b.addEventListener("click",()=>newAdventure(b.dataset.class)));
    $("nextLevelBtn").addEventListener("click",nextLevel);
  }
  injectUI();

  function injectAudioUI() {
    const overlay = document.createElement("div");
    overlay.id = "audioOverlay";
    overlay.className = "riftOverlay";

    const levelInputs = LEVELS.map((levelData, index) => `
      <label class="audioLinkRow">
        <span>${index + 1}. ${levelData.name}</span>
        <input
          id="audio-level-${index}"
          type="url"
          placeholder="Paste a public Dropbox music link"
        >
      </label>
    `).join("");

    overlay.innerHTML = `
      <div class="riftPanel audioPanel">
        <h2>Music & Sound Links</h2>
        <p>
          Paste public Dropbox share links. The game changes Dropbox links
          to browser-playable raw links automatically.
        </p>

        <h3>Music</h3>

        <label class="audioLinkRow">
          <span>Menu / class selection</span>
          <input id="audio-menu" type="url" placeholder="Dropbox music link">
        </label>

        ${levelInputs}

        <label class="audioLinkRow">
          <span>Boss battle music</span>
          <input id="audio-boss" type="url" placeholder="Dropbox boss-music link">
        </label>

        <h3>Sound effects</h3>

        <div class="audioLinkGrid">
          <label class="audioLinkRow">
            <span>Level up</span>
            <input id="audio-levelUp" type="url" placeholder="Dropbox sound link">
          </label>

          <label class="audioLinkRow">
            <span>Enemy killed</span>
            <input id="audio-enemyKill" type="url" placeholder="Dropbox sound link">
          </label>

          <label class="audioLinkRow">
            <span>Boss killed</span>
            <input id="audio-bossKill" type="url" placeholder="Dropbox sound link">
          </label>

          <label class="audioLinkRow">
            <span>Magic ball</span>
            <input id="audio-magicBall" type="url" placeholder="Dropbox sound link">
          </label>

          <label class="audioLinkRow">
            <span>Sword swing</span>
            <input id="audio-swordSwing" type="url" placeholder="Dropbox sound link">
          </label>

          <label class="audioLinkRow">
            <span>Hero death</span>
            <input id="audio-heroDeath" type="url" placeholder="Dropbox sound link">
          </label>
        </div>

        <div class="audioVolumeGrid">
          <label>
            <span>Music volume</span>
            <input id="audio-music-volume" type="range" min="0" max="1" step="0.05">
          </label>

          <label>
            <span>Sound-effect volume</span>
            <input id="audio-sfx-volume" type="range" min="0" max="1" step="0.05">
          </label>

          <label class="audioMuteRow">
            <input id="audio-muted" type="checkbox">
            <span>Mute all audio</span>
          </label>
        </div>

        <div class="audioButtonRow">
          <button id="audio-save" class="riftButton" type="button">
            Save Links
          </button>

          <button id="audio-test-music" class="riftButton" type="button">
            Test Music
          </button>

          <button id="audio-test-sfx" class="riftButton" type="button">
            Test Sword Sound
          </button>

          <button id="audio-close" class="riftButton" type="button">
            Close
          </button>
        </div>
      </div>
    `;

    shell.appendChild(overlay);

    const style = document.createElement("style");
    style.textContent = `
      .audioPanel h3 {
        margin: 18px 0 8px;
        color: #77e8ff;
      }

      .audioLinkGrid,
      .audioVolumeGrid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .audioLinkRow {
        display: grid;
        gap: 5px;
        margin-bottom: 9px;
        color: #c7d2e5;
        font-size: 13px;
      }

      .audioLinkRow input[type="url"] {
        box-sizing: border-box;
        width: 100%;
        padding: 9px 10px;
        border: 1px solid #40506d;
        border-radius: 8px;
        background: #090f20;
        color: #ffffff;
      }

      .audioVolumeGrid label {
        display: grid;
        gap: 6px;
        color: #c7d2e5;
        font-size: 13px;
      }

      .audioMuteRow {
        display: flex !important;
        align-items: center;
        gap: 8px;
      }

      .audioButtonRow {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 8px;
        margin-top: 18px;
      }

      .audioButtonRow .riftButton {
        margin: 0;
      }

      .soundSettingsButton {
        margin-top: 10px;
      }

      @media (max-width: 680px) {
        .audioLinkGrid,
        .audioVolumeGrid {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(style);

    const buttons = [];

    function createSoundButton(parent) {
      if (!parent) {
        return;
      }

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Sound Links";
      button.className = `${ui.startBtn?.className || "riftButton"} soundSettingsButton`;
      button.addEventListener("click", () => {
        unlockAudio();
        fillAudioForm();
        overlay.classList.add("active");
      });
      parent.appendChild(button);
      buttons.push(button);
    }

    createSoundButton(ui.startBtn?.parentElement);
    createSoundButton($("classOverlay")?.querySelector(".riftPanel"));

    function fillAudioForm() {
      $("audio-menu").value = AUDIO_LINKS.music.menu;
      $("audio-boss").value = AUDIO_LINKS.music.boss;

      for (let index = 0; index < 5; index += 1) {
        $(`audio-level-${index}`).value = AUDIO_LINKS.music.levels[index];
      }

      Object.keys(AUDIO_LINKS.sfx).forEach(name => {
        $(`audio-${name}`).value = AUDIO_LINKS.sfx[name];
      });

      $("audio-music-volume").value = AUDIO_LINKS.musicVolume;
      $("audio-sfx-volume").value = AUDIO_LINKS.sfxVolume;
      $("audio-muted").checked = AUDIO_LINKS.muted;
    }

    function readAudioForm() {
      const next = cloneDefaultAudioLinks();

      next.music.menu = $("audio-menu").value.trim();
      next.music.boss = $("audio-boss").value.trim();

      for (let index = 0; index < 5; index += 1) {
        next.music.levels[index] = $(`audio-level-${index}`).value.trim();
      }

      Object.keys(next.sfx).forEach(name => {
        next.sfx[name] = $(`audio-${name}`).value.trim();
      });

      next.musicVolume = Number($("audio-music-volume").value);
      next.sfxVolume = Number($("audio-sfx-volume").value);
      next.muted = $("audio-muted").checked;

      return cleanAudioLinks(next);
    }

    $("audio-save").addEventListener("click", () => {
      unlockAudio();
      AUDIO_LINKS = readAudioForm();
      saveAudioLinks();
      rebuildSoundEffects();

      if (game.state === "playing") {
        playLevelMusic();
      } else if (game.state === "class" || game.state === "menu") {
        playMenuMusic();
      }

      toast("AUDIO SAVED", "Your Dropbox music and sound links were saved.");
    });

    $("audio-test-music").addEventListener("click", () => {
      unlockAudio();
      AUDIO_LINKS = readAudioForm();
      rebuildSoundEffects();

      const testLink =
        AUDIO_LINKS.music.menu ||
        AUDIO_LINKS.music.levels[0] ||
        AUDIO_LINKS.music.boss;

      playMusic(testLink, "audio-test");
    });

    $("audio-test-sfx").addEventListener("click", () => {
      unlockAudio();
      AUDIO_LINKS = readAudioForm();
      rebuildSoundEffects();
      playSound("swordSwing");
    });

    $("audio-close").addEventListener("click", () => {
      overlay.classList.remove("active");
    });

    $("audio-music-volume").addEventListener("input", event => {
      AUDIO_LINKS.musicVolume = Number(event.target.value);
      applyAudioVolumes();
    });

    $("audio-sfx-volume").addEventListener("input", event => {
      AUDIO_LINKS.sfxVolume = Number(event.target.value);
    });

    $("audio-muted").addEventListener("change", event => {
      AUDIO_LINKS.muted = event.target.checked;
      applyAudioVolumes();

      if (AUDIO_LINKS.muted) {
        stopMusic();
      }
    });

    fillAudioForm();
  }

  injectAudioUI();

  function toast(title,body) { if(!ui.toast)return; if(ui.toastTitle)ui.toastTitle.textContent=title;if(ui.toastBody)ui.toastBody.textContent=body;ui.toast.classList.add("active");game.toastTimer=2.5; }
  function burst(x,y,color,n=10){for(let i=0;i<n;i++){const a=rand(0,Math.PI*2),s=rand(70,280);game.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,size:rand(2,6),color,life:rand(.25,.7),max:.7});}}
  function text(x,y,value,color="#fff",size=18){game.texts.push({x,y,value,color,size,life:.85,max:.85});}
  function projectile(owner,x,y,vx,vy,damage,color,w=18,h=18,life=4){game.projectiles.push({owner,x,y,vx,vy,damage,color,w,h,life,dead:false});}
  function resetInput(){Object.keys(input).forEach(k=>input[k]=false);}

  function showClasses(){resetInput();game.state="class";ui.start?.classList.remove("active");$("classOverlay").classList.add("active");playMenuMusic();}
  function newAdventure(id){localStorage.removeItem(SAVE);game.levelIndex=0;game.player=makePlayer(id);$("classOverlay").classList.remove("active");startLevel(true);}
  function continueAdventure(){const s=load();if(!s.classId)return false;game.levelIndex=clamp(s.levelIndex||0,0,LEVELS.length-1);game.player=makePlayer(s.classId,s);startLevel(true);return true;}

  function startLevel(fullHeal=true){
    const p=game.player; p.x=120;p.y=floorY-p.h;p.vx=p.vy=0;if(fullHeal){p.hp=p.maxHp;p.mp=p.maxMp;}
    game.enemies=[];game.projectiles=[];game.drops=[];game.particles=[];game.texts=[];game.cameraX=0;game.kills=0;game.nextSpawn=0;game.bossSpawned=false;game.shake=0;game.state="playing";
    ui.start?.classList.remove("active");ui.end?.classList.remove("active");ui.levelPanel?.classList.remove("active");ui.hud?.classList.remove("hidden");ui.quest?.classList.remove("hidden");
    if(ui.retryBtn)ui.retryBtn.textContent="Retry Current Rift";if($("scratchBtn"))$("scratchBtn").style.display="none";
    toast(`${level().rank}: ${level().name}`,"Eliminate all creatures and defeat the boss.");playLevelMusic();save();
  }

  function nextLevel(){ $("transitionOverlay").classList.remove("active");game.levelIndex++;if(game.levelIndex>=LEVELS.length){finishAdventure();return;}game.player.weaponIndex=Math.max(game.player.weaponIndex,Math.min(game.levelIndex,WEAPONS.length-1));startLevel(true); }
  function clearLevel(){save();stopMusic();if(game.levelIndex===LEVELS.length-1){finishAdventure();return;}game.state="transition";const next=LEVELS[game.levelIndex+1];$("transitionTitle").textContent=`${level().name} Cleared`;$("transitionBody").textContent=`Next portal: ${next.name} (${next.rank}). Health and mana will be restored.`;$("transitionOverlay").classList.add("active");}
  function finishAdventure(){stopMusic();game.state="victory";if(ui.endTitle)ui.endTitle.textContent="ADVENTURE COMPLETE";if(ui.endBody)ui.endBody.textContent=`Your ${CLASSES[game.player.classId].name} defeated the Rift Dragon and sealed the final portal.`;if(ui.retryBtn)ui.retryBtn.textContent="New Adventure";if($("scratchBtn"))$("scratchBtn").style.display="none";ui.end?.classList.add("active");}

  function restartScratch(){localStorage.removeItem(SAVE);resetInput();game.levelIndex=0;game.player=null;game.enemies=[];game.projectiles=[];game.drops=[];game.particles=[];game.texts=[];game.cameraX=0;game.kills=0;game.nextSpawn=0;game.bossSpawned=false;ui.end?.classList.remove("active");ui.levelPanel?.classList.remove("active");$("transitionOverlay")?.classList.remove("active");showClasses();}

  function damagePlayer(amount,dir){
    const p=game.player;if(game.state!=="playing"||p.invuln>0)return;const reduction=Math.min(.48,(p.stats.vitality-1)*.05),d=Math.max(1,Math.round(amount*(1-reduction)));p.hp-=d;p.vx=dir*280;p.vy=-225;p.invuln=.7;p.flash=.18;p.combo=0;p.comboTimer=0;game.shake=9;text(p.x+p.w/2,p.y-8,`-${d}`,"#ff6680",20);burst(p.x+p.w/2,p.y+30,"#ff6680",12);
    if(p.hp<=0){playSound("heroDeath");stopMusic();p.hp=0;game.state="gameover";if(ui.endTitle)ui.endTitle.textContent="YOU HAVE FALLEN";if(ui.endBody)ui.endBody.textContent=`Retry ${level().name}, or restart the entire adventure from scratch.`;if(ui.retryBtn)ui.retryBtn.textContent="Retry Current Rift";if($("scratchBtn"))$("scratchBtn").style.display="inline-block";ui.end?.classList.add("active");}
  }

  function gainXP(n){const p=game.player;p.xp+=n;text(p.x+p.w/2,p.y-25,`+${n} XP`,"#5ee7ff",16);if(p.xp>=p.xpNeed){p.xp-=p.xpNeed;p.level++;p.xpNeed=Math.floor(100*1.22**(p.level-1));p.hp=p.maxHp;p.mp=p.maxMp;if(ui.levelPanel){playSound("levelUp");game.state="levelup";ui.levelPanel.classList.add("active");toast("LEVEL UP","Choose one attribute.");}else{playSound("levelUp");p.stats.strength++;toast("LEVEL UP","+1 Strength");}}save();}

  function killEnemy(e){if(e.dead)return;e.dead=true;burst(e.x+e.w/2,e.y+e.h/2,level().accent,e.boss?45:18);if(e.boss){playSound("bossKill");stopMusic();setTimeout(clearLevel,500);return;}playSound("enemyKill");game.kills++;gainXP(e.xp);const chance=.22+game.player.stats.perception*.018;if(Math.random()<chance)game.drops.push({type:Math.random()<.55?"health":"mana",x:e.x+e.w/2-12,y:e.y,w:24,h:24,vy:-220,dead:false});}
  function damageEnemy(e,n,dir,heavy=false){if(e.dead)return;e.hp-=n;e.flash=.12;e.vx+=dir*(heavy?300:140);text(e.x+e.w/2,e.y-8,n);burst(e.x+e.w/2,e.y+e.h/2,level().accent,heavy?15:8);if(e.hp<=0)killEnemy(e);}

  function beginAttack(type){const p=game.player;if(p.attackCd>0||p.dashTimer>0)return;playSound("swordSwing");p.attackType=type;p.attackId++;if(type==="heavy"){p.attackTimer=.32;p.attackCd=.55;p.combo=0;p.comboTimer=0;}else{p.attackTimer=.2;p.attackCd=.26;p.combo=p.comboTimer>0?p.combo%3+1:1;p.comboTimer=.68;}}
  function riftWave(){const p=game.player;if(p.skillCd>0||p.mp<22)return;playSound("magicBall");p.mp-=22;p.skillCd=1.05;const mult=p.classId==="mage"?1.25:1,d=Math.round((20+p.stats.intelligence*6+p.weaponIndex*4)*mult);projectile("player",p.x+p.w/2-20,p.y+22,p.facing*650,0,d,CLASSES[p.classId].color,42,24,1.8);burst(p.x+p.w/2,p.y+30,CLASSES[p.classId].color,14);}

  function playerPhysics(dt){const p=game.player;p.grounded=false;p.x=clamp(p.x+p.vx*dt,0,WORLD_W-p.w);const old=p.y+p.h;p.vy+=GRAVITY*dt;p.y+=p.vy*dt;for(const q of platforms()){if(p.x+p.w>q.x&&p.x<q.x+q.w&&old<=q.y&&p.y+p.h>=q.y&&p.vy>=0){p.y=q.y-p.h;p.vy=0;p.grounded=true;}}if(p.y+p.h>floorY){p.y=floorY-p.h;p.vy=0;p.grounded=true;}}

  function updatePlayer(dt){
    const p=game.player;["attackTimer","attackCd","comboTimer","dashTimer","dashCd","skillCd","invuln","flash"].forEach(k=>p[k]=Math.max(0,p[k]-dt));if(p.comboTimer<=0)p.combo=0;
    const dir=(input.right?1:0)-(input.left?1:0),speed=245+(p.stats.agility-1)*12;
    if(p.dashTimer>0)p.vx=p.facing*(760+p.stats.agility*12);else if(dir){p.facing=dir;p.vx=clamp(p.vx+dir*1900*dt,-speed,speed);}else p.vx*=Math.pow(.001,dt);
    if(input.jump){input.jump=false;if(p.grounded||p.jumps<2){p.vy=-650;p.jumps++;p.grounded=false;}}
    if(input.dash){input.dash=false;if(p.dashCd<=0){p.dashTimer=.18;p.dashCd=.72;p.invuln=.24;p.vx=p.facing*780;p.vy*=.2;burst(p.x+p.w/2,p.y+p.h/2,CLASSES[p.classId].color,16);}}
    if(input.light){input.light=false;beginAttack("light");}if(input.heavy){input.heavy=false;beginAttack("heavy");}if(input.skill){input.skill=false;riftWave();}
    playerPhysics(dt);if(p.grounded)p.jumps=0;
    if(p.attackTimer>0){const heavy=p.attackType==="heavy",reach=heavy?108:74+p.combo*6,box={x:p.facing>0?p.x+p.w-3:p.x-reach+3,y:p.y+12,w:reach,h:heavy?62:48};for(const e of game.enemies){if(e.dead||e.lastAttack===p.attackId||!hit(box,e))continue;e.lastAttack=p.attackId;let d=(12+p.stats.strength*3+WEAPONS[p.weaponIndex][1])*(heavy?1.95:1+Math.max(0,p.combo-1)*.15);const crit=Math.random()<.05+p.stats.perception*.018;if(crit)d*=1.75;d=Math.round(d);damageEnemy(e,d,p.facing,heavy);if(crit)text(e.x+e.w/2,e.y-30,"CRITICAL!","#ffe27a",18);}}
  }

  function melee(e,reach=70,height=60){const box={x:e.facing>0?e.x+e.w:e.x-reach,y:e.y+e.h-height,w:reach,h:height};if(hit(box,game.player))damagePlayer(e.damage,e.facing);}
  function fireAtPlayer(e,color=e.projectileColor||"#ff6680",speed=350){const p=game.player,ox=e.x+e.w/2,oy=e.y+e.h*.35,a=Math.atan2(p.y+p.h/2-oy,p.x+p.w/2-ox);projectile("enemy",ox-9,oy-9,Math.cos(a)*speed,Math.sin(a)*speed,e.damage,color);}

  function bossSpecial(e){const p=game.player;
    if(e.style==="executioner")projectile("enemy",e.x+e.w/2,floorY-22,e.facing*430,0,Math.round(e.damage*.7),"#ff9a52",48,20,3);
    if(e.style==="venom")[-.25,0,.25].forEach(s=>{const a=Math.atan2(p.y+p.h/2-e.y,p.x-e.x)+s;projectile("enemy",e.x+e.w/2,e.y+25,Math.cos(a)*330,Math.sin(a)*330,Math.round(e.damage*.65),"#9dff55",20,20,4);});
    if(e.style==="frost")for(let i=-2;i<=2;i++)projectile("enemy",e.x+e.w/2,e.y+30,e.facing*(300+Math.abs(i)*30),i*70,Math.round(e.damage*.55),"#75dcff",24,18,3);
    if(e.style==="shadow"){e.x=clamp(p.x+(Math.random()<.5?-180:180),0,WORLD_W-e.w);burst(e.x+e.w/2,e.y+e.h/2,"#bd6fff",25);}
    if(e.style==="dragon")[-.32,-.16,0,.16,.32].forEach(s=>{const a=(e.facing>0?0:Math.PI)+s;projectile("enemy",e.x+e.w/2,e.y+40,Math.cos(a)*410,Math.sin(a)*410,Math.round(e.damage*.58),"#ff8245",30,22,3.5);});
  }

  function updateEnemy(e,dt){
    const p=game.player,d=p.x-e.x,dist=Math.abs(d);e.facing=d>=0?1:-1;e.attackCd=Math.max(0,e.attackCd-dt);e.specialCd=Math.max(0,e.specialCd-dt);e.warning=Math.max(0,e.warning-dt);e.flash=Math.max(0,e.flash-dt);
    if(e.queued&&e.warning<=0){e.queued=false;if(e.behavior==="ranged")fireAtPlayer(e);else melee(e,e.boss?135:e.type==="brute"?94:70,e.boss?100:e.h*.75);}
    if(e.boss&&e.specialCd<=0){bossSpecial(e);e.specialCd=e.hp<e.maxHp*.5?1.8:2.7;}
    if(e.warning>0)e.vx*=Math.pow(.001,dt);
    else if(e.behavior==="ranged"){
      if(dist<235)e.vx+=-e.facing*e.speed*8*dt;else if(dist>430)e.vx+=e.facing*e.speed*8*dt;else e.vx*=Math.pow(.01,dt);
      if(e.attackCd<=0&&dist<590){e.warning=.34;e.queued=true;e.attackCd=rand(1.4,2);}
    } else {
      const range=e.boss?150:e.type==="brute"?85:60;
      if(dist>range)e.vx+=e.facing*e.speed*9*dt;else{e.vx*=Math.pow(.01,dt);if(e.attackCd<=0){e.warning=e.boss?.4:e.type==="brute"?.5:.23;e.queued=true;e.attackCd=e.boss?1.25:e.type==="wolf"?.9:1.15;}}
    }
    e.vx=clamp(e.vx,-(e.boss?190:e.speed),e.boss?190:e.speed);e.x=clamp(e.x+e.vx*dt,0,WORLD_W-e.w);e.y=floorY-e.h;
  }

  function updateProjectiles(dt){for(const q of game.projectiles){q.life-=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;if(q.owner==="player"){for(const e of game.enemies)if(!e.dead&&hit(q,e)){damageEnemy(e,q.damage,Math.sign(q.vx)||1);q.dead=true;break;}}else if(hit(q,game.player)){damagePlayer(q.damage,Math.sign(q.vx)||1);q.dead=true;}if(q.life<=0||q.x<-100||q.x>WORLD_W+100||q.y<-100||q.y>H+100)q.dead=true;}game.projectiles=game.projectiles.filter(q=>!q.dead);}
  function updateDrops(dt){const p=game.player;for(const d of game.drops){d.vy+=720*dt;d.y+=d.vy*dt;if(d.y+d.h>floorY){d.y=floorY-d.h;d.vy*=-.25;}if(hit(d,p)){d.dead=true;if(d.type==="health"){p.hp=Math.min(p.maxHp,p.hp+40);toast("ITEM ACQUIRED","+40 HP");}else{p.mp=Math.min(p.maxMp,p.mp+32);toast("ITEM ACQUIRED","+32 MP");}}}game.drops=game.drops.filter(d=>!d.dead);}
  function updateEffects(dt){for(const p of game.particles){p.life-=dt;p.vy+=500*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}for(const t of game.texts){t.life-=dt;t.y-=48*dt;}game.particles=game.particles.filter(p=>p.life>0);game.texts=game.texts.filter(t=>t.life>0);}

  function spawn(){const l=level(),scale=1+game.levelIndex*.16;while(game.nextSpawn<l.enemies.length&&l.enemies[game.nextSpawn][0]<game.player.x+W*1.1){const [x,t]=l.enemies[game.nextSpawn++];game.enemies.push(makeEnemy(t,x,scale));}if(!game.bossSpawned&&game.kills>=l.enemies.length){game.bossSpawned=true;game.enemies.push(makeBoss());playBossMusic();toast("BOSS DETECTED",l.boss[0]);}}

  function updateUI(){const p=game.player;if(!p)return;const bar=(el,v)=>{if(el)el.style.width=clamp(v,0,100)+"%";};bar(ui.hpBar,p.hp/p.maxHp*100);bar(ui.mpBar,p.mp/p.maxMp*100);bar(ui.xpBar,p.xp/p.xpNeed*100);if(ui.hpText)ui.hpText.textContent=`${Math.ceil(p.hp)} / ${p.maxHp}`;if(ui.mpText)ui.mpText.textContent=`${Math.ceil(p.mp)} / ${p.maxMp}`;if(ui.xpText)ui.xpText.textContent=`${p.xp} / ${p.xpNeed}`;if(ui.rank)ui.rank.textContent=rank(p.level);if(ui.level)ui.level.textContent=p.level;if(ui.weapon)ui.weapon.textContent=`${CLASSES[p.classId].name} · ${WEAPONS[p.weaponIndex][0]}`;if(ui.combo)ui.combo.textContent=p.combo;if(ui.questTitle)ui.questTitle.textContent=`${level().rank}: ${level().name}`;if(ui.questProgress)ui.questProgress.textContent=game.bossSpawned?`Defeat ${level().boss[0]}`:`Defeat Rift creatures: ${Math.min(game.kills,level().enemies.length)} / ${level().enemies.length}`;for(const s of ["strength","agility","vitality","intelligence","perception"]){const el=$("stat-"+s);if(el)el.textContent=p.stats[s];}const b=game.enemies.find(e=>e.boss&&!e.dead);if(b){ui.bossWrap?.classList.remove("hidden");if(ui.bossName)ui.bossName.textContent=b.name;bar(ui.bossBar,b.hp/b.maxHp*100);}else ui.bossWrap?.classList.add("hidden");}

  function update(dt){game.elapsed+=dt;game.shake=Math.max(0,game.shake-38*dt);if(game.toastTimer>0){game.toastTimer-=dt;if(game.toastTimer<=0)ui.toast?.classList.remove("active");}if(game.state==="playing"){updatePlayer(dt);spawn();game.enemies.forEach(e=>!e.dead&&updateEnemy(e,dt));updateProjectiles(dt);updateDrops(dt);game.enemies=game.enemies.filter(e=>!e.dead);const target=clamp(game.player.x-W*.36,0,Math.max(0,WORLD_W-W));game.cameraX+=(target-game.cameraX)*Math.min(1,dt*6.5);}updateEffects(dt);updateUI();}

  function drawBackground(){const l=level(),g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,l.bg[0]);g.addColorStop(.6,l.bg[1]);g.addColorStop(1,l.bg[2]);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);for(let i=0;i<15;i++){const x=i*430-(game.cameraX*.2)%430;ctx.fillStyle=l.stone+"28";ctx.fillRect(x+70,120,76,Math.max(0,floorY-120));ctx.beginPath();ctx.arc(x+108,120,95,Math.PI,0);ctx.fill();}ctx.fillStyle=l.accent+"18";ctx.beginPath();ctx.arc(W*.8,H*.25,120+Math.sin(game.elapsed)*8,0,Math.PI*2);ctx.fill();}
  function drawPlatforms(){const l=level();for(const p of platforms()){const x=p.x-game.cameraX;if(x+p.w<-100||x>W+100)continue;ctx.fillStyle=p.floor?"#151a27":l.stone;ctx.fillRect(x,p.y,p.w,p.h);ctx.globalAlpha=p.floor?.8:.55;ctx.fillStyle=p.floor?l.stone:l.accent;ctx.fillRect(x,p.y,p.w,p.floor?12:6);ctx.globalAlpha=1;}}

  function drawPlayerFallback(p, c) {
    ctx.fillStyle = p.flash > 0 ? "#ff6680" : "#192138";
    ctx.fillRect(-16, -18, 32, 49);

    ctx.fillStyle = "#0b101b";
    ctx.fillRect(-15, 27, 10, 24);
    ctx.fillRect(5, 27, 10, 24);

    ctx.fillStyle = "#d8b9a6";
    ctx.beginPath();
    ctx.arc(0, -31, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#070b13";
    ctx.beginPath();
    ctx.arc(-2, -36, 15, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = c.color;
    ctx.font = "bold 16px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(c.icon, 0, -53);

    ctx.strokeStyle = WEAPONS[p.weaponIndex][2];
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(10, 2);
    ctx.lineTo(34, -9);
    ctx.stroke();
  }

  function drawPlayerImage(p) {
    const texture = CHARACTER_TEXTURES[p.classId];
    const settings = CHARACTER_IMAGES[p.classId];

    if (!texture?.ready || !texture.image || !settings) {
      return false;
    }

    const image = texture.image;
    const drawHeight = Math.max(40, Number(settings.height) || 122);
    const ratio = image.naturalWidth / image.naturalHeight;
    const drawWidth = drawHeight * ratio;

    // The origin is located at the player's feet. The source art should
    // face right; ctx.scale(p.facing, 1) flips it automatically when moving left.
    ctx.drawImage(
      image,
      -drawWidth / 2 + (Number(settings.offsetX) || 0),
      -drawHeight + (Number(settings.offsetY) || 0),
      drawWidth,
      drawHeight
    );

    return true;
  }

  function drawPlayer() {
    const p = game.player;
    const c = CLASSES[p.classId];
    const x = p.x - game.cameraX;

    ctx.save();
    ctx.translate(x + p.w / 2, p.y + p.h);
    ctx.scale(p.facing, 1);

    if (p.invuln > 0 && Math.floor(p.invuln * 20) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    // Class-colored aura under the character.
    ctx.fillStyle = c.color + "35";
    ctx.beginPath();
    ctx.ellipse(0, 0, 35, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    const usedImage = drawPlayerImage(p);

    if (!usedImage) {
      // Move the old vector character up because this origin is at the feet.
      ctx.save();
      ctx.translate(0, -p.h / 2);
      drawPlayerFallback(p, c);
      ctx.restore();
    }

    // Damage flash overlay remains visible on top of uploaded textures.
    if (usedImage && p.flash > 0) {
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.38;
      ctx.fillStyle = "#ff6680";
      ctx.fillRect(-42, -118, 84, 118);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }

    // Attack arcs are drawn over either the uploaded texture or fallback art.
    if (p.attackTimer > 0) {
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = p.attackType === "heavy" ? "#d28cff" : c.color;
      ctx.lineWidth = p.attackType === "heavy" ? 10 : 6;
      ctx.beginPath();
      ctx.arc(
        10,
        -p.h / 2,
        p.attackType === "heavy" ? 70 : 52,
        -1.2,
        0.85
      );
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawEnemy(e){const x=e.x-game.cameraX;if(x+e.w<-130||x>W+130)return;if(e.warning>0){ctx.fillStyle=`rgba(255,65,95,${.18+Math.sin(game.elapsed*25)*.08})`;ctx.fillRect(x-8,floorY-8,e.w+16,8);}ctx.save();ctx.translate(x+e.w/2,e.y+e.h/2);ctx.scale(e.facing,1);ctx.fillStyle=e.flash>0?"#fff":e.color;
    if(e.shape==="wolf"||e.shape==="drake"){ctx.fillRect(-e.w*.4,-e.h*.18,e.w*.68,e.h*.48);ctx.beginPath();ctx.moveTo(e.w*.2,-e.h*.2);ctx.lineTo(e.w*.46,-e.h*.35);ctx.lineTo(e.w*.42,e.h*.2);ctx.fill();if(e.shape==="drake"){ctx.beginPath();ctx.moveTo(-10,-15);ctx.lineTo(-42,-48);ctx.lineTo(8,-26);ctx.fill();}}
    else if(e.shape==="spider"){ctx.beginPath();ctx.ellipse(0,2,e.w*.32,e.h*.3,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=e.color;ctx.lineWidth=5;for(let s=-1;s<=1;s+=2)for(let l=0;l<3;l++){ctx.beginPath();ctx.moveTo(s*12,-2+l*7);ctx.lineTo(s*(28+l*4),-14+l*13);ctx.stroke();}}
    else if(e.shape==="wraith"){ctx.beginPath();ctx.moveTo(-e.w*.3,-e.h*.35);ctx.lineTo(e.w*.3,-e.h*.35);ctx.lineTo(e.w*.42,e.h*.35);ctx.lineTo(0,e.h*.18);ctx.lineTo(-e.w*.42,e.h*.35);ctx.closePath();ctx.fill();}
    else {ctx.fillRect(-e.w*.34,-e.h*.24,e.w*.68,e.h*.66);ctx.beginPath();ctx.arc(0,-e.h*.29,e.boss?29:e.type==="brute"?19:14,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle=e.boss?"#ffdb6a":"#ff5875";ctx.fillRect(4,-e.h*.31,e.boss?21:7,e.boss?5:3);ctx.restore();if(!e.boss){ctx.fillStyle="#0009";ctx.fillRect(x,e.y-10,e.w,5);ctx.fillStyle="#ff5a73";ctx.fillRect(x,e.y-10,e.w*clamp(e.hp/e.maxHp,0,1),5);}}

  function drawProjectile(q){const x=q.x-game.cameraX;ctx.save();ctx.globalCompositeOperation="lighter";ctx.fillStyle=q.color;ctx.shadowColor=q.color;ctx.shadowBlur=18;ctx.beginPath();ctx.ellipse(x+q.w/2,q.y+q.h/2,q.w/2,q.h/2,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  function drawDrop(d){const x=d.x-game.cameraX,color=d.type==="health"?"#ff6680":"#5ee7ff";ctx.save();ctx.translate(x+12,d.y+12);ctx.rotate(game.elapsed*2.5);ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=16;ctx.fillRect(-8,-8,16,16);ctx.restore();}
  function drawEffects(){for(const p of game.particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.fillRect(p.x-game.cameraX,p.y,p.size,p.size);}for(const t of game.texts){ctx.globalAlpha=clamp(t.life/t.max,0,1);ctx.font=`900 ${t.size}px system-ui`;ctx.textAlign="center";ctx.fillStyle=t.color;ctx.fillText(t.value,t.x-game.cameraX,t.y);}ctx.globalAlpha=1;}
  function render(){ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,W,H);const sx=game.shake?rand(-game.shake,game.shake):0,sy=game.shake?rand(-game.shake*.4,game.shake*.4):0;ctx.save();ctx.translate(sx,sy);drawBackground();drawPlatforms();game.drops.forEach(drawDrop);game.enemies.forEach(drawEnemy);game.projectiles.forEach(drawProjectile);if(game.player)drawPlayer();drawEffects();ctx.restore();}

  window.addEventListener("pointerdown", unlockAudio, { once: true });
  window.addEventListener("keydown", unlockAudio, { once: true });

  window.addEventListener("keydown",e=>{if(["ArrowLeft","ArrowRight","ArrowUp","Space"].includes(e.code))e.preventDefault();if(e.code==="KeyA"||e.code==="ArrowLeft")input.left=true;if(e.code==="KeyD"||e.code==="ArrowRight")input.right=true;if(e.repeat)return;if(e.code==="KeyW"||e.code==="ArrowUp")input.jump=true;if(e.code==="KeyJ")input.light=true;if(e.code==="KeyK")input.heavy=true;if(e.code==="Space")input.dash=true;if(e.code==="KeyQ")input.skill=true;});
  window.addEventListener("keyup",e=>{if(e.code==="KeyA"||e.code==="ArrowLeft")input.left=false;if(e.code==="KeyD"||e.code==="ArrowRight")input.right=false;});
  canvas.addEventListener("pointerdown",e=>{if(e.button===0)input.light=true;if(e.button===2)input.heavy=true;});canvas.addEventListener("contextmenu",e=>e.preventDefault());
  document.querySelectorAll("[data-hold]").forEach(b=>{const a=b.dataset.hold;b.addEventListener("pointerdown",e=>{e.preventDefault();input[a]=true;});["pointerup","pointercancel","pointerleave"].forEach(n=>b.addEventListener(n,e=>{e.preventDefault();input[a]=false;}));});
  document.querySelectorAll("[data-tap]").forEach(b=>b.addEventListener("pointerdown",e=>{e.preventDefault();const a=b.dataset.tap;if(a==="attack"||a==="lightAttack")input.light=true;else if(a==="heavyAttack")input.heavy=true;else input[a]=true;}));

  document.querySelectorAll("[data-stat]").forEach(b=>b.addEventListener("click",()=>{if(game.state!=="levelup")return;const s=b.dataset.stat,p=game.player;if(!(s in p.stats))return;p.stats[s]++;if(s==="vitality"){p.maxHp+=20;p.hp=p.maxHp;}if(s==="intelligence"){p.maxMp+=14;p.mp=p.maxMp;}ui.levelPanel?.classList.remove("active");game.state="playing";save();toast("ATTRIBUTE INCREASED",`${s.toUpperCase()} is now ${p.stats[s]}.`);}));

  ui.startBtn?.addEventListener("click",()=>{const s=load();if(s.classId&&confirm(`Continue saved ${CLASSES[s.classId].name} adventure?\n\nChoose Cancel to start a new adventure.`))continueAdventure();else showClasses();});
  ui.retryBtn?.addEventListener("click",()=>{ui.end?.classList.remove("active");if(game.state==="victory")restartScratch();else startLevel(true);});
  ui.wipeBtn?.addEventListener("click",()=>{localStorage.removeItem(SAVE);toast("SAVE ERASED","Adventure progress reset.");});
  window.addEventListener("resize",()=>{const old=floorY;resize();const d=floorY-old;if(game.player)game.player.y+=d;game.enemies.forEach(e=>e.y+=d);game.drops.forEach(x=>x.y+=d);});

  function loop(now){const dt=Math.min(.033,Math.max(0,(now-game.last)/1000));game.last=now;try{update(dt);render();}catch(err){console.error(err);game.state="gameover";if(ui.endTitle)ui.endTitle.textContent="SYSTEM ERROR";if(ui.endBody)ui.endBody.textContent=err.message;ui.end?.classList.add("active");}requestAnimationFrame(loop);}

  if(!ui.startBtn)showClasses();
  requestAnimationFrame(loop);
})();
