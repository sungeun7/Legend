// 게임 캔버스 설정
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 1200;
canvas.height = 600;

// 미니맵 캔버스 설정
const minimapCanvas = document.getElementById('minimapCanvas');
const minimapCtx = minimapCanvas.getContext('2d');
minimapCanvas.width = 300;
minimapCanvas.height = 150;

// 게임 상태
let gameState = {
    score: 0,
    gameOver: false,
    mapWidth: 5000,  // 맵 전체 너비
    stage: 1,
    gold: 0,
    inShop: false,
    soundEnabled: true,
    statPoints: 0  // 스탯 포인트
};

// 사운드 시스템
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.initAudio();
    }

    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API를 지원하지 않습니다.');
        }
    }

    // 사운드 생성 함수들
    playTone(frequency, duration, type = 'sine', volume = 0.3) {
        if (!this.audioContext || !gameState.soundEnabled) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    playJump() {
        this.playTone(400, 0.1, 'sine', 0.2);
    }

    playAttack(weaponType) {
        if (weaponType === WEAPON_TYPES.FIST) {
            // 주먹 공격 소리
            this.playTone(200, 0.15, 'square', 0.3);
        } else {
            // 칼 공격 소리
            this.playTone(300, 0.1, 'sawtooth', 0.25);
            setTimeout(() => this.playTone(400, 0.1, 'sawtooth', 0.2), 50);
        }
    }

    playEnemyHit() {
        this.playTone(150, 0.2, 'square', 0.3);
    }

    playEnemyKill() {
        this.playTone(600, 0.1, 'sine', 0.3);
        setTimeout(() => this.playTone(800, 0.1, 'sine', 0.25), 50);
        setTimeout(() => this.playTone(1000, 0.15, 'sine', 0.2), 100);
    }

    playDamage() {
        this.playTone(100, 0.3, 'square', 0.4);
    }

    playGold() {
        this.playTone(800, 0.1, 'sine', 0.2);
        setTimeout(() => this.playTone(1000, 0.1, 'sine', 0.2), 80);
    }

    playShopEnter() {
        this.playTone(500, 0.2, 'sine', 0.3);
        setTimeout(() => this.playTone(600, 0.2, 'sine', 0.3), 100);
    }

    playBuy() {
        this.playTone(700, 0.1, 'sine', 0.3);
        setTimeout(() => this.playTone(900, 0.15, 'sine', 0.3), 100);
    }

    playGameOver() {
        this.playTone(200, 0.3, 'sine', 0.4);
        setTimeout(() => this.playTone(150, 0.4, 'sine', 0.4), 200);
    }

    playStageClear() {
        this.playTone(523, 0.15, 'sine', 0.3); // C
        setTimeout(() => this.playTone(659, 0.15, 'sine', 0.3), 150); // E
        setTimeout(() => this.playTone(784, 0.15, 'sine', 0.3), 300); // G
        setTimeout(() => this.playTone(1047, 0.3, 'sine', 0.3), 450); // C
    }

    // 배경 음악 (간단한 반복 패턴)
    startBackgroundMusic() {
        if (!this.audioContext || !gameState.soundEnabled) return;
        
        const playNote = (freq, time) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = freq;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.05, this.audioContext.currentTime + time);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + time + 0.5);
            
            oscillator.start(this.audioContext.currentTime + time);
            oscillator.stop(this.audioContext.currentTime + time + 0.5);
        };

        // 간단한 멜로디 반복
        const melody = [262, 294, 330, 349, 392, 440, 494, 523]; // C major scale
        let noteIndex = 0;
        
        const playMelody = () => {
            if (gameState.gameOver || gameState.inShop) {
                setTimeout(playMelody, 2000);
                return;
            }
            playNote(melody[noteIndex], 0);
            noteIndex = (noteIndex + 1) % melody.length;
            setTimeout(playMelody, 1000);
        };
        
        setTimeout(playMelody, 1000);
    }
}

// 사운드 매니저 초기화
const soundManager = new SoundManager();

// 무기 타입
const WEAPON_TYPES = {
    FIST: 'fist',
    WOODEN_SWORD: 'woodenSword',
    IRON_SWORD: 'ironSword',
    STEEL_SWORD: 'steelSword',
    DIAMOND_SWORD: 'diamondSword'
};

// 무기 데이터
const WEAPONS = {
    [WEAPON_TYPES.FIST]: { name: '주먹', damage: 20, range: 80, attackSpeed: 30, color: '#ffaa00' },
    [WEAPON_TYPES.WOODEN_SWORD]: { name: '나무 칼', damage: 30, range: 100, attackSpeed: 25, color: '#8B4513' },
    [WEAPON_TYPES.IRON_SWORD]: { name: '철 칼', damage: 40, range: 120, attackSpeed: 20, color: '#C0C0C0' },
    [WEAPON_TYPES.STEEL_SWORD]: { name: '강철 칼', damage: 60, range: 140, attackSpeed: 18, color: '#4682B4' },
    [WEAPON_TYPES.DIAMOND_SWORD]: { name: '다이아몬드 칼', damage: 90, range: 160, attackSpeed: 15, color: '#00CED1' }
};

// 방어구 타입
const ARMOR_TYPES = {
    NONE: 'none',
    LEATHER: 'leather',
    IRON: 'iron',
    STEEL: 'steel',
    DIAMOND: 'diamond'
};

// 방어구 데이터
const ARMORS = {
    [ARMOR_TYPES.NONE]: { name: '없음', defense: 0, maxHealthBonus: 0, color: '#4a90e2' },
    [ARMOR_TYPES.LEATHER]: { name: '가죽 갑옷', defense: 5, maxHealthBonus: 20, color: '#8B4513' },
    [ARMOR_TYPES.IRON]: { name: '철 갑옷', defense: 10, maxHealthBonus: 40, color: '#696969' },
    [ARMOR_TYPES.STEEL]: { name: '강철 갑옷', defense: 15, maxHealthBonus: 60, color: '#708090' },
    [ARMOR_TYPES.DIAMOND]: { name: '다이아몬드 갑옷', defense: 25, maxHealthBonus: 100, color: '#00CED1' }
};

// 카메라
const camera = {
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height
};

