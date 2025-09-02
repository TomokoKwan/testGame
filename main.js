// Simple shapes-and-shields demo
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W, H;
function resize() { W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
addEventListener('resize', resize); resize();

let keys = {};
addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; if(e.code==='Space') e.preventDefault(); });
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

// Enemies are circles that occasionally shoot at player
let enemies = [];
let projectiles = [];
let lastTime = performance.now();
let spawnTimer = 0; let spawnInterval = 2.0; // seconds
let score = 0;

// rounded rect helper used by cooldown HUD
function roundRect(ctx, x, y, w, h, r){
  const rad = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

// Simple WebAudio helpers (oscillator + envelope)
let audioCtx = null; let masterGain = null;
function ensureAudio(){ if(audioCtx) return; audioCtx = new (window.AudioContext||window.webkitAudioContext)(); masterGain = audioCtx.createGain(); masterGain.gain.value = 0.12; masterGain.connect(audioCtx.destination); }
function playBeep(freq, type='sine', duration=0.08, vol=1.0){
  if(!soundOn) return; try{ ensureAudio(); const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); o.type = type; o.frequency.value = freq; g.gain.value = vol; o.connect(g); g.connect(masterGain); const now = audioCtx.currentTime; g.gain.setValueAtTime(vol, now); g.gain.exponentialRampToValueAtTime(0.001, now + duration); o.start(now); o.stop(now + duration + 0.02);
  }catch(e){}
}
function playNoise(duration=0.12, vol=1.0){ if(!soundOn) return; try{ ensureAudio(); const bufferSize = audioCtx.sampleRate * duration; const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate); const data = buffer.getChannelData(0); for(let i=0;i<bufferSize;i++) data[i] = (Math.random()*2-1) * Math.exp(-i/bufferSize*6); const src = audioCtx.createBufferSource(); src.buffer = buffer; const g = audioCtx.createGain(); g.gain.value = vol; src.connect(g); g.connect(masterGain); src.start(); src.stop(audioCtx.currentTime + duration);
  }catch(e){}
}
function playBlockSound(){ playBeep(900, 'sine', 0.06, 0.9); }
function playHitSound(){ playNoise(0.15, 0.18); playBeep(220, 'triangle', 0.12, 0.6); }
function playGameOverSound(){ playBeep(120, 'sawtooth', 0.6, 0.8); playNoise(0.4, 0.25); }

function rand(min,max){ return Math.random()*(max-min)+min }

// spawnProjectile remains in main.js
function spawnProjectile(from, vx, vy){
  // default enemy projectile; friendly flag optional
  const friendly = arguments.length >= 4 ? arguments[3] : false;
  const color = friendly ? '#ffffff' : '#ffd54f';
  const r = friendly ? 7 : 6;
  // store projectiles with a color and size; no immediate prev pos required (tail computed at draw)
  projectiles.push({ x: from.x, y: from.y, r, vx, vy, friendly, color });
}

// Update the world (enemies, projectiles, spawning) using a scaled dt
function updateWorld(dt){
  // enemies
  spawnTimer += dt;
  if(spawnTimer >= spawnInterval){
    spawnTimer = 0;
    // spawn delegated to enemies.js
    spawnRandomEnemy();
    if(spawnInterval > 0.7) spawnInterval *= 0.985;
  }

  // delegate enemy updates to enemies.js
  updateEnemies(dt);

  // projectiles (only enemy projectiles are handled here; friendly projectiles are updated every frame)
  for(let i=projectiles.length-1;i>=0;i--){
    const p = projectiles[i];
    if(p.friendly) continue; // friendly handled by updateFriendlyProjectiles
    p.x += p.vx * dt; p.y += p.vy * dt;
    // remove offscreen
    if(p.x < -50 || p.x > W+50 || p.y < -50 || p.y > H+50){ projectiles.splice(i,1); continue; }

    // enemy projectile behavior
    // collision with shield
    if(player.shield){
      const dx = p.x - player.x; const dy = p.y - player.y; const d = Math.hypot(dx,dy);
      const shieldRadius = player.r*2.2;
      if(d <= shieldRadius + p.r){
        // block
        spawnParticles(p.x, p.y, 'rgba(80,200,255,0.95)', 10);
        playBlockSound();
        projectiles.splice(i,1);
        score += 1;
        continue;
      }
    }
    // collision with player (approximate triangle as circle)
    const dx2 = p.x - player.x; const dy2 = p.y - player.y; const d2 = Math.hypot(dx2,dy2);
    if(d2 <= player.r + p.r){
      // hit player
      spawnParticles(player.x + (dx2*0.5), player.y + (dy2*0.5), '#ff8b7a', 18);
      playHitSound();
      projectiles.splice(i,1);
      player.hp -= 1;
      if(player.hp <= 0) gameOver();
      continue;
    }
  }
  // advance friendly projectiles along with world time
  updateFriendlyProjectiles(dt);
}

