// Enemy module (shooter + melee). Relies on globals: enemies, projectiles, spawnProjectile, spawnParticles, rand, playBlockSound, playHitSound, player, score

class Enemy {
  constructor(type, x, y){
    this.type = type || 'shooter';
    this.x = x;
    this.y = y;
    this.r = (this.type === 'melee') ? rand(10,18) : rand(12,28);
    this.shootTimer = rand(0.3, 1.5);
    this.speed = (this.type === 'melee') ? rand(80,140) : rand(60, 90);
    this.hp = (this.type === 'melee') ? 1 : 1;
  }
  update(dt){
    // simple homing
    const ax = player.x - this.x, ay = player.y - this.y;
    const d = Math.hypot(ax,ay)||1;
    this.x += (ax/d) * this.speed * dt;
    this.y += (ay/d) * this.speed * dt;

    if(this.type === 'shooter'){
      this.shootTimer -= dt;
      if(this.shootTimer <= 0){
        this.shootTimer = rand(0.6,1.6);
        const vx = (player.x - this.x) / Math.hypot(player.x-this.x, player.y-this.y) * rand(160,260);
        const vy = (player.y - this.y) / Math.hypot(player.x-this.x, player.y-this.y) * rand(160,260);
        spawnProjectile(this, vx, vy); // enemy projectile
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

// factory to spawn an enemy (type: 'shooter' | 'melee' optional)
function spawnEnemyType(type){
  // spawn at random edge
  const edge = Math.floor(Math.random()*4);
  let x,y;
  if(edge===0){ x = -30; y = rand(0,H); }
  if(edge===1){ x = W+30; y = rand(0,H); }
  if(edge===2){ x = rand(0,W); y = -30; }
  if(edge===3){ x = rand(0,W); y = H+30; }
  enemies.push(new Enemy(type, x, y));
}

// update all enemies, handle melee collisions with player and removal (returns nothing)
function updateEnemies(dt){
  for(let i = enemies.length - 1; i >= 0; i--){
    const e = enemies[i];
    e.update(dt);

    // remove offscreen (safety)
    if(e.x < -60 || e.x > W+60 || e.y < -60 || e.y > H+60){
      enemies.splice(i,1);
      continue;
    }

    // melee damage when close
    if(e.type === 'melee'){
      const dx = e.x - player.x, dy = e.y - player.y;
      if(Math.hypot(dx,dy) <= e.r + player.r){
        // hit player
        spawnParticles(player.x, player.y, '#ff8b7a', 10);
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

// draw all enemies (call from draw())
function drawEnemies(ctx){
  for(const e of enemies) e.draw(ctx);
}

// simple weighted spawn: mostly shooters, some melee
function spawnRandomEnemy(){
  // 75% shooter, 25% melee
  spawnEnemyType(Math.random() < 0.75 ? 'shooter' : 'melee');
}