// 플레이어 클래스
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 70;
        this.velocityX = 0;
        this.velocityY = 0;
        this.baseSpeed = 5;
        this.speed = 5;
        this.jumpPower = 15;
        this.gravity = 0.8;
        this.onGround = false;
        this.health = 100;
        this.maxHealth = 100;
        this.baseMaxHealth = 100;
        this.facing = 1; // 1: 오른쪽, -1: 왼쪽
        this.attacking = false;
        this.attackCooldown = 0;
        this.weapon = WEAPON_TYPES.FIST;
        this.armor = ARMOR_TYPES.NONE;
        this.attackAnimation = 0;
        // 스탯 포인트
        this.statPoints = {
            attack: 0,  // 힘 포인트
            defense: 0, // 방어력 포인트
            speed: 0    // 속도 포인트
        };
        this.updateMaxHealth();
        this.updateStats();
    }
    
    updateStats() {
        // 속도 업데이트
        this.speed = this.baseSpeed + this.statPoints.speed * 0.5;
    }

    getWeaponStats() {
        return WEAPONS[this.weapon];
    }

    getArmorStats() {
        return ARMORS[this.armor];
    }

    updateMaxHealth() {
        const armorStats = this.getArmorStats();
        this.maxHealth = this.baseMaxHealth + armorStats.maxHealthBonus;
        if (this.health > this.maxHealth) {
            this.health = this.maxHealth;
        }
    }

    update(keys, platforms) {
        // 좌우 이동
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
            this.velocityX = -this.speed;
            this.facing = -1;
        } else if (keys['ArrowRight'] || keys['d'] || keys['D']) {
            this.velocityX = this.speed;
            this.facing = 1;
        } else {
            this.velocityX *= 0.8; // 마찰
        }

        // 점프 (윗방향키만)
        if ((keys['ArrowUp'] || keys['w'] || keys['W']) && this.onGround) {
            this.velocityY = -this.jumpPower;
            this.onGround = false;
            soundManager.playJump();
        }

        // 공격 (스페이스바)
        const weaponStats = this.getWeaponStats();
        if (keys[' '] && this.attackCooldown <= 0) {
            this.attacking = true;
            this.attackAnimation = weaponStats.attackSpeed;
            this.attackCooldown = weaponStats.attackSpeed;
            soundManager.playAttack(this.weapon);
        }

        if (this.attackCooldown > 0) {
            this.attackCooldown--;
            if (this.attackAnimation > 0) {
                this.attackAnimation--;
            }
            if (this.attackCooldown <= weaponStats.attackSpeed * 0.7) {
                this.attacking = false;
            }
        }

        // 중력 적용
        this.velocityY += this.gravity;
        this.onGround = false;

        // X축 이동
        this.x += this.velocityX;

        // 플랫폼 충돌 검사 (X축)
        for (let platform of platforms) {
            if (this.checkCollision(platform)) {
                if (this.velocityX > 0) {
                    this.x = platform.x - this.width;
                } else if (this.velocityX < 0) {
                    this.x = platform.x + platform.width;
                }
                this.velocityX = 0;
            }
        }

        // Y축 이동
        this.y += this.velocityY;

        // 플랫폼 충돌 검사 (Y축)
        for (let platform of platforms) {
            if (this.checkCollision(platform)) {
                if (this.velocityY > 0) {
                    this.y = platform.y - this.height;
                    this.velocityY = 0;
                    this.onGround = true;
                } else if (this.velocityY < 0) {
                    this.y = platform.y + platform.height;
                    this.velocityY = 0;
                }
            }
        }

        // 화면 밖으로 나가지 않도록
        if (this.x < 0) this.x = 0;
        if (this.y + this.height > canvas.height) {
            this.y = canvas.height - this.height;
            this.velocityY = 0;
            this.onGround = true;
        }

        // 카메라 업데이트
        camera.x = this.x - canvas.width / 2;
        if (camera.x < 0) camera.x = 0;
        // 맵 끝에서 카메라가 멈추도록
        if (camera.x + camera.width > gameState.mapWidth) {
            camera.x = gameState.mapWidth - camera.width;
        }
    }

    checkCollision(platform) {
        return this.x < platform.x + platform.width &&
               this.x + this.width > platform.x &&
               this.y < platform.y + platform.height &&
               this.y + this.height > platform.y;
    }

    takeDamage(amount) {
        const armorStats = this.getArmorStats();
        const totalDefense = armorStats.defense + this.statPoints.defense * 2;
        const actualDamage = Math.max(1, amount - totalDefense);
        this.health -= actualDamage;
        if (this.health < 0) this.health = 0;
        soundManager.playDamage();
        updateHealthUI();
    }

    draw() {
        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);

        // 플레이어 몸체 (방어구 색상 반영)
        const armorStats = this.getArmorStats();
        ctx.fillStyle = this.attacking ? '#ff6b6b' : armorStats.color;
        ctx.fillRect(0, 0, this.width, this.height);

        // 얼굴
        ctx.fillStyle = '#fff';
        ctx.fillRect(10, 10, 10, 10);
        ctx.fillRect(30, 10, 10, 10);
        ctx.fillStyle = '#000';
        ctx.fillRect(12, 12, 6, 6);
        ctx.fillRect(32, 12, 6, 6);

        // 무기 그리기
        const weaponStats = this.getWeaponStats();
        if (this.attacking) {
            const progress = 1 - (this.attackAnimation / weaponStats.attackSpeed);
            const angle = progress * Math.PI * 0.8; // 0.8 * 180도 회전
            
            ctx.save();
            const weaponX = this.facing > 0 ? this.width : 0;
            const weaponY = this.height * 0.3;
            ctx.translate(weaponX, weaponY);
            ctx.rotate(this.facing > 0 ? angle : -angle);
            
            if (this.weapon === WEAPON_TYPES.FIST) {
                // 주먹 그리기
                ctx.fillStyle = '#ffaa00';
                ctx.fillRect(0, -5, 15, 10);
            } else {
                // 칼 그리기 (밝고 눈에 띄는 색상)
                const swordColor = weaponStats.color;
                ctx.fillStyle = swordColor;
                ctx.fillRect(0, -4, weaponStats.range * 0.6, 8);
                // 칼날 강조
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, -3, weaponStats.range * 0.6, 2);
                // 손잡이
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(0, -2, 8, 4);
            }
            ctx.restore();
        } else if (this.weapon !== WEAPON_TYPES.FIST) {
            // 무기 착용 표시 (더 눈에 띄게)
            ctx.save();
            const weaponX = this.facing > 0 ? this.width - 5 : -10;
            const weaponY = this.height * 0.3;
            const weaponStats = this.getWeaponStats();
            ctx.fillStyle = weaponStats.color;
            ctx.fillRect(weaponX, weaponY - 4, 12, 8);
            // 칼날 강조
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(weaponX, weaponY - 3, 12, 2);
            // 손잡이
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(weaponX, weaponY - 2, 6, 4);
            ctx.restore();
        }

        ctx.restore();
    }

    getAttackBox() {
        if (!this.attacking) return null;
        const weaponStats = this.getWeaponStats();
        return {
            x: this.facing > 0 ? this.x + this.width : this.x - weaponStats.range,
            y: this.y,
            width: weaponStats.range,
            height: this.height
        };
    }

    getAttackDamage() {
        const weaponStats = this.getWeaponStats();
        return weaponStats.damage + this.statPoints.attack * 5;
    }
}

