// EXIT 67 - Main Game Engine
let scene, camera, renderer;
let activeAnomalyId = 0;
let exitNumber = 0;
let gameState = 'menu'; // menu, playing, paused, gameover, victory
let playerPos = new THREE.Vector3(0, 0, -1.2);
let cameraRotation = { yaw: 0, pitch: 0 };
let keys = {};
let stepTimer = 0;
let flashlightOn = false;
let isTransitioning = false;

// Movement speeds
const walkSpeed = 2.4;
const runSpeed = 4.4;
const playerHeight = 1.6;

// Raycasting for interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(0, 0); // center screen

// References to scene objects
const elements = {
    floor: null,
    floorMaterial: null,
    ceiling: null,
    leftWall: null,
    rightWall: null,
    endWalls: [],
    posters: [],
    posterMaterials: [],
    rightDoors: [],
    doorFront: null,
    doorBack: null,
    doorFrontTextMesh: null,
    doorBackTextMesh: null,
    doorFrontTextMaterial: null,
    doorBackTextMaterial: null,
    exitSign: null,
    exitSignMaterial: null,
    hydrant: null,
    hydrantParts: [],
    lights: [],
    flashlight: null,
    flashlightOn: false,
    victoryAmbientLight: null,
    stairsGroup: null
};

// Start the game
function initGame() {
    setupThreeJS();
    setupEventListeners();
    generateScene();
    updateHUD();
    
    // Hide loading / show start menu
    document.getElementById('menu-start').classList.add('active');
    
    // Populate anomaly dictionary list
    populateAnomalyList();
    
    animate(0);
}

function setupThreeJS() {
    const container = document.getElementById('canvas-container');
    
    // Create Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050508);
    scene.fog = new THREE.FogExp2(0x050508, 0.05);

    // Create Camera
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.rotation.order = 'YXZ'; // FPS looking style
    scene.add(camera);

    // Create Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // Initial Flashlight (attached to camera)
    const flash = new THREE.SpotLight(0xffffff, 0, 25, Math.PI / 5, 0.5, 1);
    flash.castShadow = true;
    flash.shadow.mapSize.width = 1024;
    flash.shadow.mapSize.height = 1024;
    camera.add(flash);
    camera.add(flash.target);
    flash.target.position.set(0, 0.2, -1);
    elements.flashlight = flash;
}

function setupEventListeners() {
    window.addEventListener('resize', onWindowResize);
    
    // Keyboard inputs
    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        keys[key] = true;
        
        if (e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault(); // Prevent space from clicking focused buttons or scrolling
        }
        
        if (key === 'x' && gameState === 'playing') {
            toggleFlashlight();
        }
        
        if (e.key === 'Escape' && gameState === 'playing') {
            togglePauseMenu();
        }
    });
    
    window.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });

    // Mouse looking via Pointer Lock API
    const container = document.getElementById('canvas-container');
    
    container.addEventListener('click', () => {
        if (gameState === 'playing' && document.pointerLockElement !== container) {
            container.requestPointerLock();
        }
    });

    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement !== container && gameState === 'playing') {
            // Pause if user exited pointer lock manually
            togglePauseMenu();
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement !== container || gameState !== 'playing') return;
        
        const sensitivity = 0.002;
        cameraRotation.yaw -= e.movementX * sensitivity;
        cameraRotation.pitch -= e.movementY * sensitivity;
        
        // Clamp pitch to avoid turning upside down (unless reverse gravity is active, which is handled at rotation display level)
        cameraRotation.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, cameraRotation.pitch));
        
        camera.rotation.x = cameraRotation.pitch;
        camera.rotation.y = cameraRotation.yaw;
    });

    // Handle mouse click for opening doors
    window.addEventListener('click', (e) => {
        if (gameState !== 'playing' || document.pointerLockElement !== container) return;
        
        // Raycast from screen center
        raycaster.setFromCamera(mouse, camera);
        
        // We only care about front and back doors
        const interactables = [];
        if (elements.doorFront) interactables.push(elements.doorFront);
        if (elements.doorBack) interactables.push(elements.doorBack);
        
        // Allow clicking open first door for keyhole anomaly
        if (activeAnomalyId === 38 && elements.rightDoors[0]) {
            interactables.push(elements.rightDoors[0]);
        }

        const intersects = raycaster.intersectObjects(interactables, true);
        if (intersects.length > 0) {
            // Find parent door mesh
            let hitObj = intersects[0].object;
            while (hitObj.parent && hitObj.name !== 'door_front' && hitObj.name !== 'door_back' && hitObj.name !== 'door_right_0') {
                hitObj = hitObj.parent;
            }
            
            const dist = playerPos.distanceTo(hitObj.position);
            if (dist < 4.0) {
                if (hitObj.name === 'door_front') {
                    interactWithFrontDoor();
                } else if (hitObj.name === 'door_back') {
                    interactWithBackDoor();
                } else if (hitObj.name === 'door_right_0' && activeAnomalyId === 38) {
                    // Clicking the open keyhole door triggers gameover
                    triggerGameOver('red_light');
                }
            }
        }
    });

    // Button clicks in menus
    document.getElementById('btn-start').addEventListener('click', startGame);
    document.getElementById('btn-show-anomalies').addEventListener('click', () => {
        document.getElementById('menu-start').classList.remove('active');
        document.getElementById('menu-anomalies').classList.add('active');
    });
    document.getElementById('btn-close-anomalies').addEventListener('click', () => {
        document.getElementById('menu-anomalies').classList.remove('active');
        document.getElementById('menu-start').classList.add('active');
    });
    document.getElementById('btn-resume').addEventListener('click', resumeGame);
    document.getElementById('btn-restart-pause').addEventListener('click', restartGame);
    document.getElementById('btn-main-pause').addEventListener('click', returnToMainMenu);
    document.getElementById('btn-restart-gameover').addEventListener('click', restartGame);
    document.getElementById('btn-restart-victory').addEventListener('click', restartGame);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function toggleFlashlight() {
    flashlightOn = !flashlightOn;
    elements.flashlightOn = flashlightOn;
    elements.flashlight.intensity = flashlightOn ? 1.5 : 0;
    
    // Low battery anomaly overrides
    if (activeAnomalyId === 52) {
        elements.flashlight.intensity = flashlightOn ? 0.25 : 0;
    }
    
    window.gameAudio.playFlashlightClick();
    updateHUD();
}