// Advance friendly projectiles every frame so player's shots travel while world time is paused
function updateFriendlyProjectiles(dt){
  for(let i=projectiles.length-1;i>=0;i--){
    const p = projectiles[i];
    if(!p.friendly) continue;
    p.x += p.vx * dt; p.y += p.vy * dt;
    // remove offscreen
    if(p.x < -50 || p.x > W+50 || p.y < -50 || p.y > H+50){ projectiles.splice(i,1); continue; }
    // check collision with enemies
    for(let j=enemies.length-1;j>=0;j--){
      const e = enemies[j];
      const dx = p.x - e.x, dy = p.y - e.y;
      if(Math.hypot(dx,dy) <= e.r + p.r){
        spawnParticles(e.x, e.y, '#ff6b5a', 14);
        playHitSound();
        projectiles.splice(i,1);
        enemies.splice(j,1);
        score += 2;
        break;
      }
    }
  }
}

let running = true;
function gameOver(){ running = false; playGameOverSound(); spawnParticles(player.x, player.y, '#ffffff', 60); }

function draw(){
  // background
  ctx.fillStyle = '#0b0b0d'; ctx.fillRect(0,0,W,H);

  // particles behind scene
  drawParticles();

  // draw enemies (delegate to enemies.js when available)
  if(typeof drawEnemies === 'function'){
    drawEnemies(ctx);
  } else {
    enemies.forEach(e=>{
      ctx.beginPath(); ctx.fillStyle = '#d9534f'; ctx.arc(e.x,e.y,e.r,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#7b1f1a'; ctx.lineWidth = 2; ctx.stroke();
    });
  }

  // draw projectiles
  projectiles.forEach(p=>{
    const col = p.color || '#ffd54f';
    // small motion-tail to visualize travel
    const speed = Math.hypot(p.vx||0, p.vy||0) || 1;
    const tailLen = Math.min(18, speed * 0.03);
    ctx.beginPath(); ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, p.r*0.25); ctx.globalAlpha = 0.9;
    ctx.moveTo(p.x - (p.vx/speed)*tailLen, p.y - (p.vy/speed)*tailLen);
    ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.globalAlpha = 1;
    // projectile body
    ctx.beginPath(); ctx.fillStyle = col; ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
  });

  // draw shield if active
  if(player.shield){ ctx.beginPath(); ctx.strokeStyle = 'rgba(80,200,255,0.9)'; ctx.lineWidth = 4; ctx.arc(player.x, player.y, player.r*2.2, 0, Math.PI*2); ctx.stroke(); }

  // draw player (triangle oriented toward mouse?) simple static triangle
  ctx.save(); ctx.translate(player.x, player.y);
  ctx.fillStyle = '#5cb85c'; ctx.strokeStyle = '#2f6f2f'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -player.r); ctx.lineTo(player.r, player.r); ctx.lineTo(-player.r, player.r); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();

  // HUD
  const hud = document.getElementById('hud'); hud.textContent = `HP: ${player.hp} · Score: ${score} · Enemies: ${enemies.length}`;

  // shoot cooldown indicator (bottom center) - bullet style with centered tail and offset circle
  (function drawCooldown(){
    const max = player.shootCooldownMax || 0.28;
    const remaining = Math.max(0, player.shootCooldown);
    const ratio = max > 0 ? Math.max(0, Math.min(1, 1 - remaining / max)) : 1;

    const size = 46;
    const cx = Math.round(W / 2);
    const cy = Math.round(H - 38);
    const radius = size / 2;

    const innerRadius = 4;     // small white bullet (halved from 6 -> 3)
    const ringWidth = 3;       // thin ring
    const ringRadius = radius - ringWidth/2;

    // ring background (thin)
    ctx.beginPath();
    ctx.lineWidth = ringWidth;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    // progress arc (clockwise from top)
    const start = -Math.PI / 2;
    const end = start + ratio * Math.PI * 2;
    ctx.beginPath();
    ctx.lineWidth = ringWidth;
    ctx.lineCap = 'round';
    ctx.strokeStyle = ratio >= 1 ? '#5cb85c' : '#ffd54f';
    ctx.arc(cx, cy, ringRadius, start, end, false);
    ctx.stroke();

    // offset the bullet circle slightly up-right so the combined shape feels centered in the ring
    const offsetDist = 4; // pixels to move the small circle toward up-right
    const offsetAngle = -Math.PI/4; // up-right
    const bx = cx + Math.cos(offsetAngle) * offsetDist;
    const by = cy + Math.sin(offsetAngle) * offsetDist;

    // bullet-like center (small white solid circle) drawn at offset position
    ctx.beginPath();
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 1;
    ctx.arc(bx, by, innerRadius, 0, Math.PI * 2);
    ctx.fill();

    // bottom-left small line (removed up-right trailing tail)
    (function drawBottomLeft(){
      const color = '#fff';
      const angleBL = 3 * Math.PI / 4; // 135° -> down-left
      const bxh = Math.cos(angleBL);
      const byh = Math.sin(angleBL);
      const blStart = innerRadius;   // start at circle edge
      const blLen = 6;               // shorter small line
      const bsx = bx + bxh * blStart;
      const bsy = by + byh * blStart;
      const bex = bx + bxh * (blStart + blLen);
      const bey = by + byh * (blStart + blLen);
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.moveTo(bsx, bsy);
      ctx.lineTo(bex, bey);
      ctx.stroke();
    })();

    // countdown number below the ring
    ctx.fillStyle = '#fff';
    ctx.font = '12px Segoe UI, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const label = remaining > 0 ? remaining.toFixed(2) : '0.00';
    ctx.fillText(label, cx, cy + ringRadius + 6);

    ctx.globalAlpha = 1;
  })();

  if(!running){
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle = '#fff'; ctx.textAlign='center'; ctx.font = '36px Segoe UI, Arial'; ctx.fillText('Game Over', W/2, H/2 - 20);
    ctx.font = '18px Segoe UI, Arial'; ctx.fillText(`Score: ${score} · Press R to restart`, W/2, H/2 + 14);
  }
}