// 적 클래스
class Enemy {
    constructor(x, y, id) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 50;
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = 2;
        this.gravity = 0.8;
        this.onGround = false;
        this.health = 30;
        this.maxHealth = 30;
        this.patrolDistance = 150;
        this.startX = x;
        this.startY = y;
        this.direction = 1;
        this.attackCooldown = 0;
        this.id = id; // 적 고유 ID
        this.isDead = false;
        this.respawnTimer = 0;
        this.patternType = id % 4; // 4가지 패턴 타입
        this.waitTimer = 0;
        this.jumpCooldown = 0;
        this.chargeTimer = 0;
        this.chargeDirection = 0;
    }

    update(platforms, player) {
        if (this.isDead) {
            this.respawn();
            return;
        }

        // 맵 밖으로 떨어졌는지 확인 (원래 위치로 리셋)
        if (this.y > canvas.height + 200 || this.x < -100 || this.x > gameState.mapWidth + 100) {
            this.x = this.startX;
            this.y = this.startY;
            this.velocityX = 0;
            this.velocityY = 0;
            this.onGround = false;
            return;
        }

        // 다양한 패턴 AI (스테이지에 따라 패턴 다양화)
        const distanceToPlayer = player.x - this.x;
        const detectionRange = 400 + gameState.stage * 50; // 스테이지가 올라갈수록 감지 범위 증가
        const isPlayerNear = Math.abs(distanceToPlayer) < detectionRange && Math.abs(player.y - this.y) < 200;
        
        // 패턴 타입에 따라 다른 행동
        if (this.patternType === 0) {
            // 패턴 1: 기본 추적
            if (isPlayerNear) {
                if (distanceToPlayer > 30) {
                    this.velocityX = this.speed;
                    this.direction = 1;
                } else if (distanceToPlayer < -30) {
                    this.velocityX = -this.speed;
                    this.direction = -1;
                } else {
                    this.velocityX = 0;
                }
            } else {
                if (Math.abs(this.x - this.startX) > this.patrolDistance) {
                    this.direction *= -1;
                }
                this.velocityX = this.speed * this.direction;
            }
        } else if (this.patternType === 1) {
            // 패턴 2: 점프 공격형
            if (isPlayerNear) {
                if (this.waitTimer > 0) {
                    this.waitTimer--;
                    this.velocityX = 0;
                } else {
                    if (distanceToPlayer > 30) {
                        this.velocityX = this.speed * 1.5;
                        this.direction = 1;
                    } else if (distanceToPlayer < -30) {
                        this.velocityX = -this.speed * 1.5;
                        this.direction = -1;
                    }
                    
                    // 가까이 오면 점프
                    if (Math.abs(distanceToPlayer) < 100 && this.onGround && this.jumpCooldown <= 0) {
                        this.velocityY = -12;
                        this.jumpCooldown = 120;
                    }
                }
            } else {
                if (Math.abs(this.x - this.startX) > this.patrolDistance) {
                    this.direction *= -1;
                }
                this.velocityX = this.speed * this.direction;
            }
            if (this.jumpCooldown > 0) this.jumpCooldown--;
        } else if (this.patternType === 2) {
            // 패턴 3: 대기 후 돌진
            if (isPlayerNear) {
                if (this.waitTimer > 0) {
                    this.waitTimer--;
                    this.velocityX = 0;
                } else if (this.chargeTimer > 0) {
                    // 돌진 중
                    this.velocityX = this.chargeDirection * this.speed * 3;
                    this.chargeTimer--;
                } else {
                    // 대기 후 돌진 시작
                    if (Math.abs(distanceToPlayer) > 50) {
                        this.waitTimer = 60;
                        this.chargeTimer = 40;
                        this.chargeDirection = distanceToPlayer > 0 ? 1 : -1;
                    }
                }
            } else {
                if (Math.abs(this.x - this.startX) > this.patrolDistance) {
                    this.direction *= -1;
                }
                this.velocityX = this.speed * this.direction;
            }
        } else if (this.patternType === 3) {
            // 패턴 4: 빠른 이동형
            if (isPlayerNear) {
                if (distanceToPlayer > 30) {
                    this.velocityX = this.speed * 2;
                    this.direction = 1;
                } else if (distanceToPlayer < -30) {
                    this.velocityX = -this.speed * 2;
                    this.direction = -1;
                } else {
                    this.velocityX = 0;
                }
            } else {
                if (Math.abs(this.x - this.startX) > this.patrolDistance) {
                    this.direction *= -1;
                }
                this.velocityX = this.speed * this.direction;
            }
        } else if (this.patternType === 4) {
            // 패턴 5: 원거리 추적형 (스테이지 2+)
            if (isPlayerNear) {
                const followDistance = 150;
                if (distanceToPlayer > followDistance) {
                    this.velocityX = this.speed * 1.3;
                    this.direction = 1;
                } else if (distanceToPlayer < -followDistance) {
                    this.velocityX = -this.speed * 1.3;
                    this.direction = -1;
                } else {
                    this.velocityX = 0;
                }
            } else {
                if (Math.abs(this.x - this.startX) > this.patrolDistance) {
                    this.direction *= -1;
                }
                this.velocityX = this.speed * this.direction;
            }
        } else if (this.patternType === 5) {
            // 패턴 6: 공격적 점프형 (스테이지 3+)
            if (isPlayerNear) {
                if (distanceToPlayer > 30) {
                    this.velocityX = this.speed * 1.2;
                    this.direction = 1;
                } else if (distanceToPlayer < -30) {
                    this.velocityX = -this.speed * 1.2;
                    this.direction = -1;
                }
                
                if (Math.abs(distanceToPlayer) < 120 && this.onGround && this.jumpCooldown <= 0) {
                    this.velocityY = -14;
                    this.jumpCooldown = 90;
                }
            } else {
                if (Math.abs(this.x - this.startX) > this.patrolDistance) {
                    this.direction *= -1;
                }
                this.velocityX = this.speed * this.direction;
            }
            if (this.jumpCooldown > 0) this.jumpCooldown--;
        } else if (this.patternType === 6) {
            // 패턴 7: 빠른 돌진형 (스테이지 4+)
            if (isPlayerNear) {
                if (this.chargeTimer > 0) {
                    this.velocityX = this.chargeDirection * this.speed * 4;
                    this.chargeTimer--;
                } else {
                    if (Math.abs(distanceToPlayer) > 80) {
                        this.waitTimer = 30;
                        this.chargeTimer = 50;
                        this.chargeDirection = distanceToPlayer > 0 ? 1 : -1;
                    }
                }
            } else {
                if (Math.abs(this.x - this.startX) > this.patrolDistance) {
                    this.direction *= -1;
                }
                this.velocityX = this.speed * this.direction;
            }
        } else {
            // 패턴 8: 혼합형 (스테이지 5+)
            if (isPlayerNear) {
                const behavior = Math.floor(Date.now() / 1000) % 3;
                if (behavior === 0) {
                    // 추적
                    if (distanceToPlayer > 30) {
                        this.velocityX = this.speed * 1.5;
                        this.direction = 1;
                    } else if (distanceToPlayer < -30) {
                        this.velocityX = -this.speed * 1.5;
                        this.direction = -1;
                    }
                } else if (behavior === 1 && this.onGround && this.jumpCooldown <= 0) {
                    // 점프
                    this.velocityY = -13;
                    this.jumpCooldown = 100;
                } else {
                    // 대기
                    this.velocityX = 0;
                }
            } else {
                if (Math.abs(this.x - this.startX) > this.patrolDistance) {
                    this.direction *= -1;
                }
                this.velocityX = this.speed * this.direction;
            }
            if (this.jumpCooldown > 0) this.jumpCooldown--;
        }

        // 중력
        this.velocityY += this.gravity;
        this.onGround = false;

        // X축 이동
        this.x += this.velocityX;

        // 플랫폼 충돌 검사 (X축)
        for (let platform of platforms) {
            if (this.checkCollision(platform)) {
                if (this.velocityX > 0) {
                    this.x = platform.x - this.width;
                    this.direction *= -1;
                } else if (this.velocityX < 0) {
                    this.x = platform.x + platform.width;
                    this.direction *= -1;
                }
                this.velocityX = 0;
            }
        }

        // Y축 이동
        this.y += this.velocityY;

        // 플랫폼 충돌 검사 (Y축)
        let onPlatform = false;
        for (let platform of platforms) {
            if (this.checkCollision(platform)) {
                if (this.velocityY > 0) {
                    this.y = platform.y - this.height;
                    this.velocityY = 0;
                    this.onGround = true;
                    onPlatform = true;
                } else if (this.velocityY < 0) {
                    this.y = platform.y + platform.height;
                    this.velocityY = 0;
                }
            }
        }

        // 플랫폼에 서 있지 않으면 아래로 떨어지지 않도록 처리
        if (!onPlatform) {
            // 아래에 플랫폼이 있는지 확인
            let platformBelow = null;
            for (let platform of platforms) {
                if (this.x + this.width / 2 >= platform.x && 
                    this.x + this.width / 2 <= platform.x + platform.width &&
                    this.y < platform.y && 
                    this.y + this.height > platform.y - 10) {
                    platformBelow = platform;
                    break;
                }
            }
            
            if (platformBelow) {
                // 플랫폼 위로 이동
                this.y = platformBelow.y - this.height;
                this.velocityY = 0;
                this.onGround = true;
            } else if (this.y > this.startY + 100) {
                // 너무 많이 떨어졌으면 리셋
                this.x = this.startX;
                this.y = this.startY;
                this.velocityX = 0;
                this.velocityY = 0;
                this.onGround = false;
            }
        }

        // 플레이어와의 거리 확인 (화면에 보일 때만 공격)
        const isInViewport = this.x >= camera.x - 100 && 
                            this.x <= camera.x + camera.width + 100 &&
                            this.y >= camera.y - 100 && 
                            this.y <= camera.y + camera.height + 100;
        
        if (isInViewport) {
            const distance = Math.abs(this.x - player.x);
            if (distance < 60 && this.attackCooldown <= 0) {
                this.attackCooldown = 60;
                if (distance < 50) {
                    // 스테이지가 5의 배수일 때 적의 공격력도 2.5배씩 강화
                    const attackMultiplier = Math.pow(2.5, Math.floor(gameState.stage / 5));
                    const baseDamage = 10;
                    player.takeDamage(Math.floor(baseDamage * attackMultiplier));
                }
            }
        }

        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }
    }

    checkCollision(platform) {
        return this.x < platform.x + platform.width &&
               this.x + this.width > platform.x &&
               this.y < platform.y + platform.height &&
               this.y + this.height > platform.y;
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.isDead = true;
            this.respawnTimer = 300; // 5초 후 재생성 (60fps 기준)
            soundManager.playEnemyKill();
            return true;
        } else {
            soundManager.playEnemyHit();
        }
        return false;
    }

    respawn() {
        if (this.isDead && this.respawnTimer > 0) {
            this.respawnTimer--;
            if (this.respawnTimer <= 0) {
                this.isDead = false;
                this.health = this.maxHealth;
                this.x = this.startX;
                this.y = this.startY;
                this.velocityX = 0;
                this.velocityY = 0;
            }
        }
    }

    draw() {
        if (this.isDead) return; // 죽은 적은 그리지 않음

        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);

        // 적 몸체
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(0, 0, this.width, this.height);

        // 눈
        ctx.fillStyle = '#fff';
        ctx.fillRect(8, 8, 8, 8);
        ctx.fillRect(24, 8, 8, 8);
        ctx.fillStyle = '#000';
        ctx.fillRect(10, 10, 4, 4);
        ctx.fillRect(26, 10, 4, 4);

        // 체력바
        const barWidth = this.width;
        const barHeight = 5;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, -10, barWidth, barHeight);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, -10, (this.health / this.maxHealth) * barWidth, barHeight);

        ctx.restore();
    }
}

