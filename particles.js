// particle system moved out of main.js
// Depends on global `particlesEnabled` (from settings.js)

let particles = [];

function spawnParticles(x, y, color, count = 12){
  if(!particlesEnabled) return;
  for(let i = 0; i < count; i++){
    const ang = Math.random() * Math.PI * 2;
    const speed = Math.random() * 260 + 60;
    particles.push({
      x,
      y,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      r: Math.random() * 3 + 1,
      life: Math.random() * 0.7 + 0.4,
      color
    });
    if(particles.length > 800) particles.shift();
  }
}

function updateParticles(dt){
  for(let i = particles.length - 1; i >= 0; i--){
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 300 * dt; // gravity
    p.life -= dt;
    p.r *= 0.96;
    if(p.life <= 0 || p.r < 0.2) particles.splice(i, 1);
  }
}

function drawParticles(){
  for(const p of particles){
    ctx.beginPath();
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life / 1.2);
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}