function togglePauseMenu() {
    if (gameState === 'playing') {
        gameState = 'paused';
        document.exitPointerLock();
        document.getElementById('menu-pause').classList.add('active');
    }
}

function resumeGame() {
    if (document.activeElement) document.activeElement.blur();
    gameState = 'playing';
    document.getElementById('menu-pause').classList.remove('active');
    document.getElementById('canvas-container').requestPointerLock();
}

function startGame() {
    if (document.activeElement) document.activeElement.blur();
    // Initialize procedural audio context
    window.gameAudio.init();
    
    gameState = 'playing';
    document.getElementById('menu-start').classList.remove('active');
    document.getElementById('canvas-container').requestPointerLock();
    
    resetLevelState(0); // spawn at exit 0
}

function restartGame() {
    if (document.activeElement) document.activeElement.blur();
    window.gameAudio.init();
    
    document.getElementById('menu-gameover').classList.remove('active');
    document.getElementById('menu-victory').classList.remove('active');
    document.getElementById('menu-pause').classList.remove('active');
    document.getElementById('red-gameover-overlay').classList.remove('active');
    document.getElementById('handprint-jumpscare').style.display = 'none';
    document.querySelector('.screamer-hand').classList.remove('active');
    
    exitNumber = 0;
    gameState = 'playing';
    document.getElementById('canvas-container').requestPointerLock();
    
    resetLevelState(0);
}

function returnToMainMenu() {
    if (document.activeElement) document.activeElement.blur();
    
    // Hide pause overlay
    document.getElementById('menu-pause').classList.remove('active');
    
    // Reset progression
    exitNumber = 0;
    gameState = 'menu';
    updateHUD();
    
    // Rebuild lobby / normal hall
    resetLevelState(0);
    
    // Show main start menu
    document.getElementById('menu-start').classList.add('active');
}

function updateHUD() {
    document.getElementById('val-exit').innerText = exitNumber;
    document.getElementById('val-flashlight').innerText = flashlightOn ? "ON" : "OFF";
    document.getElementById('val-flashlight').style.color = flashlightOn ? "#00ffcc" : "#94a3b8";
    
    // exitNumber가 68번이면 HUD에서 출구 표시(hud-exit-card) 숨김
    const exitCard = document.getElementById('hud-exit-card');
    if (exitCard) {
        if (exitNumber === 68) {
            exitCard.style.display = 'none';
        } else {
            exitCard.style.display = 'flex';
        }
    }
}