// 플랫폼 클래스
class Platform {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.fillStyle = '#654321';
        ctx.fillRect(0, 0, this.width, 5);
        ctx.restore();
    }
}

// 상점 클래스
class Shop {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 200;
        this.height = 150;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);
        
        // 상점 건물
        ctx.fillStyle = '#654321';
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(10, 10, this.width - 20, this.height - 20);
        
        // 지붕
        ctx.fillStyle = '#8B0000';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(this.width / 2, -30);
        ctx.lineTo(this.width, 0);
        ctx.closePath();
        ctx.fill();
        
        // 문
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(this.width / 2 - 20, this.height - 60, 40, 50);
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(this.width / 2 + 15, this.height - 35, 5, 5);
        
        // 간판
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(this.width / 2 - 40, -35, 80, 20);
        ctx.fillStyle = '#000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('상점', this.width / 2, -20);
        
        ctx.restore();
    }

    checkCollision(player) {
        return player.x < this.x + this.width &&
               player.x + player.width > this.x &&
               player.y < this.y + this.height &&
               player.y + player.height > this.y;
    }
}

// 게임 초기화
let player;
let enemies = [];
let platforms = [];
let shop = null;
let keys = {};

// 적을 플랫폼 위에 배치하는 헬퍼 함수
function findPlatformForEnemy(x, platforms) {
    for (let platform of platforms) {
        if (x >= platform.x && x <= platform.x + platform.width) {
            return platform.y - 50; // 적 높이 50
        }
    }
    return canvas.height - 50; // 기본값
}

