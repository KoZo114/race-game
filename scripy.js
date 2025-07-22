// ゲーム状態
let gameState = 'betting';
let selectedHorse = null;
let raceProgress = [0, 0, 0];
let winner = null;
let score = 0;
let raceCount = 0;
let speeds = [0, 0, 0];

// Three.js関連
let scene, camera, renderer, characters = [];
let animationId;

// ウマ娘データ
const horses = [
    { id: 0, name: 'スピードスター', color: 0xff69b4 },
    { id: 1, name: 'サンダーボルト', color: 0x4169e1 },
    { id: 2, name: 'ゴールデンウィング', color: 0xffd700 }
];

const TRACK_LENGTH = 20;
const FINISH_LINE = 18;

// 初期化
function init() {
    const canvas = document.getElementById('gameCanvas');
    
    // シーンセットアップ
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    // カメラ
    camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.set(0, 8, 12);
    camera.lookAt(0, 0, 0);

    // レンダラー
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // ライティング
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(-1, 1, 1);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // トラック作成
    const trackGeometry = new THREE.PlaneGeometry(4, TRACK_LENGTH);
    const trackMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const track = new THREE.Mesh(trackGeometry, trackMaterial);
    track.rotation.x = -Math.PI / 2;
    track.receiveShadow = true;
    scene.add(track);

    // レーンライン
    for (let i = -1; i <= 1; i++) {
        if (i === 0) continue;
        const lineGeometry = new THREE.BoxGeometry(0.05, 0.01, TRACK_LENGTH);
        const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.position.set(i, 0.01, 0);
        scene.add(line);
    }

    // スタートライン
    const startLineGeometry = new THREE.BoxGeometry(4, 0.02, 0.1);
    const startLineMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const startLine = new THREE.Mesh(startLineGeometry, startLineMaterial);
    startLine.position.set(0, 0.01, -TRACK_LENGTH/2 + 1);
    scene.add(startLine);

    // ゴールライン
    const finishLineGeometry = new THREE.BoxGeometry(4, 0.02, 0.1);
    const finishLineMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const finishLine = new THREE.Mesh(finishLineGeometry, finishLineMaterial);
    finishLine.position.set(0, 0.01, TRACK_LENGTH/2 - 1);
    scene.add(finishLine);

    // (ここからが新しいコード)
// キャラクター作成
const textureLoader = new THREE.TextureLoader(); // 画像を読み込むための準備

for (let i = 0; i < 3; i++) {
    // 画像を読み込む
    const texture = textureLoader.load(`character${i + 1}.png`);
    
    // 画像を貼り付けるための「板ポリゴン」を作成
    const planeGeometry = new THREE.PlaneGeometry(1, 1.5); // キャラクターのサイズ (横1, 縦1.5)
    const planeMaterial = new THREE.MeshLambertMaterial({
        map: texture,          // 画像をテクスチャとして設定
        transparent: true,     // 透明部分を有効にする
        side: THREE.DoubleSide // 裏からも見えるようにする
    });

    const characterPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    characterPlane.castShadow = true; // 影を落とす設定

    // 位置を調整
    characterPlane.position.set((i - 1) * 1.2, 0.75, -TRACK_LENGTH/2 + 1);
    
    characters.push(characterPlane);
    scene.add(characterPlane);
}
// (ここまで)

    // イベントリスナー
    setupEventListeners();
    
    // アニメーション開始
    animate();
}

function setupEventListeners() {
    // ウマ娘選択
    document.querySelectorAll('.horse-card').forEach((card, index) => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.horse-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedHorse = index;
        });
    });

    // ボタンのクリックイベント
    document.getElementById('startButton').addEventListener('click', startRace);
    document.getElementById('resetButton').addEventListener('click', resetRace);

    // リサイズ対応
    window.addEventListener('resize', () => {
        const canvas = document.getElementById('gameCanvas');
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    });
}

function animate() {
    animationId = requestAnimationFrame(animate);
    
    // キャラクターアニメーション
    if (gameState === 'racing') {
        characters.forEach((character, index) => {
            const time = Date.now() * 0.005;
            character.position.y = 0.6 + Math.sin(time * 4 + index) * 0.1;
            character.rotation.z = Math.sin(time * 8 + index) * 0.1;
        });
    }

    // キャラクター位置更新
    characters.forEach((character, index) => {
        const startZ = -TRACK_LENGTH/2 + 1;
        const targetZ = startZ + raceProgress[index];
        character.position.z = targetZ;
    });

    renderer.render(scene, camera);
}

function startRace() {
    if (selectedHorse === null) {
        alert('予想するウマ娘を選んでください！');
        return;
    }

    gameState = 'racing';
    raceProgress = [0, 0, 0];
    speeds = [0, 0, 0];
    winner = null;

    // UI更新
    document.getElementById('bettingPhase').style.display = 'none';
    document.getElementById('racingPhase').style.display = 'block';
    document.getElementById('selectedHorseName').textContent = horses[selectedHorse].name;

    // レース進行
    const raceInterval = setInterval(() => {
        speeds = speeds.map(() => Math.random() * 0.3 + 0.1);
        
        raceProgress = raceProgress.map((progress, index) => 
            Math.min(FINISH_LINE, progress + speeds[index])
        );

        // ゴール判定
        const finished = raceProgress.findIndex(progress => progress >= FINISH_LINE);
        if (finished !== -1) {
            clearInterval(raceInterval);
            winner = finished;
            gameState = 'finished';
            
            if (finished === selectedHorse) {
                score += 10;
            }
            raceCount++;
            
            updateUI();
            showResult();
        }
    }, 100);
}

function showResult() {
    document.getElementById('racingPhase').style.display = 'none';
    document.getElementById('resultPhase').style.display = 'block';
    document.getElementById('winnerName').textContent = horses[winner].name;
    
    const resultMessage = document.getElementById('resultMessage');
    const resultTitle = resultMessage.querySelector('.result-title');
    const points = resultMessage.querySelector('.points');
    
    if (selectedHorse === winner) {
        resultMessage.className = 'result-message success';
        resultTitle.textContent = '🎉 予想的中！ 🎉';
        points.textContent = '+10ポイント獲得！';
    } else {
        resultMessage.className = 'result-message failure';
        resultTitle.textContent = '😅 予想外れ...';
        points.textContent = `あなたの予想: ${horses[selectedHorse].name}`;
    }
}

function resetRace() {
    gameState = 'betting';
    selectedHorse = null;
    raceProgress = [0, 0, 0];
    speeds = [0, 0, 0];
    winner = null;
    
    // キャラクターをスタート位置に戻す
    characters.forEach((character, index) => {
        character.position.z = -TRACK_LENGTH/2 + 1;
    });
    
    // UI更新
    document.getElementById('resultPhase').style.display = 'none';
    document.getElementById('racingPhase').style.display = 'none';
    document.getElementById('bettingPhase').style.display = 'block';
    document.querySelectorAll('.horse-card').forEach(c => c.classList.remove('selected'));
}

function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('raceCount').textContent = raceCount;
}

// ページ読み込み時に初期化
window.addEventListener('load', init);