// Visual layout generation
function generateScene() {
    // Clear old elements if rebuilding
    elements.posters.forEach(p => scene.remove(p));
    elements.rightDoors.forEach(d => scene.remove(d));
    if (elements.endWalls) {
        elements.endWalls.forEach(w => scene.remove(w));
    }
    elements.posters = [];
    elements.posterMaterials = [];
    elements.rightDoors = [];
    elements.endWalls = [];
    
    if (elements.floor) { scene.remove(elements.floor); elements.floor = null; }
    if (elements.ceiling) { scene.remove(elements.ceiling); elements.ceiling = null; }
    if (elements.leftWall) { scene.remove(elements.leftWall); elements.leftWall = null; }
    if (elements.rightWall) { scene.remove(elements.rightWall); elements.rightWall = null; }
    if (elements.doorFront) { scene.remove(elements.doorFront); elements.doorFront = null; }
    if (elements.doorBack) { scene.remove(elements.doorBack); elements.doorBack = null; }
    if (elements.doorFrontTextMesh) { scene.remove(elements.doorFrontTextMesh); elements.doorFrontTextMesh = null; }
    if (elements.doorBackTextMesh) { scene.remove(elements.doorBackTextMesh); elements.doorBackTextMesh = null; }
    if (elements.exitSign) { scene.remove(elements.exitSign); elements.exitSign = null; }
    if (elements.hydrant) { scene.remove(elements.hydrant); elements.hydrant = null; elements.hydrantParts = []; }
    
    elements.lights.forEach(l => scene.remove(l));
    elements.lights = [];

    if (elements.stairsGroup) {
        scene.remove(elements.stairsGroup);
        elements.stairsGroup = null;
    }

    if (elements.victoryAmbientLight) {
        scene.remove(elements.victoryAmbientLight);
        elements.victoryAmbientLight = null;
    }

    // 68번 방일 때 배경색과 포그를 흰색으로 설정하여 계단 부근의 어둠을 제거하고 밝게 만듦
    if (scene) {
        if (exitNumber === 68) {
            // 화이트아웃(계단 윤곽 상실) 방지를 위해 약간 톤이 다운된 밝은 백회색 배경 적용
            scene.background = new THREE.Color(0xf0f0f5);
            if (scene.fog) {
                scene.fog.color.setHex(0xf0f0f5);
                scene.fog.density = 0.005; // 안개 밀도를 매우 연하게 낮춰 30m 밖의 계단 입체감이 보이도록 시야 대폭 확장
            }
            
            // 계단 주위의 물리적 그림자 어둠을 지우고 입체감(질감)을 살릴 정도의 부드러운 환경광 생성
            const ambLight = new THREE.AmbientLight(0xffffff, 0.7);
            scene.add(ambLight);
            elements.victoryAmbientLight = ambLight;
        } else {
            scene.background = new THREE.Color(0x050508);
            if (scene.fog) {
                scene.fog.color.setHex(0x050508);
                scene.fog.density = (activeAnomalyId === 15) ? 0.008 : 0.05;
            }
        }
    }

    // Decide corridor dimensions
    const length = (activeAnomalyId === 15) ? 167 : 30;
    const width = 4;
    const height = 3;

    // Materials
    // Procedural concrete texture for walls
    const wallCanvas = document.createElement('canvas');
    wallCanvas.width = 256; wallCanvas.height = 256;
    const wCtx = wallCanvas.getContext('2d');
    wCtx.fillStyle = '#aaaaaa';
    wCtx.fillRect(0,0,256,256);
    wCtx.strokeStyle = '#888888';
    wCtx.lineWidth = 1;
    wCtx.strokeRect(0,0,256,256);
    const wallTex = new THREE.CanvasTexture(wallCanvas);
    wallTex.wrapS = THREE.RepeatWrapping;
    wallTex.wrapT = THREE.RepeatWrapping;
    wallTex.repeat.set(length / 2, height / 2);

    const wallMaterial = new THREE.MeshStandardMaterial({
        map: wallTex,
        roughness: 0.8,
        metalness: 0.1
    });

    const woodFloorCanvas = AnomalySystem.drawWoodFloor();
    const woodFloorTex = new THREE.CanvasTexture(woodFloorCanvas);
    woodFloorTex.wrapS = THREE.RepeatWrapping;
    woodFloorTex.wrapT = THREE.RepeatWrapping;
    woodFloorTex.repeat.set(4, length);

    const floorMaterial = new THREE.MeshStandardMaterial({
        map: woodFloorTex,
        roughness: 0.4,
        metalness: 0.1
    });
    elements.floorMaterial = floorMaterial;

    const ceilingMaterial = new THREE.MeshStandardMaterial({
        color: 0x111115,
        roughness: 0.9
    });

    // Geometries
    const floorGeo = new THREE.PlaneGeometry(width, length);
    const ceilingGeo = new THREE.PlaneGeometry(width, length);
    const wallGeo = new THREE.PlaneGeometry(length, height);

    // Floor
    elements.floor = new THREE.Mesh(floorGeo, floorMaterial);
    elements.floor.rotation.x = -Math.PI / 2;
    elements.floor.position.set(0, 0, -length / 2);
    elements.floor.receiveShadow = true;
    scene.add(elements.floor);

    // Ceiling
    elements.ceiling = new THREE.Mesh(ceilingGeo, ceilingMaterial);
    elements.ceiling.rotation.x = Math.PI / 2;
    elements.ceiling.position.set(0, height, -length / 2);
    elements.ceiling.receiveShadow = true;
    scene.add(elements.ceiling);

    // Left Wall (X = -2)
    elements.leftWall = new THREE.Mesh(wallGeo, wallMaterial);
    elements.leftWall.rotation.y = Math.PI / 2;
    elements.leftWall.position.set(-width / 2, height / 2, -length / 2);
    elements.leftWall.receiveShadow = true;
    scene.add(elements.leftWall);

    // Right Wall (X = 2)
    elements.rightWall = new THREE.Mesh(wallGeo, wallMaterial);
    elements.rightWall.rotation.y = -Math.PI / 2;
    elements.rightWall.position.set(width / 2, height / 2, -length / 2);
    elements.rightWall.receiveShadow = true;
    scene.add(elements.rightWall);

    // End walls to close the Z=0 and Z=-30 voids around doors
    const doorW = 1.04;
    const doorH = 2.09;
    const sideW = (width - doorW) / 2; // 1.48
    const topH = height - doorH; // 0.91
    const sideGeo = new THREE.PlaneGeometry(sideW, height);
    const topGeo = new THREE.PlaneGeometry(doorW, topH);
    elements.endWalls = [];

    const buildWallAt = (z, isBack) => {
        const rotY = isBack ? Math.PI : 0;
        const zOffset = isBack ? -0.015 : 0.015;
        const actualZ = z + zOffset;

        // Left side panel
        const left = new THREE.Mesh(sideGeo, wallMaterial);
        left.position.set(-width/2 + sideW/2, height/2, actualZ);
        left.rotation.y = rotY;
        left.receiveShadow = true;
        scene.add(left);
        elements.endWalls.push(left);

        // Right side panel
        const right = new THREE.Mesh(sideGeo, wallMaterial);
        right.position.set(width/2 - sideW/2, height/2, actualZ);
        right.rotation.y = rotY;
        right.receiveShadow = true;
        scene.add(right);
        elements.endWalls.push(right);

        // Top panel
        const top = new THREE.Mesh(topGeo, wallMaterial);
        top.position.set(0, height - topH/2, actualZ);
        top.rotation.y = rotY;
        top.receiveShadow = true;
        scene.add(top);
        elements.endWalls.push(top);
    };

    buildWallAt(0, true); // Back Wall
    if (activeAnomalyId !== 15 && exitNumber !== 68) {
        buildWallAt(-length, false); // 68번 방일 때는 전방 벽을 없앰 (계단으로 통하도록 뚫음)
    }

    // Baseboard trim for aesthetic polish
    const baseboardGeo = new THREE.BoxGeometry(0.05, 0.15, length);
    const baseboardLeft = new THREE.Mesh(baseboardGeo, new THREE.MeshStandardMaterial({ color: 0x0f172a }));
    baseboardLeft.position.set(-width/2 + 0.02, 0.075, -length/2);
    scene.add(baseboardLeft);
    const baseboardRight = baseboardLeft.clone();
    baseboardRight.position.x = width/2 - 0.02;
    scene.add(baseboardRight);

    // Ceiling lights placement
    const numLights = (activeAnomalyId === 15) ? 18 : 4;
    const lightSpacing = length / numLights;
    const lightGeo = new THREE.BoxGeometry(0.8, 0.08, 0.15);
    const lightEmitMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (let i = 0; i < numLights; i++) {
        const zPos = -lightSpacing * (i + 0.5);
        
        // Light fixture
        const fixture = new THREE.Mesh(lightGeo, lightEmitMat);
        fixture.position.set(0, height - 0.04, zPos);
        scene.add(fixture);
        
        // Actual light source
        const light = new THREE.PointLight(0xffffff, 0.5, 18);
        light.position.set(0, height - 0.1, zPos);
        light.castShadow = (activeAnomalyId !== 15); // WebGL 텍스처 한계로 인한 렌더링 무력화(블랙아웃) 방지
        light.shadow.bias = -0.002;
        light.shadow.mapSize.width = 512;
        light.shadow.mapSize.height = 512;
        light.userData = { originalZ: zPos }; // backup position
        scene.add(light);
        elements.lights.push(light);
    }

    // Spawn exit number sign (Left wall, X = -1.98)
    const signGeo = new THREE.PlaneGeometry(0.6, 0.3);
    const signMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    elements.exitSignMaterial = signMat;
    elements.exitSign = new THREE.Mesh(signGeo, signMat);
    elements.exitSign.rotation.y = Math.PI / 2;
    elements.exitSign.position.set(-width/2 + 0.02, 1.8, -3.0);
    scene.add(elements.exitSign);

    // Spawn 4 posters on the left wall (Z = -7, -13, -19, -25)
    // If Z length is normal
    if (activeAnomalyId !== 15) {
        const posterZ = [-7, -13, -19, -25];
        const posterGeo = new THREE.PlaneGeometry(0.9, 1.35);

        for (let i = 0; i < 4; i++) {
            const pMat = new THREE.MeshStandardMaterial({ roughness: 0.5 });
            elements.posterMaterials.push(pMat);

            const poster = new THREE.Mesh(posterGeo, pMat);
            poster.rotation.y = Math.PI / 2;
            poster.position.set(-width/2 + 0.01, 1.5, posterZ[i]);
            poster.userData = { originalZ: posterZ[i] };
            scene.add(poster);
            elements.posters.push(poster);
        }
    }

    // Doors on the right wall (normal: 3 doors at Z = -8, -15, -22)
    // If anomaly 15, we draw 67 doors!
    const doorCount = (activeAnomalyId === 15) ? 67 : 3;
    const doorZ = [];
    if (activeAnomalyId === 15) {
        // distribute 67 doors from Z=-4 to Z=-163
        const doorSpacing = 159.0 / 66.0;
        for (let i = 0; i < 67; i++) {
            doorZ.push(-4.0 - i * doorSpacing);
        }
    } else {
        doorZ.push(-8.0, -15.0, -22.0);
    }

    for (let i = 0; i < doorCount; i++) {
        const doorGroup = createDoorMesh(`door_right_${i}`);
        doorGroup.position.set(width / 2 - 0.02, 0, doorZ[i]);
        doorGroup.rotation.y = -Math.PI / 2;
        scene.add(doorGroup);
        elements.rightDoors.push(doorGroup);
    }

    // Fire Hydrant (normal: between door 1 and 2, at Z = -11.5)
    if (activeAnomalyId !== 15) {
        elements.hydrant = createFireHydrantMesh();
        elements.hydrant.position.set(width / 2 - 0.15, 0, -11.5);
        scene.add(elements.hydrant);
    }

    // Front Exit Door ("no anomaly") at Z = -length
    // In anomaly 15, front door is gone and replaced by graffiti wall
    if (activeAnomalyId !== 15) {
        elements.doorFront = createDoorMesh('door_front');
        elements.doorFront.position.set(0, 0, -length + 0.02);
        elements.doorFront.rotation.y = 0;
        scene.add(elements.doorFront);

        // Neon Sign board above door
        const boardGeo = new THREE.PlaneGeometry(1.2, 0.3);
        const boardMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
        elements.doorFrontTextMaterial = boardMat;
        elements.doorFrontTextMesh = new THREE.Mesh(boardGeo, boardMat);
        elements.doorFrontTextMesh.position.set(0, 2.3, -length + 0.04);
        scene.add(elements.doorFrontTextMesh);
    } else {
        // Draw bright graffiti wall at Z = -167
        const graffitiGeo = new THREE.PlaneGeometry(width, height);
        const grafCanvas = document.createElement('canvas');
        grafCanvas.width = 512; grafCanvas.height = 384;
        const gCtx = grafCanvas.getContext('2d');
        gCtx.fillStyle = '#ffffff';
        gCtx.fillRect(0,0,512,384);
        gCtx.fillStyle = '#ff3366';
        gCtx.font = 'bold 70px "Share Tech Mono"';
        gCtx.textAlign = 'center';
        gCtx.fillText('six seven', 256, 200);
        
        const graffitiMat = new THREE.MeshBasicMaterial({
            map: new THREE.CanvasTexture(grafCanvas)
        });
        const grafWall = new THREE.Mesh(graffitiGeo, graffitiMat);
        grafWall.position.set(0, height/2, -166.9);
        scene.add(grafWall);
    }

    // Back Exit Door ("yes anomaly") at Z = 0
    elements.doorBack = createDoorMesh('door_back');
    elements.doorBack.position.set(0, 0, -0.02);
    elements.doorBack.rotation.y = Math.PI;
    scene.add(elements.doorBack);

    const boardBackGeo = new THREE.PlaneGeometry(1.2, 0.3);
    const boardBackMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    elements.doorBackTextMaterial = boardBackMat;
    elements.doorBackTextMesh = new THREE.Mesh(boardBackGeo, boardBackMat);
    elements.doorBackTextMesh.position.set(0, 2.3, -0.04);
    elements.doorBackTextMesh.rotation.y = Math.PI; // Face the corridor to avoid mirroring
    scene.add(elements.doorBackTextMesh);

    // Re-render procedural sign materials
    const canvasFront = AnomalySystem.drawDoorText("no anomaly", '#ff3366');
    if (elements.doorFrontTextMaterial) {
        elements.doorFrontTextMaterial.map = new THREE.CanvasTexture(canvasFront);
        elements.doorFrontTextMaterial.needsUpdate = true;
    }

    const canvasBack = AnomalySystem.drawDoorText("yes anomaly", '#00ff66');
    elements.doorBackTextMaterial.map = new THREE.CanvasTexture(canvasBack);
    elements.doorBackTextMaterial.needsUpdate = true;

    // If exit number is 68 and no anomaly is active, spawn the victory stairs mesh instead of front door!
    if (exitNumber === 68 && activeAnomalyId === 0) {
        if (elements.doorFront) {
            scene.remove(elements.doorFront);
            elements.doorFront = null;
        }
        if (elements.doorFrontTextMesh) {
            scene.remove(elements.doorFrontTextMesh);
            elements.doorFrontTextMesh = null;
        }
        if (elements.doorBack) {
            scene.remove(elements.doorBack);
            elements.doorBack = null;
        }
        if (elements.doorBackTextMesh) {
            scene.remove(elements.doorBackTextMesh);
            elements.doorBackTextMesh = null;
        }
        
        // Spawn 3D stairs leading up
        const numSteps = 14;
        const stairW = 4.0;
        const stairTotalDepth = 5.0;
        const stairTotalHeight = 2.4;
        const stepDepth = stairTotalDepth / numSteps;
        const stepHeight = stairTotalHeight / numSteps;
        
        elements.stairsGroup = new THREE.Group();
        for (let i = 0; i < numSteps; i++) {
            const stepGeo = new THREE.BoxGeometry(stairW, stepHeight, stepDepth);
            
            // 조명과 안개에 의한 화이트아웃(가시성 소실)을 근절하기 위해 
            // 그림자 연산이 배제되고 형태가 또렷하게 대비되는 MeshBasicMaterial과 회청색 그라데이션 적용
            const baseVal = 70 + Math.floor((i / numSteps) * 50); // 아래(70)에서 위(120)로 갈수록 밝아짐
            const stripeOffset = (i % 2 === 0) ? 12 : 0; // 계단 한 단 한 단이 뚜렷하게 구분되도록 패턴 음영 부여
            const r = (baseVal + stripeOffset) / 255;
            const g = (baseVal + 10 + stripeOffset) / 255;
            const b = (baseVal + 20 + stripeOffset) / 255;
            const stepColor = new THREE.Color(r, g, b);
            
            const stepMat = new THREE.MeshBasicMaterial({ color: stepColor });
            const step = new THREE.Mesh(stepGeo, stepMat);
            
            // Stair steps coordinate starts at Z = -length and climbs up (further into negative Z)
            step.position.set(0, (i + 0.5) * stepHeight, -length - (i + 0.5) * stepDepth);
            elements.stairsGroup.add(step);
        }
        scene.add(elements.stairsGroup);
    }
}