function initGame() {
    // 게임 상태 초기화 (다시 시작 시)
    gameState.stage = 1;
    gameState.gold = 0;
    
    // 플레이어 생성 (플랫폼 위에 정확히 배치)
    const startPlatformY = canvas.height - 40;
    player = new Player(100, startPlatformY - 70);

    // 플랫폼 생성 (맵 크기 확장)
    platforms = [
        // 시작 구간
        new Platform(0, canvas.height - 40, 300, 40),
        new Platform(350, canvas.height - 100, 200, 40),
        new Platform(600, canvas.height - 160, 200, 40),
        new Platform(850, canvas.height - 220, 200, 40),
        new Platform(1100, canvas.height - 160, 200, 40),
        new Platform(1350, canvas.height - 100, 200, 40),
        new Platform(1600, canvas.height - 40, 400, 40),
        new Platform(2100, canvas.height - 100, 200, 40),
        new Platform(2350, canvas.height - 160, 200, 40),
        // 중간 구간
        new Platform(2600, canvas.height - 100, 250, 40),
        new Platform(2900, canvas.height - 180, 200, 40),
        new Platform(3150, canvas.height - 240, 200, 40),
        new Platform(3400, canvas.height - 180, 200, 40),
        new Platform(3650, canvas.height - 120, 300, 40),
        new Platform(4000, canvas.height - 60, 200, 40),
        new Platform(4250, canvas.height - 140, 200, 40),
        new Platform(4500, canvas.height - 200, 200, 40),
        new Platform(4750, canvas.height - 140, 200, 40),
        // 끝 구간
        new Platform(5000, canvas.height - 80, 400, 40),
    ];

    // 적 생성 (플랫폼 위에 정확히 배치)
    const enemyPositions = [
        {x: 400, y: canvas.height - 150},
        {x: 700, y: canvas.height - 210},
        {x: 950, y: canvas.height - 270},
        {x: 1200, y: canvas.height - 210},
        {x: 1400, y: canvas.height - 150},
        {x: 1700, y: canvas.height - 90},
        {x: 2200, y: canvas.height - 150},
        {x: 2450, y: canvas.height - 210},
        // 중간 구간 적들
        {x: 2700, y: canvas.height - 150},
        {x: 2950, y: canvas.height - 230},
        {x: 3200, y: canvas.height - 290},
        {x: 3450, y: canvas.height - 230},
        {x: 3700, y: canvas.height - 170},
        {x: 4050, y: canvas.height - 110},
        {x: 4300, y: canvas.height - 190},
        {x: 4550, y: canvas.height - 250},
        {x: 4800, y: canvas.height - 190},
        // 끝 구간 적들
        {x: 5100, y: canvas.height - 130},
        {x: 5300, y: canvas.height - 130},
    ];

    enemies = [];
    // 스테이지가 5의 배수일 때 1.5배씩 강화 (누적)
    const multiplier = Math.pow(1.5, Math.floor(gameState.stage / 5));
    
    enemyPositions.forEach((pos, index) => {
        const correctY = findPlatformForEnemy(pos.x, platforms);
        const enemy = new Enemy(pos.x, correctY, index);
        // 스테이지에 따라 적의 패턴 타입 다양화
        const patternCount = Math.min(4 + Math.floor(gameState.stage / 2), 8);
        enemy.patternType = index % patternCount;
        
        // 적의 체력과 속도에 배수 적용
        const baseHealth = 30 + gameState.stage * 5;
        enemy.health = enemy.maxHealth = Math.floor(baseHealth * multiplier);
        const baseSpeed = 2 + gameState.stage * 0.2;
        enemy.speed = baseSpeed * multiplier;
        
        enemies.push(enemy);
    });

    gameState.score = 0;
    gameState.gameOver = false;
    gameState.mapWidth = 5400; // 맵 전체 너비 업데이트
    gameState.inShop = false;
    
    // 카메라 초기화
    camera.x = player.x - canvas.width / 2;
    if (camera.x < 0) camera.x = 0;
    camera.y = 0;
    
    // 상점 생성 (맵 끝에)
    shop = new Shop(gameState.mapWidth - 250, canvas.height - 190);
    
    updateScoreUI();
    updateHealthUI();
    updateStageUI();
    updateGoldUI();
    updateStatsUI();
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('shopScreen').classList.add('hidden');
    document.getElementById('statDistributionScreen').classList.add('hidden');
}

