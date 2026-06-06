const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const SAVE_KEY = 'hunter_save_v4';

let gameState = {
    isPlaying: false,
    isPaused: false,
    money: 0,
    timeLeft: 60,
    lastTime: 0,
    spawnTimer: 0,
    ownedWeapons: [0],
    upgrades: {
        spawnSpeed: 0,
        lootDrop: 0,
        valueMult: 0
    }
};

let inventory = { rabbit: 0, deer: 0, boar: 0, bear: 0, fox: 0, wolf: 0, elk: 0, bison: 0, bear_boss: 0, dragon_boss: 0 };
let currentLevelIdx = 0;
let unlockedLevels = [true, false, false, false, false, false];
let currentWeaponIdx = 0;
let weaponUpgrades = 0;

const LEVELS = [
    { id: 0, name: "🌲 Лесная опушка", desc: "Зайцы и олени", cost: 0, animals: ["rabbit", "deer"], bg1: "#1a2f1a", bg2: "#0d1a0d" },
    { id: 1, name: "🌳 Густой лес", desc: "Добавились кабаны и лисы", cost: 500, animals: ["rabbit", "deer", "boar", "fox"], bg1: "#142814", bg2: "#081408" },
    { id: 2, name: "⛰️ Горы", desc: "Волки и лоси", cost: 1500, animals: ["deer", "boar", "wolf", "elk"], bg1: "#2c3e50", bg2: "#1a252f" },
    { id: 3, name: "❄️ Тайга", desc: "Медведи и зубры", cost: 3000, animals: ["boar", "wolf", "elk", "bear", "bison"], bg1: "#0f1510", bg2: "#050805" },
    { id: 4, name: "🌋 Вулкан", desc: "Опасные боссы", cost: 6000, animals: ["wolf", "bear", "bear_boss"], bg1: "#2b1100", bg2: "#1a0a00" },
    { id: 5, name: "🏰 Древние руины", desc: "Легендарные трофеи", cost: 12000, animals: ["elk", "bison", "dragon_boss"], bg1: "#1a1a2e", bg2: "#0f0f1a" }
];

const ANIMAL_TYPES = {
    rabbit: { emoji: '🐇', name: 'Заяц', price: 15, radius: 25, speed: 5, hp: 1, isBoss: false, color: '#ddd' },
    deer:   { emoji: '🦌', name: 'Олень', price: 40, radius: 40, speed: 3, hp: 1, isBoss: false, color: '#8b4513' },
    boar:   { emoji: '🐗', name: 'Кабан', price: 60, radius: 38, speed: 4, hp: 2, isBoss: false, color: '#4a3728' },
    bear:   { emoji: '🐻', name: 'Медведь', price: 150, radius: 55, speed: 2, hp: 3, isBoss: false, color: '#2c1b18' },
    fox:    { emoji: '🦊', name: 'Лиса', price: 80, radius: 30, speed: 6, hp: 1, isBoss: false, color: '#d35400' },
    wolf:   { emoji: '🐺', name: 'Волк', price: 100, radius: 42, speed: 5, hp: 2, isBoss: false, color: '#7f8c8d' },
    elk:    { emoji: '🫎', name: 'Лось', price: 120, radius: 50, speed: 3, hp: 3, isBoss: false, color: '#5d4037' },
    bison:  { emoji: '🐃', name: 'Зубр', price: 200, radius: 60, speed: 2, hp: 4, isBoss: false, color: '#3e2723' },
    bear_boss: { emoji: '🐻‍❄️', name: 'Белый Медведь (БОСС)', price: 1000, radius: 90, speed: 1.5, hp: 8, isBoss: true, color: '#e0f7fa' },
    dragon_boss: { emoji: '🐉', name: 'Дракон (БОСС)', price: 5000, radius: 110, speed: 2.5, hp: 15, isBoss: true, color: '#ff1744' }
};