// Procedural Door mesh factory
function createDoorMesh(name) {
    const group = new THREE.Group();
    group.name = name;

    // Door Frame (metallic)
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 });
    const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.05, 0.08), frameMat);
    leftFrame.position.set(-0.48, 1.025, 0);
    group.add(leftFrame);
    
    const rightFrame = leftFrame.clone();
    rightFrame.position.x = 0.48;
    group.add(rightFrame);

    const topFrame = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.08, 0.08), frameMat);
    topFrame.position.set(0, 2.05, 0);
    group.add(topFrame);

    // Door Panel (colored wood look)
    // Procedural door texture
    const doorCanvas = document.createElement('canvas');
    doorCanvas.width = 128; doorCanvas.height = 256;
    const dCtx = doorCanvas.getContext('2d');
    dCtx.fillStyle = '#2d1a10'; // Brown wood base
    dCtx.fillRect(0, 0, 128, 256);
    dCtx.strokeStyle = '#402719';
    dCtx.lineWidth = 6;
    dCtx.strokeRect(10, 10, 108, 108); // panel panels
    dCtx.strokeRect(10, 130, 108, 108);
    
    const doorTex = new THREE.CanvasTexture(doorCanvas);
    const panelMat = new THREE.MeshStandardMaterial({
        map: doorTex,
        roughness: 0.6,
        metalness: 0.1
    });

    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.88, 2.0, 0.04), panelMat);
    panel.position.set(0, 1.0, 0);
    panel.castShadow = true;
    panel.receiveShadow = true;
    group.add(panel);

    // Door Handle (brass)
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.1 });
    const handleGroup = new THREE.Group();
    handleGroup.name = "handle";
    
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.01, 8), handleMat);
    base.rotation.x = Math.PI / 2;
    handleGroup.add(base);

    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.02), handleMat);
    bar.position.set(0.04, 0, 0.02);
    handleGroup.add(bar);

    // Handle sits on the right side of panel
    handleGroup.position.set(0.32, 1.0, 0.03);
    group.add(handleGroup);

    return group;
}