// 입력 처리
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// UI 업데이트
function updateHealthUI() {
    const healthFill = document.getElementById('healthFill');
    const healthText = document.getElementById('healthText');
    const percentage = (player.health / player.maxHealth) * 100;
    healthFill.style.width = percentage + '%';
    healthText.textContent = `${Math.max(0, Math.floor(player.health))} / ${player.maxHealth}`;
    
    if (player.health <= 0) {
        gameOver();
    }
}

function updateScoreUI() {
    document.getElementById('scoreValue').textContent = gameState.score;
}

function updateStageUI() {
    document.getElementById('stageValue').textContent = gameState.stage;
}

function updateGoldUI() {
    document.getElementById('goldValue').textContent = gameState.gold;
}

function updateStatsUI() {
    const weaponStats = player.getWeaponStats();
    const armorStats = player.getArmorStats();
    
    // 힘 = 무기 공격력 + 힘 포인트
    const totalAttack = weaponStats.damage + player.statPoints.attack * 5;
    document.getElementById('attackValue').textContent = totalAttack;
    
    // 방어력 = 방어구 방어력 + 방어력 포인트
    const totalDefense = armorStats.defense + player.statPoints.defense * 2;
    document.getElementById('defenseValue').textContent = totalDefense;
    
    // 속도 = 기본 속도 + 속도 포인트
    document.getElementById('speedValue').textContent = Math.floor(player.speed * 10) / 10;
}

function gameOver() {
    gameState.gameOver = true;
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('gameOverScreen').classList.remove('hidden');
    soundManager.playGameOver();
}

// 다시 시작 버튼
document.getElementById('restartButton').addEventListener('click', () => {
    initGame();
    gameLoop();
});

// 게임 루프
function gameLoop() {
    if (gameState.gameOver) return;

    // 상점이나 스탯 분배 화면이 열려있으면 게임 일시정지
    const statScreen = document.getElementById('statDistributionScreen');
    if (gameState.inShop || (statScreen && !statScreen.classList.contains('hidden'))) {
        requestAnimationFrame(gameLoop);
        return;
    }

    // 화면 클리어
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 배경 그리기
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 플랫폼 그리기
    platforms.forEach(platform => platform.draw());

    // 상점 그리기
    if (shop) {
        shop.draw();
        
        // 상점 근처 표시
        if (shop.checkCollision(player)) {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 0, 0.7)';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('E키를 눌러 상점 입장', canvas.width / 2, 100);
            ctx.restore();
        }
    }

    // 플레이어 업데이트 및 그리기
    player.update(keys, platforms);
    
    // 상점 진입 확인
    if (shop && shop.checkCollision(player)) {
        if (keys['e'] || keys['E']) {
            openShop();
            keys['e'] = false;
            keys['E'] = false;
        }
    }
    player.draw();

    // 적 업데이트 및 그리기
    enemies.forEach((enemy) => {
        enemy.update(platforms, player);
        enemy.draw();

        // 플레이어 공격과 적 충돌
        if (!enemy.isDead) {
            const attackBox = player.getAttackBox();
            if (attackBox) {
                if (attackBox.x < enemy.x + enemy.width &&
                    attackBox.x + attackBox.width > enemy.x &&
                    attackBox.y < enemy.y + enemy.height &&
                    attackBox.y + attackBox.height > enemy.y) {
                    const damage = player.getAttackDamage();
                    if (enemy.takeDamage(damage)) {
                        gameState.score += 100;
                        const goldGained = 10 + gameState.stage * 5;
                        gameState.gold += goldGained;
                        soundManager.playGold();
                        updateScoreUI();
                        updateGoldUI();
                    }
                }
            }

            // 적과 플레이어 충돌 (적이 공격할 때) - 화면에 보일 때만
            const isEnemyInViewport = enemy.x >= camera.x - 100 && 
                                     enemy.x <= camera.x + camera.width + 100 &&
                                     enemy.y >= camera.y - 100 && 
                                     enemy.y <= camera.y + camera.height + 100;
            
            if (isEnemyInViewport && enemy.attackCooldown > 50) {
                if (player.x < enemy.x + enemy.width &&
                    player.x + player.width > enemy.x &&
                    player.y < enemy.y + enemy.height &&
                    player.y + player.height > enemy.y) {
                    // 이미 takeDamage가 호출됨
                }
            }
        }
    });

    // 미니맵 그리기
    drawMinimap();

    // 게임 계속
    requestAnimationFrame(gameLoop);
}

// 미니맵 그리기 함수
function drawMinimap() {
    // 미니맵 클리어
    minimapCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
    
    // 배경
    minimapCtx.fillStyle = 'rgba(50, 50, 50, 0.8)';
    minimapCtx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);
    
    // 스케일 계산 (맵 전체를 미니맵에 맞추기)
    const scaleX = minimapCanvas.width / gameState.mapWidth;
    const scaleY = minimapCanvas.height / canvas.height;
    
    // 플랫폼 그리기
    minimapCtx.fillStyle = '#8B4513';
    platforms.forEach(platform => {
        const x = platform.x * scaleX;
        const y = platform.y * scaleY;
        const w = platform.width * scaleX;
        const h = platform.height * scaleY;
        minimapCtx.fillRect(x, y, w, h);
    });
    
    // 적 그리기
    enemies.forEach(enemy => {
        if (!enemy.isDead) {
            minimapCtx.fillStyle = '#e74c3c';
            const x = enemy.x * scaleX;
            const y = enemy.y * scaleY;
            const w = enemy.width * scaleX;
            const h = enemy.height * scaleY;
            minimapCtx.fillRect(x, y, w, h);
        }
    });
    
    // 플레이어 그리기
    minimapCtx.fillStyle = '#4a90e2';
    const playerX = player.x * scaleX;
    const playerY = player.y * scaleY;
    const playerW = player.width * scaleX;
    const playerH = player.height * scaleY;
    minimapCtx.fillRect(playerX, playerY, playerW, playerH);
    
    // 카메라 뷰포트 표시
    minimapCtx.strokeStyle = '#ffff00';
    minimapCtx.lineWidth = 2;
    const viewportX = camera.x * scaleX;
    const viewportY = camera.y * scaleY;
    const viewportW = camera.width * scaleX;
    const viewportH = camera.height * scaleY;
    minimapCtx.strokeRect(viewportX, viewportY, viewportW, viewportH);
    
    // 테두리
    minimapCtx.strokeStyle = '#ffffff';
    minimapCtx.lineWidth = 2;
    minimapCtx.strokeRect(0, 0, minimapCanvas.width, minimapCanvas.height);
}

