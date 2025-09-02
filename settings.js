// Settings module — moves settings UI + persistence out of main.js

// exported globals used by main.js: soundOn, particlesEnabled, loadSettings, saveSettings, applyDifficulty, openSettings, closeSettings

let soundOn = true;
let particlesEnabled = true;
const SETTINGS_KEY = 'shapes_shields_settings_v1';

// UI elements (may be null if not present in DOM)
const btnSound = document.getElementById('btnSound');
const btnSettings = document.getElementById('btnSettings');
const settingsPanel = document.getElementById('settingsPanel');
const settingsSoundToggle = document.getElementById('settingsSoundToggle');
const settingsVolume = document.getElementById('settingsVolume');
const settingsParticles = document.getElementById('settingsParticles');
const settingsDifficulty = document.getElementById('settingsDifficulty');
const settingsSave = document.getElementById('settingsSave');
const settingsReset = document.getElementById('settingsReset');
const settingsClose = document.getElementById('settingsClose');

function loadSettings(){
  try{
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    if (typeof s.soundOn === 'boolean') soundOn = s.soundOn;
    if (typeof s.volume === 'number' && typeof masterGain !== 'undefined' && masterGain) masterGain.gain.value = s.volume;
    if (typeof s.particlesEnabled === 'boolean') particlesEnabled = s.particlesEnabled;
    if (typeof s.difficulty === 'string') applyDifficulty(s.difficulty);

    // update UI labels
    if (btnSound) btnSound.textContent = `Sound: ${soundOn? 'On':'Off'}`;
    if (settingsSoundToggle) settingsSoundToggle.textContent = `Sound: ${soundOn? 'On':'Off'}`;
    if (settingsVolume && typeof masterGain !== 'undefined' && masterGain) settingsVolume.value = masterGain.gain.value;
    if (settingsParticles) settingsParticles.checked = !!particlesEnabled;
    return s;
  }catch(e){ return {}; }
}

function saveSettings(obj){
  try{ localStorage.setItem(SETTINGS_KEY, JSON.stringify(obj)); }catch(e){}
}

function applyDifficulty(level){
  if (level === 'easy') spawnInterval = 2.6;
  else if (level === 'normal') spawnInterval = 2.0;
  else if (level === 'hard') spawnInterval = 1.2;
}

// settings panel controls
function openSettings(){
  if (settingsPanel) settingsPanel.classList.remove('hidden');
  if (settingsSoundToggle) settingsSoundToggle.textContent = `Sound: ${soundOn? 'On':'Off'}`;
  if (settingsVolume && typeof masterGain !== 'undefined' && masterGain) settingsVolume.value = masterGain.gain.value || 0.12;
  if (settingsParticles) settingsParticles.checked = !!particlesEnabled;
}
function closeSettings(){ if (settingsPanel) settingsPanel.classList.add('hidden'); }

// wire UI listeners (guard for missing elements)
if (btnSound) {
  btnSound.addEventListener('click', ()=>{
    soundOn = !soundOn;
    btnSound.textContent = `Sound: ${soundOn? 'On':'Off'}`;
  });
}
if (btnSettings) btnSettings.addEventListener('click', ()=> openSettings());
if (settingsSoundToggle) settingsSoundToggle.addEventListener('click', ()=>{
  soundOn = !soundOn;
  settingsSoundToggle.textContent = `Sound: ${soundOn? 'On':'Off'}`;
});
if (settingsClose) settingsClose.addEventListener('click', ()=> closeSettings());
if (settingsReset) settingsReset.addEventListener('click', ()=>{
  soundOn = true; particlesEnabled = true; applyDifficulty('normal');
  if (typeof masterGain !== 'undefined' && masterGain) masterGain.gain.value = 0.12;
  openSettings();
});
if (settingsSave) settingsSave.addEventListener('click', ()=>{
  const s = {
    soundOn,
    volume: Number(settingsVolume ? settingsVolume.value : (masterGain? masterGain.gain.value : 0.12)),
    particlesEnabled: !!(settingsParticles && settingsParticles.checked),
    difficulty: settingsDifficulty ? settingsDifficulty.value : 'normal'
  };
  if (typeof masterGain !== 'undefined' && masterGain) masterGain.gain.value = s.volume;
  particlesEnabled = s.particlesEnabled;
  applyDifficulty(s.difficulty);
  saveSettings(s);
  closeSettings();
});

// expose functions/vars globally (already global by declarations)