// Procedural Fire Hydrant factory
function createFireHydrantMesh() {
    const group = new THREE.Group();
    
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xcc1111, roughness: 0.5 });
    elements.hydrantParts = [bodyMat];

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 });

    // Main barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.7, 16), bodyMat);
    barrel.position.y = 0.35;
    barrel.castShadow = true;
    group.add(barrel);

    // Cap sphere
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 8, 0, Math.PI*2, 0, Math.PI/2), bodyMat);
    cap.position.y = 0.7;
    cap.castShadow = true;
    group.add(cap);

    // Base ring
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 16), metalMat);
    base.position.y = 0.03;
    group.add(base);

    // Outlets on sides
    const outletGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.1, 12);
    const outletL = new THREE.Mesh(outletGeo, metalMat);
    outletL.rotation.z = Math.PI / 2;
    outletL.position.set(-0.15, 0.45, 0);
    group.add(outletL);

    const outletR = outletL.clone();
    outletR.position.x = 0.15;
    group.add(outletR);

    // Front gauge
    const gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12), metalMat);
    gauge.rotation.x = Math.PI / 2;
    gauge.position.set(0, 0.5, 0.14);
    group.add(gauge);

    return group;
}

// Reset level coordinates and decide anomaly
function resetLevelState(forcedExitNum = null, forcedAnomalyId = null) {
    isTransitioning = true; // Lock interactions during fade-in
    
    if (forcedExitNum !== null) {
        exitNumber = forcedExitNum;
    }
    
    // Choose active anomaly
    if (forcedAnomalyId !== null) {
        activeAnomalyId = forcedAnomalyId;
    } else {
        if (exitNumber === 0 || exitNumber >= 68) {
            activeAnomalyId = 0; // Exit 0 and Exit 68+ are ALWAYS normal
        } else {
            // 67% chance of anomaly
            const isAnomaly = Math.random() < 0.67;
            if (isAnomaly) {
                // Select random anomaly from 1 to 67
                activeAnomalyId = Math.floor(Math.random() * 67) + 1;
            } else {
                activeAnomalyId = 0;
            }
        }
    }

    console.log(`Exit: ${exitNumber}. Active Anomaly ID: ${activeAnomalyId}`);
    
    try {
        // Re-generate geometry/scene map
        generateScene();
        
        // Apply visual effects/hooks from anomaly system
        AnomalySystem.apply(scene, activeAnomalyId, elements, exitNumber);
    } catch (error) {
        console.error("Critical error during resetLevelState:", error);
        // Fallback to normal corridor (anomaly ID 0) to avoid crash/black screen
        activeAnomalyId = 0;
        try {
            generateScene();
            AnomalySystem.clear(scene, elements, exitNumber);
        } catch (innerError) {
            console.error("Failed to recover to normal corridor:", innerError);
        }
    }
    
    // Reset player position near the yes anomaly door (Z = 0)
    playerPos.set(0, 0, -1.2);
    cameraRotation.yaw = 0;
    cameraRotation.pitch = 0;
    camera.rotation.set(0, 0, 0);
    
    // Fade in from black
    const overlay = document.getElementById('red-gameover-overlay');
    overlay.style.background = 'black';
    overlay.classList.add('active');
    overlay.style.opacity = 1;
    
    let fadeVal = 1;
    const fadeTimer = setInterval(() => {
        fadeVal -= 0.08;
        if (fadeVal <= 0) {
            clearInterval(fadeTimer);
            overlay.classList.remove('active');
            overlay.style.opacity = 0;
            overlay.style.background = ''; // reset for gameover
            isTransitioning = false; // Reset transitioning flag
        } else {
            overlay.style.opacity = fadeVal;
        }
    }, 30);

    updateHUD();
}