// 상점 함수들
function openShop() {
    gameState.inShop = true;
    document.getElementById('shopScreen').classList.remove('hidden');
    updateShopButtons();
    soundManager.playShopEnter();
}

function closeShop() {
    gameState.inShop = false;
    document.getElementById('shopScreen').classList.add('hidden');
    // 스탯 포인트 분배 화면 표시
    showStatDistribution();
}

function updateShopButtons() {
    const buttons = document.querySelectorAll('.buy-btn');
    buttons.forEach(btn => {
        const item = btn.getAttribute('data-item');
        let price = 0;
        
        switch(item) {
            case 'woodenSword':
                price = 300;
                btn.disabled = gameState.gold < price || player.weapon === WEAPON_TYPES.WOODEN_SWORD;
                break;
            case 'ironSword':
                price = 800;
                btn.disabled = gameState.gold < price || player.weapon === WEAPON_TYPES.IRON_SWORD;
                break;
            case 'steelSword':
                price = 2000;
                btn.disabled = gameState.gold < price || player.weapon === WEAPON_TYPES.STEEL_SWORD;
                break;
            case 'diamondSword':
                price = 5000;
                btn.disabled = gameState.gold < price || player.weapon === WEAPON_TYPES.DIAMOND_SWORD;
                break;
            case 'leatherArmor':
                price = 500;
                btn.disabled = gameState.gold < price || player.armor === ARMOR_TYPES.LEATHER;
                break;
            case 'ironArmor':
                price = 1500;
                btn.disabled = gameState.gold < price || player.armor === ARMOR_TYPES.IRON;
                break;
            case 'steelArmor':
                price = 3500;
                btn.disabled = gameState.gold < price || player.armor === ARMOR_TYPES.STEEL;
                break;
            case 'diamondArmor':
                price = 8000;
                btn.disabled = gameState.gold < price || player.armor === ARMOR_TYPES.DIAMOND;
                break;
            case 'healthPotion':
                price = 200;
                btn.disabled = gameState.gold < price || player.health >= player.maxHealth;
                break;
            case 'bigHealthPotion':
                price = 400;
                btn.disabled = gameState.gold < price || player.health >= player.maxHealth;
                break;
            case 'maxHealth':
                price = 600;
                btn.disabled = gameState.gold < price;
                break;
            case 'attackBoost':
                price = 1000;
                btn.disabled = gameState.gold < price;
                break;
        }
    });
}

function buyItem(itemType) {
    let purchased = false;
    
    switch(itemType) {
        case 'woodenSword':
            if (gameState.gold >= 300 && player.weapon !== WEAPON_TYPES.WOODEN_SWORD) {
                gameState.gold -= 300;
                player.weapon = WEAPON_TYPES.WOODEN_SWORD;
                purchased = true;
            }
            break;
        case 'ironSword':
            if (gameState.gold >= 800 && player.weapon !== WEAPON_TYPES.IRON_SWORD) {
                gameState.gold -= 800;
                player.weapon = WEAPON_TYPES.IRON_SWORD;
                purchased = true;
            }
            break;
        case 'steelSword':
            if (gameState.gold >= 2000 && player.weapon !== WEAPON_TYPES.STEEL_SWORD) {
                gameState.gold -= 2000;
                player.weapon = WEAPON_TYPES.STEEL_SWORD;
                purchased = true;
            }
            break;
        case 'diamondSword':
            if (gameState.gold >= 5000 && player.weapon !== WEAPON_TYPES.DIAMOND_SWORD) {
                gameState.gold -= 5000;
                player.weapon = WEAPON_TYPES.DIAMOND_SWORD;
                purchased = true;
            }
            break;
        case 'leatherArmor':
            if (gameState.gold >= 500 && player.armor !== ARMOR_TYPES.LEATHER) {
                gameState.gold -= 500;
                player.armor = ARMOR_TYPES.LEATHER;
                player.updateMaxHealth();
                purchased = true;
            }
            break;
        case 'ironArmor':
            if (gameState.gold >= 1500 && player.armor !== ARMOR_TYPES.IRON) {
                gameState.gold -= 1500;
                player.armor = ARMOR_TYPES.IRON;
                player.updateMaxHealth();
                purchased = true;
            }
            break;
        case 'steelArmor':
            if (gameState.gold >= 3500 && player.armor !== ARMOR_TYPES.STEEL) {
                gameState.gold -= 3500;
                player.armor = ARMOR_TYPES.STEEL;
                player.updateMaxHealth();
                purchased = true;
            }
            break;
        case 'diamondArmor':
            if (gameState.gold >= 8000 && player.armor !== ARMOR_TYPES.DIAMOND) {
                gameState.gold -= 8000;
                player.armor = ARMOR_TYPES.DIAMOND;
                player.updateMaxHealth();
                purchased = true;
            }
            break;
        case 'healthPotion':
            if (gameState.gold >= 200 && player.health < player.maxHealth) {
                gameState.gold -= 200;
                player.health = Math.min(player.maxHealth, player.health + 50);
                purchased = true;
            }
            break;
        case 'bigHealthPotion':
            if (gameState.gold >= 400 && player.health < player.maxHealth) {
                gameState.gold -= 400;
                player.health = Math.min(player.maxHealth, player.health + 100);
                purchased = true;
            }
            break;
        case 'maxHealth':
            if (gameState.gold >= 600) {
                gameState.gold -= 600;
                player.baseMaxHealth += 20;
                player.updateMaxHealth();
                player.health += 20;
                purchased = true;
            }
            break;
        case 'attackBoost':
            if (gameState.gold >= 1000) {
                gameState.gold -= 1000;
                // 모든 무기의 공격력 증가
                Object.keys(WEAPONS).forEach(key => {
                    WEAPONS[key].damage += 5;
                });
                purchased = true;
            }
            break;
    }
    
    if (purchased) {
        soundManager.playBuy();
        updateHealthUI();
        updateGoldUI();
        updateStatsUI();
        updateShopButtons();
    }
}