function loop(now){
  const dt = Math.min(0.05, (now - lastTime)/1000);
  lastTime = now;
  if(running){
    // update player always; world only advances when player moves
    const moved = updatePlayer(dt);
    // map movement distance to world time; tweak multiplier for feel
    const timeScale = 0.02; // seconds of world time per pixel moved
    const worldDt = Math.min(0.05, moved * timeScale);
    if(worldDt > 0){
      updateWorld(worldDt);
      updateParticles(worldDt);
    }
    
  }
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

addEventListener('keydown', e => {
  if(e.key.toLowerCase()==='r') restart();
});

function restart(){ enemies = []; projectiles = []; player.x = W/2; player.y = H/2; player.hp = 3; player.shootCooldown = 0; score = 0; spawnInterval = 2.0; spawnTimer = 0; running = true; }

// mouse follow disabled — player movement controlled only by keyboard/touch
addEventListener('mousemove', e => { /* intentionally disabled to prevent mouse control */ });

// click to shoot (left mouse)
addEventListener('mousedown', e => {
  if(!running) return;
  // only left button
  if(e.button !== 0) return;
  // simple firing rate
  if(player.shootCooldown > 0) return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left; const my = e.clientY - rect.top;
  const dx = mx - player.x, dy = my - player.y; const dist = Math.hypot(dx,dy) || 1;
  const speed = 520;
  const vx = (dx/dist) * speed; const vy = (dy/dist) * speed;
  spawnProjectile(player, vx, vy, true);
  playBeep(1200, 'sine', 0.06, 0.9);
  player.shootCooldown = player.shootCooldownMax;
});

// touch support: tap to toggle shield (ignored when not running)
addEventListener('touchstart', e => { if(!running) return; player.shield = true; });
addEventListener('touchend', e => { if(!running) return; player.shield = false; });

// touch tap to shoot (if short tap)
addEventListener('touchcancel', ()=>{});
addEventListener('touchstart', e => {
  // prevent duplicate handling; we'll handle shooting on touchend for taps
});
addEventListener('touchend', e => {
  if(!running) return;
  const t = e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  const mx = t.clientX - rect.left; const my = t.clientY - rect.top;
  const dx = mx - player.x, dy = my - player.y; const dist = Math.hypot(dx,dy) || 1;
  if(player.shootCooldown > 0) return;
  const speed = 520;
  const vx = (dx/dist) * speed; const vy = (dy/dist) * speed;
  spawnProjectile(player, vx, vy, true);
  playBeep(1200, 'sine', 0.06, 0.9);
  player.shootCooldown = player.shootCooldownMax;
});

// --- Main menu wiring (deferred until DOM is ready) ---
document.addEventListener('DOMContentLoaded', () => {
  const mainMenu = document.getElementById('mainMenu');
  const btnStart = document.getElementById('btnStart');
  const btnInstructions = document.getElementById('btnInstructions');
  const btnFullscreen = document.getElementById('btnFullscreen');
  const btnSound = document.getElementById('btnSound');
  const menuMsg = document.getElementById('menuMsg');
  const ui = document.getElementById('ui');

  function showMainMenu(msg){
    if(msg && menuMsg) menuMsg.textContent = msg;
    if(mainMenu) mainMenu.classList.remove('hidden');
    if(canvas) canvas.style.display = 'none';
    if(ui) ui.style.display = 'none';
    running = false;
  }

  function hideMainMenu(){
    if(mainMenu) mainMenu.classList.add('hidden');
    if(menuMsg) menuMsg.textContent = '';
    if(canvas) canvas.style.display = '';
    if(ui) ui.style.display = '';
    running = true;
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  // wire buttons
  if (btnStart) btnStart.addEventListener('click', () => { hideMainMenu(); restart(); });
  if (btnInstructions) btnInstructions.addEventListener('click', () => { showMainMenu('Move with WASD or arrows. Hold Space to shield. Restart with R.'); });
  if (btnFullscreen) btnFullscreen.addEventListener('click', async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch (e) { /* ignore */ }
  });
  if (btnSound) btnSound.addEventListener('click', () => {
    // settings.js also manages sound state — toggle local label for immediate feedback
    if (typeof soundOn === 'boolean') soundOn = !soundOn;
    btnSound.textContent = `Sound: ${typeof soundOn !== 'undefined' && soundOn ? 'On' : 'Off'}`;
  });

  // load settings (settings.js is loaded from HTML)
  if (typeof loadSettings === 'function') loadSettings();
  if (btnSound) btnSound.textContent = `Sound: ${typeof soundOn !== 'undefined' && soundOn ? 'On' : 'Off'}`;

  // ensure menu state on DOM ready
  showMainMenu();
});