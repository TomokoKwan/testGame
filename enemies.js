// Enemy module (shooter + melee). Relies on globals: enemies, projectiles, spawnProjectile, spawnParticles, rand, playBlockSound, playHitSound, player, score, gameOver

class Enemy {
  constructor(type, x, y){
    this.type = type || 'shooter';
    this.x = x || 0;
    this.y = y || 0;
    this.r = (this.type === 'melee') ? rand(10,16) : rand(12,20);
    this.shootTimer = rand(0.3, 1.5);
    this.speed = (this.type === 'melee') ? rand(80,140) : rand(40, 80);
    this.hp = (this.type === 'melee') ? 1 : 1;
    this._aggro = 0; // optional internal state
  }

  update(dt){
    // simple homing movement for both types (melee move faster)
    const ax = player.x - this.x;
    const ay = player.y - this.y;
    const d = Math.hypot(ax, ay) || 1;
    const moveSpeed = this.type === 'melee' ? this.speed : this.speed * 0.75;
    this.x += (ax / d) * moveSpeed * dt;
    this.y += (ay / d) * moveSpeed * dt;

    if(this.type === 'shooter'){
      this.shootTimer -= dt;
      if(this.shootTimer <= 0){
        this.shootTimer = rand(0.6,1.6);
        // shoot towards player
        const dx = player.x - this.x, dy = player.y - this.y;
        const dist = Math.hypot(dx,dy) || 1;
        const speed = rand(160, 260);
        const vx = (dx / dist) * speed;
        const vy = (dy / dist) * speed;
        // spawn enemy projectile (friendly = false)
        spawnProjectile(this, vx, vy, false);
      }
    }
  }

  draw(ctx){
    if(this.type === 'melee'){
      ctx.beginPath(); ctx.fillStyle = '#f0ad4e'; ctx.arc(this.x,this.y,this.r,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#7b4a19'; ctx.lineWidth = 2; ctx.stroke();
    } else {
      ctx.beginPath(); ctx.fillStyle = '#d9534f'; ctx.arc(this.x,this.y,this.r,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#7b1f1a'; ctx.lineWidth = 2; ctx.stroke();
    }
  }
}

// spawn at random edge or within a bounding rect
function spawnEnemyType(type, opts = {}){
  let x = opts.x, y = opts.y;
  if(typeof x === 'undefined' || typeof y === 'undefined'){
    const edge = Math.floor(Math.random()*4);
    if(edge===0){ x = -30; y = rand(0,H); }
    else if(edge===1){ x = W+30; y = rand(0,H); }
    else if(edge===2){ x = rand(0,W); y = -30; }
    else { x = rand(0,W); y = H+30; }
  }
  enemies.push(new Enemy(type, x, y));
}

// simple weighted spawn: mostly shooters, some melee
function spawnRandomEnemy(){
  spawnEnemyType(Math.random() < 0.75 ? 'shooter' : 'melee');
}

// update enemies (handle melee collision with player, remove offscreen)
function updateEnemies(dt){
  for(let i = enemies.length - 1; i >= 0; i--){
    const e = enemies[i];
    e.update(dt);

    // remove offscreen safety
    if(e.x < -80 || e.x > W+80 || e.y < -80 || e.y > H+80){
      enemies.splice(i,1);
      continue;
    }

    // melee enemy collides with player
    if(e.type === 'melee'){
      const dx = e.x - player.x, dy = e.y - player.y;
      if(Math.hypot(dx,dy) <= e.r + player.r){
        // damage player and remove enemy
        spawnParticles(player.x, player.y, '#ff8b7a', 12);
        playHitSound();
        player.hp -= 1;
        if(player.hp <= 0) gameOver();
        enemies.splice(i,1);
        score += 1;
        continue;
      }
    }
  }
}

// draw all enemies
function drawEnemies(ctx){
  for(const e of enemies) e.draw(ctx);
}

// optional helper to clear enemies (used by room transitions)
function clearEnemies(){
  enemies.length = 0;
}