function nextStage() {
    // 다음 스테이지 초기화
    gameState.score = 0;
    gameState.gold += 50; // 스테이지 클리어 보너스
    
    // 플레이어 위치 리셋
    player.x = 100;
    player.y = 400;
    player.health = player.maxHealth;
    
    // 스테이지가 5의 배수일 때 1.5배씩 강화 (누적)
    const multiplier = Math.pow(1.5, Math.floor(gameState.stage / 5));
    
    // 적 재생성 (더 강하게)
    enemies.forEach((enemy, index) => {
        enemy.isDead = false;
        const baseHealth = 30 + gameState.stage * 5;
        enemy.health = enemy.maxHealth = Math.floor(baseHealth * multiplier);
        enemy.x = enemy.startX;
        enemy.y = enemy.startY;
        enemy.velocityX = 0;
        enemy.velocityY = 0;
        const baseSpeed = 2 + gameState.stage * 0.2;
        enemy.speed = baseSpeed * multiplier;
    });
    
    updateStageUI();
    updateGoldUI();
    updateHealthUI();
    updateScoreUI();
}

// 스탯 분배 관련 변수
let tempStatPoints = {
    attack: 0,
    defense: 0,
    speed: 0
};
let availablePoints = 1;

// 스탯 분배 화면 표시
function showStatDistribution() {
    gameState.inShop = true;
    availablePoints = 1;
    tempStatPoints = { attack: 0, defense: 0, speed: 0 };
    
    document.getElementById('statDistributionScreen').classList.remove('hidden');
    updateStatDistributionUI();
    setupStatDistributionEvents();
}

// 스탯 분배 UI 업데이트
function updateStatDistributionUI() {
    document.getElementById('availablePoints').textContent = availablePoints;
    document.getElementById('attackPoints').textContent = tempStatPoints.attack;
    document.getElementById('defensePoints').textContent = tempStatPoints.defense;
    document.getElementById('speedPoints').textContent = tempStatPoints.speed;
    
    // 버튼 활성화/비활성화
    document.getElementById('attackMinus').disabled = tempStatPoints.attack <= 0;
    document.getElementById('attackPlus').disabled = availablePoints <= 0;
    document.getElementById('defenseMinus').disabled = tempStatPoints.defense <= 0;
    document.getElementById('defensePlus').disabled = availablePoints <= 0;
    document.getElementById('speedMinus').disabled = tempStatPoints.speed <= 0;
    document.getElementById('speedPlus').disabled = availablePoints <= 0;
    document.getElementById('confirmStatButton').disabled = availablePoints > 0;
}

// 스탯 분배 이벤트 설정
function setupStatDistributionEvents() {
    // 힘 증가/감소
    document.getElementById('attackPlus').onclick = () => {
        if (availablePoints > 0) {
            tempStatPoints.attack++;
            availablePoints--;
            updateStatDistributionUI();
        }
    };
    document.getElementById('attackMinus').onclick = () => {
        if (tempStatPoints.attack > 0) {
            tempStatPoints.attack--;
            availablePoints++;
            updateStatDistributionUI();
        }
    };
    
    // 방어력 증가/감소
    document.getElementById('defensePlus').onclick = () => {
        if (availablePoints > 0) {
            tempStatPoints.defense++;
            availablePoints--;
            updateStatDistributionUI();
        }
    };
    document.getElementById('defenseMinus').onclick = () => {
        if (tempStatPoints.defense > 0) {
            tempStatPoints.defense--;
            availablePoints++;
            updateStatDistributionUI();
        }
    };
    
    // 속도 증가/감소
    document.getElementById('speedPlus').onclick = () => {
        if (availablePoints > 0) {
            tempStatPoints.speed++;
            availablePoints--;
            updateStatDistributionUI();
        }
    };
    document.getElementById('speedMinus').onclick = () => {
        if (tempStatPoints.speed > 0) {
            tempStatPoints.speed--;
            availablePoints++;
            updateStatDistributionUI();
        }
    };
    
    // 확인 버튼
    document.getElementById('confirmStatButton').onclick = () => {
        if (availablePoints === 0) {
            // 스탯 적용
            player.statPoints.attack += tempStatPoints.attack;
            player.statPoints.defense += tempStatPoints.defense;
            player.statPoints.speed += tempStatPoints.speed;
            
            player.updateStats();
            updateStatsUI();
            
            // 스테이지 증가 및 다음 스테이지로
            gameState.stage++;
            soundManager.playStageClear();
            nextStage();
            
            // 스탯 분배 화면 닫기
            document.getElementById('statDistributionScreen').classList.add('hidden');
            gameState.inShop = false;
        }
    };
}

// 상점 이벤트 리스너 (게임 초기화 후 설정)
function setupShopEvents() {
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.getAttribute('data-item');
            buyItem(item);
        });
    });
    
    const exitBtn = document.getElementById('exitShopButton');
    if (exitBtn) {
        exitBtn.addEventListener('click', () => {
            closeShop();
        });
    }
}

// 게임 시작
setupShopEvents();
initGame();

// 배경 음악 시작 (사용자 상호작용 후)
document.addEventListener('click', () => {
    if (soundManager.audioContext && soundManager.audioContext.state === 'suspended') {
        soundManager.audioContext.resume();
    }
}, { once: true });

// 배경 음악 시작
setTimeout(() => {
    soundManager.startBackgroundMusic();
}, 1000);

gameLoop();
