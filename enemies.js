// Enemy system using a base class + subclasses and a registry/factory.

class Enemy {
  constructor(type, x = 0, y = 0) {
    this.type = type || 'enemy';
    this.x = x;
    this.y = y;
    this.r = 14;
    this.speed = 60;
    this.hp = 1;
    this.shootTimer = 0;
    this._marked = false; // for removal
  }

  update(dt) {
    // default idle behaviour (override in subclasses)
  }

  draw(ctx) {
    // default draw (override)
    ctx.beginPath();
    ctx.fillStyle = '#999';
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
  }

  markForRemoval() { this._marked = true; }
  isRemoved() { return this._marked; }
}

/* Shooter enemy */
class ShooterEnemy extends Enemy {
  constructor(x, y) {
    super('shooter', x, y);
    this.r = rand(12, 18);
    this.speed = rand(30, 60);
    this.shootTimer = rand(0.4, 1.6);
  }

  update(dt) {
    // gentle homing
    const ax = player.x - this.x, ay = player.y - this.y;
    const d = Math.hypot(ax, ay) || 1;
    this.x += (ax / d) * (this.speed * 0.6) * dt;
    this.y += (ay / d) * (this.speed * 0.6) * dt;

    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      this.shootTimer = rand(0.6, 1.6);
      const dx = player.x - this.x, dy = player.y - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      const spd = rand(160, 260);
      spawnProjectile(this, (dx / dist) * spd, (dy / dist) * spd, false);
    }
  }

  draw(ctx) {
    ctx.beginPath(); ctx.fillStyle = '#d9534f'; ctx.arc(this.x, this.y, this.r, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#7b1f1a'; ctx.lineWidth = 2; ctx.stroke();
  }
}

/* Melee enemy */
class MeleeEnemy extends Enemy {
  constructor(x, y) {
    super('melee', x, y);
    this.r = rand(10, 14);
    this.speed = rand(100, 160);
    this.hp = 1;
  }

  update(dt) {
    const ax = player.x - this.x, ay = player.y - this.y;
    const d = Math.hypot(ax, ay) || 1;
    this.x += (ax / d) * this.speed * dt;
    this.y += (ay / d) * this.speed * dt;
    // collision handled in updateEnemies (or add here if you prefer)
  }

  draw(ctx) {
    ctx.beginPath(); ctx.fillStyle = '#f0ad4e'; ctx.arc(this.x, this.y, this.r, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#7b4a19'; ctx.lineWidth = 2; ctx.stroke();
  }
}

// Registry: map type -> class
const EnemyRegistry = {
  shooter: ShooterEnemy,
  melee: MeleeEnemy
};

// Factory to spawn by type (opts: x,y)
function spawnEnemyType(type = 'shooter', opts = {}) {
  const cls = EnemyRegistry[type] || Enemy;
  const x = typeof opts.x === 'number' ? opts.x : undefined;
  const y = typeof opts.y === 'number' ? opts.y : undefined;
  let e;
  if (typeof x === 'number' && typeof y === 'number') e = new cls(x, y);
  else {
    // spawn on random edge
    const edge = Math.floor(Math.random() * 4);
    let sx, sy;
    if (edge === 0) { sx = -30; sy = rand(0, H); }
    else if (edge === 1) { sx = W + 30; sy = rand(0, H); }
    else if (edge === 2) { sx = rand(0, W); sy = -30; }
    else { sx = rand(0, W); sy = H + 30; }
    e = new cls(sx, sy);
  }
  enemies.push(e);
  return e;
}

// Small helper: spawn random type
function spawnRandomEnemy() {
  spawnEnemyType(Math.random() < 0.75 ? 'shooter' : 'melee');
}

// Update and draw helpers (main.js calls these)
function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.update(dt);
    // remove offscreen safety
    if (e.x < -120 || e.x > W + 120 || e.y < -120 || e.y > H + 120) { enemies.splice(i, 1); continue; }
    // melee collision with player
    if (e.type === 'melee') {
      const dx = e.x - player.x, dy = e.y - player.y;
      if (Math.hypot(dx, dy) <= e.r + player.r) {
        spawnParticles(player.x, player.y, '#ff8b7a', 12);
        playHitSound();
        player.hp -= 1;
        enemies.splice(i, 1);
        if (player.hp <= 0) gameOver();
        score += 1;
        continue;
      }
    }
    if (e.isRemoved && e.isRemoved()) { enemies.splice(i, 1); }
  }
}

function drawEnemies(ctx) {
  for (const e of enemies) e.draw(ctx);
}

// export / helper to clear enemies for room transitions
function clearEnemies() { enemies.length = 0; }