// Player state + update logic (kept as globals for simplicity)

const player = {
  x: 0, // will be positioned by main.js (restart/resize)
  y: 0,
  r: 20,
  speed: 260, // px / s
  shield: false,
  hp: 3,
  shootCooldown: 0,
  shootCooldownMax: 0.28 // seconds
};

// Update only the player position and return how far the player moved this frame.
// Depends on globals: keys, W, H.
function updatePlayer(dt){
  const prevX = player.x, prevY = player.y;
  // player movement
  let dx=0, dy=0;
  if(keys['arrowup']||keys['w']) dy -= 1;
  if(keys['arrowdown']||keys['s']) dy += 1;
  if(keys['arrowleft']||keys['a']) dx -= 1;
  if(keys['arrowright']||keys['d']) dx += 1;
  const len = Math.hypot(dx,dy) || 1;
  player.x += (dx/len) * player.speed * dt;
  player.y += (dy/len) * player.speed * dt;
  player.x = Math.max(0, Math.min(W, player.x));
  player.y = Math.max(0, Math.min(H, player.y));

  // shield toggle (Space)
  if(keys[' ']){ player.shield = true; } else { player.shield = false; }

  // NOTE: cooldown now only advances when the player actually moves
  const moved = Math.hypot(player.x - prevX, player.y - prevY);
  if(moved > 0 && player.shootCooldown > 0){
    player.shootCooldown = Math.max(0, player.shootCooldown - dt);
  }

  return moved;
}