// User clicked front door ("no anomaly" door)
function interactWithFrontDoor() {
    if (isTransitioning) return;
    isTransitioning = true;
    const hasAnomaly = (activeAnomalyId !== 0);
    
    // Transition fade out
    fadeOutScreenAndTrigger(() => {
        if (!hasAnomaly) {
            // Correct choice!
            exitNumber++;
            window.gameAudio.playSuccess();
            if (exitNumber >= 68) {
                // Should show stairs next round, so we don't end immediately. 
                // Reaching 68 shows the stairs, which they must walk up to trigger victory!
                resetLevelState();
            } else {
                resetLevelState();
            }
        } else {
            // Incorrect! Go back 1 stage (clamp at 0)
            exitNumber = Math.max(0, exitNumber - 1);
            window.gameAudio.playFail();
            resetLevelState();
        }
    });
}

// User clicked back door ("yes anomaly" door)
function interactWithBackDoor() {
    if (isTransitioning) return;
    isTransitioning = true;
    const hasAnomaly = (activeAnomalyId !== 0);

    fadeOutScreenAndTrigger(() => {
        if (hasAnomaly) {
            // Correct choice!
            exitNumber++;
            window.gameAudio.playSuccess();
            resetLevelState();
        } else {
            // Incorrect! Go back 1 stage (clamp at 0)
            exitNumber = Math.max(0, exitNumber - 1);
            window.gameAudio.playFail();
            resetLevelState();
        }
    });
}

function fadeOutScreenAndTrigger(callback) {
    const overlay = document.getElementById('red-gameover-overlay');
    overlay.style.background = 'black';
    overlay.classList.add('active');
    overlay.style.opacity = 0;
    
    let fadeVal = 0;
    const fadeTimer = setInterval(() => {
        fadeVal += 0.1;
        overlay.style.opacity = fadeVal;
        if (fadeVal >= 1.0) {
            clearInterval(fadeTimer);
            try {
                callback();
            } catch (error) {
                console.error("Critical error during fade-out transition callback:", error);
                isTransitioning = false;
                overlay.classList.remove('active');
                overlay.style.opacity = 0;
            }
        }
    }, 25);
}

// Trigger Game Over with specific reason
function triggerGameOver(reason) {
    if (gameState !== 'playing') return;
    gameState = 'gameover';
    
    window.gameAudio.playGameOver();
    
    // Animate player falling over
    let fallRotX = cameraRotation.pitch;
    let fallRotZ = 0;
    let fallPosY = camera.position.y;
    
    const targetRotX = (reason === 'blue_hand') ? -0.1 : -Math.PI / 3;
    const targetRotZ = (reason === 'blue_hand') ? Math.PI / 2 : 0;
    const targetPosY = (reason === 'blue_hand') ? 0.05 : 0.3;

    const fallInterval = setInterval(() => {
        fallRotX = THREE.MathUtils.lerp(fallRotX, targetRotX, 0.1);
        fallRotZ = THREE.MathUtils.lerp(fallRotZ, targetRotZ, 0.1);
        fallPosY = THREE.MathUtils.lerp(fallPosY, targetPosY, 0.1);
        camera.rotation.x = fallRotX;
        camera.rotation.z = fallRotZ;
        camera.position.y = fallPosY;
    }, 30);
    
    setTimeout(() => {
        clearInterval(fallInterval);
    }, 900);

    // Apply special overlays
    if (reason === 'blue_hand') {
        const handDiv = document.getElementById('handprint-jumpscare');
        handDiv.style.display = 'flex';
        setTimeout(() => {
            document.querySelector('.screamer-hand').classList.add('active');
        }, 50);
    }
    
    // Fade out to black and auto-respawn after 1.5s
    setTimeout(() => {
        const overlay = document.getElementById('red-gameover-overlay');
        overlay.style.background = 'black';
        overlay.classList.add('active');
        overlay.style.opacity = 0;
        
        let fadeVal = 0;
        const fadeTimer = setInterval(() => {
            fadeVal += 0.08;
            overlay.style.opacity = fadeVal;
            if (fadeVal >= 1.0) {
                clearInterval(fadeTimer);
                
                // Reset jumpscare overlays
                document.getElementById('handprint-jumpscare').style.display = 'none';
                document.querySelector('.screamer-hand').classList.remove('active');
                
                // Reset state to exit 0
                exitNumber = 0;
                gameState = 'playing';
                updateHUD();
                
                // Ensure pointer lock is maintained/re-requested
                document.getElementById('canvas-container').requestPointerLock();
                
                resetLevelState(0);
            }
        }, 30);
    }, 1500);
}