const WEAPONS = [
    { id: 0, name: 'Пневматика', price: 0, baseMag: 8, baseSway: 1.2, baseReload: 1000, damage: 1 },
    { id: 1, name: 'Охотничье ружье', price: 300, baseMag: 2, baseSway: 0.8, baseReload: 1500, damage: 3 },
    { id: 2, name: 'Винтовка Мосина', price: 800, baseMag: 5, baseSway: 0.5, baseReload: 1200, damage: 1 },
    { id: 3, name: 'Дробовик', price: 1500, baseMag: 6, baseSway: 1.5, baseReload: 1800, damage: 4 },
    { id: 4, name: 'Снайперская AWP', price: 3000, baseMag: 3, baseSway: 0.2, baseReload: 2000, damage: 5 },
    { id: 5, name: 'Пулемет', price: 6000, baseMag: 30, baseSway: 2.0, baseReload: 3000, damage: 1 }
];

let ammo = 8;
let maxAmmo = 8;
let isReloading = false;

let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let scope = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let recoil = { x: 0, y: 0 };
let sway = { x: 0, y: 0, time: 0 };

let isHoldingFire = false;
let isLocked = false;
let lockOnTarget = null;
let canLockOn = true;

let targets = [];
let particles = [];
let floatingTexts = [];
let audioCtx = null;

function getCurrentWeaponStats() {
    const base = WEAPONS[currentWeaponIdx];
    const mag = base.baseMag + Math.floor(weaponUpgrades / 2);
    const sway = Math.max(0.1, base.baseSway * Math.pow(0.85, weaponUpgrades));
    const reload = Math.max(500, base.baseReload - (weaponUpgrades * 100));
    const damage = base.damage + Math.floor(weaponUpgrades / 3);
    return { ...base, mag, sway, reload, damage };
}

function saveGame() {
    const saveData = {
        money: gameState.money,
        inventory: inventory,
        currentWeaponIdx: currentWeaponIdx,
        ownedWeapons: gameState.ownedWeapons,
        weaponUpgrades: weaponUpgrades,
        currentLevelIdx: currentLevelIdx,
        unlockedLevels: unlockedLevels,
        upgrades: gameState.upgrades
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
}

function loadGame() {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
        try {
            const data = JSON.parse(saved);
            gameState.money = data.money || 0;
            const defaultInv = { rabbit: 0, deer: 0, boar: 0, bear: 0, fox: 0, wolf: 0, elk: 0, bison: 0, bear_boss: 0, dragon_boss: 0 };
            inventory = { ...defaultInv, ...(data.inventory || {}) };
            currentWeaponIdx = data.currentWeaponIdx !== undefined ? data.currentWeaponIdx : 0;
            gameState.ownedWeapons = data.ownedWeapons || [0];
            weaponUpgrades = data.weaponUpgrades || 0;
            currentLevelIdx = data.currentLevelIdx || 0;
            unlockedLevels = data.unlockedLevels || [true, false, false, false, false, false];
            gameState.upgrades = data.upgrades || { spawnSpeed: 0, lootDrop: 0, valueMult: 0 };
        } catch(e) {
            console.error("Ошибка загрузки:", e);
        }
    }
}

function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSound(type) {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    if (type === 'shoot') {
        const bufferSize = audioCtx.sampleRate * 0.25;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
        noise.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
        noise.start(t);
    } else if (type === 'lock') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.linearRampToValueAtTime(1200, t + 0.08);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.08);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(t); osc.stop(t + 0.08);
    } else if (type === 'hit' || type === 'coin') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type === 'coin' ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(type === 'coin' ? 1200 : 600, t);
        if (type === 'coin') osc.frequency.setValueAtTime(1600, t + 0.1);
        else osc.frequency.exponentialRampToValueAtTime(300, t + 0.1);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + (type === 'coin' ? 0.3 : 0.1));
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(t); osc.stop(t + 0.3);
    } else if (type === 'empty') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.value = 150;
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(t); osc.stop(t + 0.05);
    } else if (type === 'reload') {
        [0, 0.15, 0.3].forEach((delay, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.value = i === 1 ? 200 : 400;
            gain.gain.setValueAtTime(0.2, t + delay);
            gain.gain.exponentialRampToValueAtTime(0.01, t + delay + 0.1);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(t + delay); osc.stop(t + delay + 0.1);
        });
    }
}