// Trigger Victory ending
function triggerVictory() {
    if (gameState !== 'playing') return;
    gameState = 'victory';
    document.exitPointerLock();
    
    window.gameAudio.playVictory();
    
    // Fade to white
    const overlay = document.getElementById('red-gameover-overlay');
    overlay.style.background = 'white';
    overlay.classList.add('active');
    overlay.style.opacity = 0;
    
    let fadeVal = 0;
    const fadeTimer = setInterval(() => {
        fadeVal += 0.05;
        overlay.style.opacity = fadeVal;
        if (fadeVal >= 1.0) {
            clearInterval(fadeTimer);
            
            // Wait 1.5 seconds in white screen, then display "Thank you for playing" card
            setTimeout(() => {
                const victoryMenu = document.getElementById('menu-victory');
                victoryMenu.classList.add('active');
                
                // Wait another 1.5 seconds, then return to the main start menu automatically
                setTimeout(() => {
                    victoryMenu.classList.remove('active');
                    
                    exitNumber = 0;
                    gameState = 'menu';
                    updateHUD();
                    
                    // Reset levels (rebuilds scene at exit 0 and fades in from black)
                    resetLevelState(0);
                    
                    // Show start menu
                    document.getElementById('menu-start').classList.add('active');
                }, 1500);
            }, 1500);
        }
    }, 30);
}

// Core Game Loop
let lastTime = 0;
function animate(currentTime) {
    requestAnimationFrame(animate);
    
    if (lastTime === 0) lastTime = currentTime;
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1); // clamp delta
    lastTime = currentTime;

    if (gameState !== 'playing') {
        if (gameState === 'gameover' || gameState === 'victory') {
            renderer.render(scene, camera);
        }
        return;
    }

    // Movement calculation
    let isMoving = false;
    let isRunning = keys[' '] || keys['spacebar'];
    
    // 58. 초중력 anomaly restricts running
    if (activeAnomalyId === 58) {
        isRunning = false;
    }

    const moveDirection = new THREE.Vector3();
    if (keys['w'] || keys['ㅈ']) moveDirection.z -= 1;
    if (keys['s'] || keys['ㄴ']) moveDirection.z += 1;
    if (keys['a'] || keys['ㅁ']) moveDirection.x -= 1;
    if (keys['d'] || keys['ㅇ']) moveDirection.x += 1;
    
    if (moveDirection.lengthSq() > 0) {
        isMoving = true;
        moveDirection.normalize();
    }

    // Compute directions based on camera look
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();

    const moveVec = new THREE.Vector3();
    moveVec.addScaledVector(forward, -moveDirection.z);
    moveVec.addScaledVector(right, moveDirection.x);
    if (moveVec.lengthSq() > 0) {
        moveVec.normalize(); // Keep speed consistent when moving diagonally
    }
    
    // Apply speed modifiers
    let currentSpeed = isRunning ? runSpeed : walkSpeed;
    
    // 57. 끈적한 걸음 anomaly reduces walk speed drastically
    if (activeAnomalyId === 57 && !isRunning) {
        currentSpeed = walkSpeed * 0.1;
    }

    // Apply movement vector
    if (isMoving && elements.pitState !== 'falling') {
        playerPos.addScaledVector(moveVec, currentSpeed * deltaTime);
    }

    // Floor collision boundaries
    const currentCorridorLength = (activeAnomalyId === 15) ? 167 : 30;
    let minZ = -currentCorridorLength + 0.5;
    let maxZ = -0.5;
    
    if (exitNumber === 68 && activeAnomalyId === 0) {
        // Let player walk further forward up the stairs
        minZ = -currentCorridorLength - 4.8;
    }

    // Wall collision clamping
    playerPos.x = THREE.MathUtils.clamp(playerPos.x, -1.6, 1.6);
    playerPos.z = THREE.MathUtils.clamp(playerPos.z, minZ, maxZ);

    // Stairs climbing height calculations
    if (exitNumber === 68 && activeAnomalyId === 0 && playerPos.z < -currentCorridorLength) {
        // stairs range Z = [-currentCorridorLength, -currentCorridorLength - 4.8]
        const stairProgress = (playerPos.z - (-currentCorridorLength)) / -4.8; // 0 to 1
        playerPos.y = stairProgress * 2.4; // climb up 2.4m
        
        // If at the top of the stairs, trigger escape victory!
        if (playerPos.z <= -currentCorridorLength - 4.5) {
            triggerVictory();
        }
    } else {
        // Normal flat floor height or falling animation
        if (activeAnomalyId === 50 && elements.pitState === 'falling') {
            playerPos.y -= deltaTime * 10.0;
        } else {
            playerPos.y = 0;
        }
    }

    // Head Bobbing animation
    let bobY = 0;
    if (isMoving && elements.pitState !== 'falling') {
        const bobSpeed = isRunning ? 14 : 9;
        const bobAmount = isRunning ? 0.08 : 0.04;
        
        // 58. 초중력 heavy bobbing
        const weight = (activeAnomalyId === 58) ? 2.5 : 1.0;
        
        stepTimer += deltaTime * bobSpeed;
        bobY = Math.sin(stepTimer) * bobAmount * weight;

        // Footstep trigger
        if (Math.sin(stepTimer) < -0.9 && !elements.stepLatch) {
            const isSplash = (activeAnomalyId === 65 || activeAnomalyId === 24);
            window.gameAudio.playFootstep(isRunning, isSplash);
            elements.stepLatch = true;
            
            // Anomaly 51: Stalker Footsteps follows
            if (activeAnomalyId === 51) {
                setTimeout(() => {
                    window.gameAudio.playFootstep(isRunning, false);
                }, 300);
            }
        }
        if (Math.sin(stepTimer) > 0) {
            elements.stepLatch = false;
        }
    } else {
        // Breathing idle bob
        stepTimer += deltaTime * 2;
        bobY = Math.sin(stepTimer) * 0.01;
    }

    // Position camera
    camera.position.x = playerPos.x;
    camera.position.z = playerPos.z;
    camera.position.y = playerPos.y + playerHeight + bobY;

    // Apply camera rotation (look direction)
    camera.rotation.x = cameraRotation.pitch;
    camera.rotation.y = cameraRotation.yaw;

    // 46. 천장과 바닥의 반전 anomaly: flip camera Z 180 degrees
    if (activeAnomalyId === 46) {
        camera.rotation.z = Math.PI;
    } else {
        camera.rotation.z = 0;
    }

    // Raycast check for hover interaction on doors
    raycaster.setFromCamera(mouse, camera);
    const interactables = [];
    if (elements.doorFront) interactables.push(elements.doorFront);
    if (elements.doorBack) interactables.push(elements.doorBack);
    if (activeAnomalyId === 38 && elements.rightDoors[0]) {
        interactables.push(elements.rightDoors[0]);
    }
    
    const intersects = raycaster.intersectObjects(interactables, true);
    const crosshair = document.getElementById('crosshair');
    if (intersects.length > 0) {
        let hitObj = intersects[0].object;
        while (hitObj.parent && hitObj.name !== 'door_front' && hitObj.name !== 'door_back' && hitObj.name !== 'door_right_0') {
            hitObj = hitObj.parent;
        }
        const dist = playerPos.distanceTo(hitObj.position);
        if (dist < 4.0) {
            crosshair.classList.add('active');
        } else {
            crosshair.classList.remove('active');
        }
    } else {
        crosshair.classList.remove('active');
    }

    // Update ongoing animations in Anomaly System
    AnomalySystem.update(elements, playerPos, isMoving, isRunning, deltaTime, triggerGameOver);

    renderer.render(scene, camera);
}

const ANOMALY_NAMES = [
    "뒤돌아보지 마세요",
    "포스터 뒤집힘",
    "붉은 손자국 포스터",
    "식당 폐점",
    "작아지는 포스터",
    "추락하는 여행 포스터",
    "좌우로 흔들리는 포스터",
    "새파란 손자국 추격",
    "거대해지는 첫째 문",
    "커진 문들",
    "두드리는 문",
    "축소된 셋째 문",
    "내려오는 천장",
    "그림자 추격자",
    "167m 복도 & 67개 문",
    "음수 표시판",
    "444 표시판",
    "깜빡이는 표시판",
    "출구 없음 표시판",
    "뒤집힌 표시판",
    "사라진 표시판",
    "핑크색 소화전",
    "거대 소화전",
    "소화전 누수",
    "사라진 소화전",
    "공중부양 소화전",
    "색상 반전 미술 포스터",
    "액자 속 복도",
    "비명 지르는 졸라맨",
    "백지 포스터",
    "설산 여행 포스터",
    "거울 포스터",
    "곤충 요리 포스터",
    "매진 낙서 포스터",
    "SOS 깜빡임",
    "노란 던전 조명",
    "양방향 손잡이",
    "열린 문과 붉은 빛",
    "회전하는 손잡이",
    "암흑 유리창",
    "이끼 낀 벽",
    "기울어진 복도",
    "벽돌이 된 문",
    "붉은 액체가 떨어진 마룻바닥",
    "친절한 화살표",
    "천장과 바닥의 반전",
    "천장 환풍기",
    "바닥 균열",
    "레트로 카페트",
    "끝없는 낭떠러지",
    "구두 발자국 소리",
    "방전된 손전등",
    "네온 초록 손전등",
    "괘종시계 소리",
    "속삭이는 벽",
    "빗소리와 천둥",
    "끈적한 걸음",
    "초중력",
    "스트로보 조명",
    "외계어 포스터",
    "글리치 간판",
    "유령 바람",
    "뒤집힌 소화전",
    "거대 안내 텍스트",
    "첨벙거리는 발걸음",
    "쌍둥이 소화전",
    "적색경보"
];

function populateAnomalyList() {
    const grid = document.querySelector('.anomalies-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    ANOMALY_NAMES.forEach((name, idx) => {
        const id = idx + 1;
        const btn = document.createElement('button');
        btn.className = 'anomaly-item-btn';
        btn.innerHTML = `
            <span class="anomaly-num">${id}</span>
            <span class="anomaly-name">${name}</span>
        `;
        btn.addEventListener('click', () => {
            selectAnomalyFromList(id);
        });
        grid.appendChild(btn);
    });
}

function selectAnomalyFromList(anomalyId) {
    if (document.activeElement) document.activeElement.blur();
    
    // Initialize procedural audio context
    window.gameAudio.init();
    
    // Hide anomaly menu
    document.getElementById('menu-anomalies').classList.remove('active');
    
    // Set state
    gameState = 'playing';
    document.getElementById('canvas-container').requestPointerLock();
    
    // Force reset to this specific anomaly and display its number on Exit sign
    resetLevelState(anomalyId, anomalyId);
}

// Bootstrap window load
window.onload = initGame;