class Target {
    constructor() {
        const level = LEVELS[currentLevelIdx];
        const available = level.animals;
        let pool = [];
        available.forEach(key => {
            const animal = ANIMAL_TYPES[key];
            const weight = Math.max(1, Math.floor(1000 / animal.price));
            for(let i = 0; i < weight; i++) pool.push(key);
        });
        
        this.typeKey = pool[Math.floor(Math.random() * pool.length)];
        this.data = ANIMAL_TYPES[this.typeKey];
        this.radius = this.data.radius;
        this.hp = this.data.hp;
        this.maxHp = this.data.hp;
        this.x = Math.random() * (canvas.width - 100) + 50;
        this.y = Math.random() * (canvas.height - 150) + 100;
        
        const angle = Math.random() * Math.PI * 2;
        this.speedX = Math.cos(angle) * this.data.speed;
        this.speedY = Math.sin(angle) * this.data.speed;
        this.markedForDeletion = false;
        this.emojiOffset = Math.random() * 100;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x - this.radius < 0 || this.x + this.radius > canvas.width) this.speedX *= -1;
        if (this.y - this.radius < 50 || this.y + this.radius > canvas.height - 50) this.speedY *= -1;
        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius + 50, Math.min(canvas.height - this.radius, this.y));
    }

    draw(ctx, time) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + this.radius * 0.8, this.radius * 0.8, this.radius * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = `${this.radius * 1.6}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const bounce = Math.sin(time * 0.005 + this.emojiOffset) * 3;
        ctx.fillText(this.data.emoji, this.x, this.y + bounce);
        
        if (this.data.isBoss) {
            const hpPercent = this.hp / this.maxHp;
            ctx.fillStyle = '#333';
            ctx.fillRect(this.x - 40, this.y - this.radius - 20, 80, 8);
            ctx.fillStyle = hpPercent > 0.5 ? '#0f0' : (hpPercent > 0.25 ? '#ff0' : '#f00');
            ctx.fillRect(this.x - 40, this.y - this.radius - 20, 80 * hpPercent, 8);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.strokeRect(this.x - 40, this.y - this.radius - 20, 80, 8);
        } else if (this.data.price >= 100) {
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 16px Arial';
            ctx.fillText('★', this.x + this.radius * 0.6, this.y - this.radius * 0.8 + bounce);
        }
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
        this.life = 1.0;
        this.decay = 0.03 + Math.random() * 0.03;
        this.color = color;
        this.size = Math.random() * 5 + 2;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.vy += 0.3;
        this.life -= this.decay;
    }
    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

class FloatingText {
    constructor(x, y, text, color) {
        this.x = x; this.y = y; this.text = text; this.color = color;
        this.life = 1.0; this.vy = -1.5;
    }
    update() { this.y += this.vy; this.life -= 0.015; }
    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.font = 'bold 22px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillText(this.text, this.x, this.y);
        ctx.globalAlpha = 1.0;
    }
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function startGame() {
    initAudio();
    gameState.isPlaying = true;
    gameState.isPaused = false;
    gameState.timeLeft = 60;
    gameState.spawnTimer = 0;
    gameState.lastTime = performance.now();
    
    const stats = getCurrentWeaponStats();
    ammo = stats.mag;
    maxAmmo = stats.mag;
    isReloading = false;
    targets = [];
    particles = [];
    floatingTexts = [];
    
    scope.x = canvas.width / 2;
    scope.y = canvas.height / 2;
    mouse.x = canvas.width / 2;
    mouse.y = canvas.height / 2;
    
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('shop-screen').classList.add('hidden');
    
    updateUI();
    
    if (gameState.timerInterval) clearInterval(gameState.timerInterval);
    gameState.timerInterval = setInterval(() => {
        if (gameState.isPlaying && !gameState.isPaused) {
            gameState.timeLeft--;
            updateUI();
            if (gameState.timeLeft <= 0) endGame();
        }
    }, 1000);
    
    requestAnimationFrame(gameLoop);
}

function endGame() {
    gameState.isPlaying = false;
    clearInterval(gameState.timerInterval);
    document.getElementById('final-money').textContent = gameState.money;
    document.getElementById('game-over-screen').classList.remove('hidden');
    saveGame();
}

function toggleShop() {
    if (!gameState.isPlaying) return;
    gameState.isPaused = !gameState.isPaused;
    const shopScreen = document.getElementById('shop-screen');
    if (gameState.isPaused) {
        shopScreen.classList.remove('hidden');
        renderShop();
    } else {
        shopScreen.classList.add('hidden');
        gameState.lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    }
}

function updateUI() {
    const stats = getCurrentWeaponStats();
    const lvl = LEVELS[currentLevelIdx];
    document.getElementById('money-display').textContent = gameState.money;
    document.getElementById('time-display').textContent = gameState.timeLeft;
    document.getElementById('level-display').textContent = lvl.name;
    document.getElementById('rifle-name').textContent = stats.name;
    document.getElementById('ammo-display').textContent = isReloading ? '...' : ammo;
    document.getElementById('max-ammo-display').textContent = stats.mag;
    
    const reloadWarning = document.getElementById('reload-warning');
    if (ammo === 0 && !isReloading && gameState.isPlaying) {
        reloadWarning.style.display = 'block';
    } else {
        reloadWarning.style.display = 'none';
    }
}

function spawnTarget() {
    const maxTargets = 5 + currentLevelIdx + gameState.upgrades.spawnSpeed;
    if (targets.length < maxTargets) {
        targets.push(new Target());
    }
}

function reload() {
    if (isReloading || ammo === maxAmmo || !gameState.isPlaying || gameState.isPaused) return;
    isReloading = true;
    updateUI();
    playSound('reload');
    setTimeout(() => {
        ammo = maxAmmo;
        isReloading = false;
        updateUI();
    }, getCurrentWeaponStats().reload);
}

function shoot() {
    if (!gameState.isPlaying || gameState.isPaused || isReloading || ammo <= 0) {
        if (ammo <= 0 && !isReloading) playSound('empty');
        return;
    }

    ammo--;
    updateUI();
    playSound('shoot');

    const stats = getCurrentWeaponStats();
    recoil.y = 40 + Math.random() * 20;
    recoil.x = (Math.random() - 0.5) * 30;

    ctx.fillStyle = 'rgba(255, 255, 200, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let hit = false;
    for (let i = targets.length - 1; i >= 0; i--) {
        const t = targets[i];
        const dist = Math.hypot(scope.x - t.x, scope.y - t.y);
        if (dist < t.radius * 0.9) {
            hit = true;
            t.hp -= stats.damage;
            
            if (t.hp <= 0) {
                const valueMult = 1 + (gameState.upgrades.valueMult * 0.5);
                const finalPrice = Math.floor(t.data.price * valueMult);
                
                gameState.money += finalPrice;
                inventory[t.typeKey]++;
                playSound('hit');
                playSound('coin');
                createExplosion(t.x, t.y, t.data.color, t.data.isBoss ? 40 : 20);
                floatingTexts.push(new FloatingText(t.x, t.y - 30, `+${finalPrice} 💰`, '#ffd700'));
                floatingTexts.push(new FloatingText(t.x, t.y, t.data.name, '#fff'));
                targets.splice(i, 1);
                isLocked = false;
                lockOnTarget = null;
                canLockOn = false;
                setTimeout(() => { canLockOn = true; }, 400);
                updateUI();
            } else {
                playSound('hit');
                createExplosion(scope.x, scope.y, '#ff0000', 10);
                floatingTexts.push(new FloatingText(t.x, t.y - 40, `-${stats.damage} HP`, '#ff3333'));
            }
            break;
        }
    }

    if (!hit) {
        createExplosion(scope.x, scope.y, '#7f8c8d', 5);
        isLocked = false;
        lockOnTarget = null;
    }
}

function createExplosion(x, y, color, count) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
}

function drawBackground() {
    const lvl = LEVELS[currentLevelIdx];
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, lvl.bg1);
    grad.addColorStop(1, lvl.bg2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    for (let x = 0; x <= canvas.width; x += 30) {
        const h = 80 + Math.sin(x * 0.01) * 40 + Math.cos(x * 0.05) * 20;
        ctx.lineTo(x, canvas.height - h);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.fill();
}

function drawScope(time) {
    const stats = getCurrentWeaponStats();
    const radius = Math.min(canvas.width, canvas.height) * 0.35;
    
    ctx.save();
    ctx.fillStyle = 'rgba(0, 10, 0, 0.93)';
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.arc(scope.x, scope.y, radius, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = '#111';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(scope.x, scope.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(scope.x, scope.y, radius - 5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = isLocked ? '#ff0000' : 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(scope.x - radius + 20, scope.y);
    ctx.lineTo(scope.x + radius - 20, scope.y);
    ctx.moveTo(scope.x, scope.y - radius + 20);
    ctx.lineTo(scope.x, scope.y + radius - 20);
    ctx.stroke();

    ctx.fillStyle = isLocked ? '#ff0000' : '#000';
    for (let i = 1; i <= 3; i++) {
        const offset = i * (radius / 4);
        ctx.beginPath(); ctx.arc(scope.x + offset, scope.y, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(scope.x - offset, scope.y, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(scope.x, scope.y + offset, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(scope.x, scope.y - offset, 3, 0, Math.PI*2); ctx.fill();
    }

    ctx.fillStyle = isLocked ? '#ff0000' : 'rgba(255, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.arc(scope.x, scope.y, 5, 0, Math.PI * 2);
    ctx.fill();

    if (isLocked && lockOnTarget) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(scope.x, scope.y);
        ctx.lineTo(lockOnTarget.x, lockOnTarget.y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.strokeRect(lockOnTarget.x - lockOnTarget.radius - 10, lockOnTarget.y - lockOnTarget.radius - 10, 
                       (lockOnTarget.radius + 10) * 2, (lockOnTarget.radius + 10) * 2);
        
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('LOCK', scope.x, scope.y - radius + 30);
    } else if (isHoldingFire && canLockOn && !isReloading && ammo > 0) {
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('НАВЕДЕНИЕ...', scope.x, scope.y - radius + 30);
    }
}

function gameLoop(timestamp) {
    if (!gameState.isPlaying || gameState.isPaused) return;

    const dt = timestamp - gameState.lastTime;
    gameState.lastTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();

    const spawnThreshold = Math.max(30, 90 - (gameState.upgrades.spawnSpeed * 10));
    gameState.spawnTimer++;
    if (gameState.spawnTimer > spawnThreshold) {
        spawnTarget();
        gameState.spawnTimer = 0;
    }

    if (isHoldingFire && canLockOn && !isReloading && ammo > 0 && !isLocked) {
        let nearest = null;
        let minDist = Infinity;
        for (let t of targets) {
            const d = Math.hypot(scope.x - t.x, scope.y - t.y);
            if (d < minDist && d < canvas.width * 0.6) {
                minDist = d;
                nearest = t;
            }
        }
        if (nearest) {
            isLocked = true;
            lockOnTarget = nearest;
            playSound('lock');
        }
    }

    if (isLocked && lockOnTarget) {
        if (!targets.includes(lockOnTarget)) {
            isLocked = false;
            lockOnTarget = null;
        } else {
            const speed = 0.25;
            scope.x += (lockOnTarget.x - scope.x) * speed;
            scope.y += (lockOnTarget.y - scope.y) * speed;
            const dist = Math.hypot(scope.x - lockOnTarget.x, scope.y - lockOnTarget.y);
            if (dist < 15) shoot();
        }
    } else {
        sway.time += 0.02;
        const stats = getCurrentWeaponStats();
        const swayX = (Math.sin(sway.time) * 3 + Math.sin(sway.time * 2.5) * 2) * stats.sway;
        const swayY = (Math.cos(sway.time * 1.5) * 3 + Math.cos(sway.time * 3) * 2) * stats.sway;
        
        scope.x += (mouse.x - scope.x) * 0.15;
        scope.y += (mouse.y - scope.y) * 0.15;
        scope.x += swayX + recoil.x;
        scope.y += swayY + recoil.y;
        
        recoil.x *= 0.85;
        recoil.y *= 0.85;
    }

    targets.forEach(t => { t.update(); t.draw(ctx, timestamp); });

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw(ctx);
        if (particles[i].life <= 0) particles.splice(i, 1);
    }

    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        floatingTexts[i].update();
        floatingTexts[i].draw(ctx);
        if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
    }

    drawScope(timestamp);
    requestAnimationFrame(gameLoop);
}

function renderShop() {
    document.getElementById('shop-money-display').textContent = gameState.money;

    const levelList = document.getElementById('level-list');
    levelList.innerHTML = '';
    LEVELS.forEach((lvl, idx) => {
        const isUnlocked = unlockedLevels[idx];
        const isCurrent = idx === currentLevelIdx;
        const div = document.createElement('div');
        div.className = `weapon-item ${isCurrent ? 'owned' : ''}`;
        div.innerHTML = `
            <div class="weapon-info">
                <div class="weapon-name">${lvl.name} ${isCurrent ? '✅' : ''}</div>
                <div class="weapon-stats">${lvl.desc}</div>
            </div>
            <button class="btn weapon-btn" ${isCurrent || (!isUnlocked && gameState.money < lvl.cost) ? 'disabled' : ''} 
                    onclick="selectLevel(${idx})">
                ${isCurrent ? 'ВЫБРАНО' : (isUnlocked ? 'ВЫБРАТЬ' : `${lvl.cost} 💰`)}
            </button>
        `;
        levelList.appendChild(div);
    });

    const invGrid = document.getElementById('inventory-grid');
    invGrid.innerHTML = '';
    let totalValue = 0;
    
    Object.keys(inventory).forEach(key => {
        const count = inventory[key];
        if (count > 0) {
            const data = ANIMAL_TYPES[key];
            const lootMult = 1 + (gameState.upgrades.lootDrop * 0.5);
            const finalPrice = Math.floor(data.price * lootMult);
            totalValue += count * finalPrice;
            const div = document.createElement('div');
            div.className = 'inv-item';
            div.innerHTML = `<span class="emoji">${data.emoji}</span><div class="count">${count} шт.</div><div class="price">${finalPrice} 💰</div>`;
            invGrid.appendChild(div);
        }
    });
    
    if (totalValue === 0) invGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #666; padding: 20px;">Пусто</div>';
    
    const sellBtn = document.getElementById('sell-all-btn');
    sellBtn.textContent = `ПРОДАТЬ ВСЁ (+${totalValue} 💰)`;
    sellBtn.disabled = totalValue === 0;

    const weaponList = document.getElementById('weapon-list');
    weaponList.innerHTML = '';
    WEAPONS.forEach((w, idx) => {
        const isOwned = gameState.ownedWeapons.includes(idx);
        const isCurrent = idx === currentWeaponIdx;
        const div = document.createElement('div');
        div.className = `weapon-item ${isCurrent ? 'owned' : ''}`;
        
        let btnHtml = '';
        if (isCurrent) {
            btnHtml = `<button class="btn weapon-btn" disabled>ВЫБРАНО</button>`;
        } else if (isOwned) {
            btnHtml = `<button class="btn weapon-btn" onclick="equipWeapon(${idx})">ВЫБРАТЬ</button>`;
        } else {
            btnHtml = `<button class="btn weapon-btn" ${gameState.money < w.price ? 'disabled' : ''} onclick="buyWeapon(${idx})">${w.price} 💰</button>`;
        }

        div.innerHTML = `
            <div class="weapon-info">
                <div class="weapon-name">${w.name} ${isCurrent ? '✅' : ''}</div>
                <div class="weapon-stats">Урон: ${w.damage} | Маг: ${w.baseMag} | Точность: ${(w.baseSway).toFixed(1)}x</div>
            </div>
            ${btnHtml}
        `;
        weaponList.appendChild(div);
    });

    const wStats = getCurrentWeaponStats();
    const wBase = WEAPONS[currentWeaponIdx];
    const wUpgradeCost = 100 * (weaponUpgrades + 1);
    
    document.getElementById('weapon-upgrades').innerHTML = `
        <div class="upgrade-stat">
            <span><b>${wBase.name}</b> (Ур. ${weaponUpgrades})<br>Маг: ${wStats.mag} | Урон: ${wStats.damage}</span>
            <button class="btn weapon-btn" ${gameState.money < wUpgradeCost ? 'disabled' : ''} onclick="upgradeWeapon()">
                ${wUpgradeCost} 💰
            </button>
        </div>
    `;

    const upgNames = { spawnSpeed: "Скорость появления", lootDrop: "Добыча с мобов", valueMult: "Стоимость трофеев" };
    const upgKeys = ['spawnSpeed', 'lootDrop', 'valueMult'];
    let baseUpgHtml = '';
    
    upgKeys.forEach(key => {
        const lvl = gameState.upgrades[key];
        const cost = 200 * Math.pow(1.5, lvl);
        const maxed = lvl >= 5;
        baseUpgHtml += `
            <div class="upgrade-stat">
                <span>${upgNames[key]}: Ур. ${lvl}/5</span>
                <button class="btn weapon-btn" ${gameState.money < cost || maxed ? 'disabled' : ''} onclick="upgradeBase('${key}')">
                    ${maxed ? 'МАКС' : cost + ' 💰'}
                </button>
            </div>
        `;
    });
    document.getElementById('base-upgrades').innerHTML = baseUpgHtml;
}

window.selectLevel = function(idx) {
    if (unlockedLevels[idx]) {
        currentLevelIdx = idx;
        playSound('coin');
        saveGame();
        renderShop();
    } else {
        const lvl = LEVELS[idx];
        if (gameState.money >= lvl.cost) {
            gameState.money -= lvl.cost;
            unlockedLevels[idx] = true;
            currentLevelIdx = idx;
            playSound('coin');
            saveGame();
            renderShop();
            updateUI();
        }
    }
};

window.buyWeapon = function(idx) {
    const w = WEAPONS[idx];
    if (gameState.money >= w.price && !gameState.ownedWeapons.includes(idx)) {
        gameState.money -= w.price;
        gameState.ownedWeapons.push(idx);
        currentWeaponIdx = idx;
        weaponUpgrades = 0;
        
        const stats = getCurrentWeaponStats();
        maxAmmo = stats.mag;
        ammo = maxAmmo; 
        
        playSound('coin');
        saveGame();
        renderShop();
        updateUI();
    }
};

window.equipWeapon = function(idx) {
    if (gameState.ownedWeapons.includes(idx)) {
        currentWeaponIdx = idx;
        weaponUpgrades = 0; 
        const stats = getCurrentWeaponStats();
        maxAmmo = stats.mag;
        ammo = maxAmmo;
        playSound('coin');
        saveGame();
        renderShop();
        updateUI();
    }
};

window.upgradeWeapon = function() {
    const cost = 100 * (weaponUpgrades + 1);
    if (gameState.money >= cost) {
        gameState.money -= cost;
        weaponUpgrades++;
        const stats = getCurrentWeaponStats();
        maxAmmo = stats.mag;
        if (ammo === maxAmmo - Math.floor((weaponUpgrades-1)/2)) ammo = maxAmmo; 
        playSound('coin');
        saveGame();
        renderShop();
        updateUI();
    }
};

window.upgradeBase = function(key) {
    const lvl = gameState.upgrades[key];
    if (lvl < 5) {
        const cost = 200 * Math.pow(1.5, lvl);
        if (gameState.money >= cost) {
            gameState.money -= cost;
            gameState.upgrades[key]++;
            playSound('coin');
            saveGame();
            renderShop();
            updateUI();
        }
    }
};

window.sellAll = function() {
    let total = 0;
    const lootMult = 1 + (gameState.upgrades.lootDrop * 0.5);
    Object.keys(inventory).forEach(key => {
        const count = inventory[key];
        if (count > 0) {
            const finalPrice = Math.floor(ANIMAL_TYPES[key].price * lootMult);
            total += count * finalPrice;
            inventory[key] = 0;
        }
    });
    if (total > 0) {
        gameState.money += total;
        playSound('coin');
        saveGame();
        renderShop();
        updateUI();
    }
};

function handleTouchStart(e) {
    if (e.target.closest('.control-btn') || e.target.closest('.btn') || e.target.closest('.hud-panel') || e.target.closest('.shop-scroll-area')) {
        return;
    }
    e.preventDefault();
    isHoldingFire = true;
    const touch = e.touches[0];
    mouse.x = touch.clientX;
    mouse.y = touch.clientY;
}

function handleTouchMove(e) {
    if (isHoldingFire) {
        e.preventDefault();
        const touch = e.touches[0];
        mouse.x = touch.clientX;
        mouse.y = touch.clientY;
    }
}

function handleTouchEnd(e) {
    if (e.target.closest('.control-btn') || e.target.closest('.btn')) return;
    e.preventDefault();
    isHoldingFire = false;
    if (!isLocked) {
        lockOnTarget = null;
    }
}

canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

canvas.addEventListener('mousedown', (e) => {
    if (e.target === canvas) {
        isHoldingFire = true;
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    }
});
canvas.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});
canvas.addEventListener('mouseup', () => {
    isHoldingFire = false;
    if (!isLocked) lockOnTarget = null;
});

document.getElementById('reload-btn').addEventListener('touchstart', (e) => { e.preventDefault(); reload(); });
document.getElementById('reload-btn').addEventListener('click', (e) => { e.preventDefault(); reload(); });

document.getElementById('shop-btn').addEventListener('touchstart', (e) => { e.preventDefault(); toggleShop(); });
document.getElementById('shop-btn').addEventListener('click', (e) => { e.preventDefault(); toggleShop(); });

document.getElementById('start-btn').addEventListener('click', () => {
    if (localStorage.getItem('legal_accepted_v1') === 'true') {
        loadGame();
        startGame();
    } else {
        document.getElementById('legal-modal').classList.remove('hidden');
    }
});
document.getElementById('restart-btn').addEventListener('click', () => {
    loadGame();
    startGame();
});
document.getElementById('close-shop-btn').addEventListener('click', toggleShop);
document.getElementById('sell-all-btn').addEventListener('click', sellAll);

const legalCheckbox = document.getElementById('legal-accept');
const legalBtn = document.getElementById('accept-legal-btn');

legalCheckbox.addEventListener('change', () => {
    legalBtn.disabled = !legalCheckbox.checked;
});

legalBtn.addEventListener('click', () => {
    if (legalCheckbox.checked) {
        localStorage.setItem('legal_accepted_v1', 'true');
        document.getElementById('legal-modal').classList.add('hidden');
        loadGame();
        startGame();
    }
});

loadGame();
resize();
drawBackground();

if (localStorage.getItem('legal_accepted_v1') !== 'true') {
    document.getElementById('legal-modal').classList.remove('hidden');
      }
