import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const APP_DATA = {
    ring: {
        id: 'ring',
        file: '3d/戒指材质.fbx',
        title: '非遗工艺 · 银饰戒指',
        desc: '本款戒指在设计上汲取了非物质文化遗产中独特的“竹韵”元素与编织纹理。通过高精度的3D打印与传统手工打磨相结合，我们将非遗文化凝聚在您指尖，让每一次佩戴都成为一场现代审美与传统的跨时空对话。其光泽如同经过岁月洗礼，温润且高雅。'
    },
    earring: {
        id: 'earring',
        file: '3d/耳环材质.fbx',
        title: '非遗工艺 · 银饰耳环',
        desc: '轻盈灵动的设计语言，融合了古典金属丝编织与现代抽象几何学。我们在模型中最大程度地还原了银材质在高光下的细腻反射与折射质感。光影变幻之间，仿佛能够听到深厚文化底蕴在耳畔低语，充分展现出传统银饰工艺的极致魅力与当代女性的优雅。'
    },
    necklace: {
        id: 'necklace',
        file: '3d/项链材质.fbx',
        title: '非遗工艺 · 银饰项链',
        desc: '作为本系列的重磅之作，这款项链堪称文化传承与现代审美的完美结合体。主链条采用独特的环扣技术连接，中央不仅彰显非遗老工匠的卓越技艺，并融入了国产淡水珍珠相缀的设计理念，在支持国产事业的同时履行企业社会责任。全景3D展示让每一处精细的雕花都清晰可见。'
    }
};

const MAIN_HERO_FBX = '3d/真的完成材质.fbx';

// Preloaded models cache
const loadedModels = {
    hero: null,
    ring: null,
    earring: null,
    necklace: null
};

// Renderers & Scenes Data
const renderersMap = {}; // store renderer, scene, camera, controls by key
let reqHeroAnim, reqModalAnim;

// Central loop for UI elements (cards + hero)
function startMainLoop() {
    function loop() {
        requestAnimationFrame(loop);
        
        // Render hero
        if (renderersMap['hero']) {
            const { renderer, scene, camera, controls } = renderersMap['hero'];
            controls.update();
            renderer.render(scene, camera);
        }

        // Render card canvases
        ['ring', 'earring', 'necklace'].forEach(key => {
            if (renderersMap[key]) {
                const { renderer, scene, camera, controls } = renderersMap[key];
                controls.update();
                renderer.render(scene, camera);
            }
        });
    }
    loop();
}

document.addEventListener('DOMContentLoaded', () => {
    preloadAssets();
});

function setupLighting(scene) {
    // 调低灯光亮度，避免环境光和定向光导致模型过曝泛白，从而还原真实材质颜色
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight1.position.set(100, 200, 50);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xdbe3ff, 0.5);
    dirLight2.position.set(-100, -200, -50);
    scene.add(dirLight2);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);
}

function preprocessFBXMaterials(object, scaleFactor = 100) {
    object.traverse((child) => {
        if (child.isMesh) {
            // 如果模型没有默认材质才添加占位，否则绝对不触碰内置原生材质和贴图颜色
            if (!child.material) {
                child.material = new THREE.MeshStandardMaterial({ color: 0xffffff });
            }
            // 完全移除了强行更改 metalness 和 roughness 的代码，保留 FBX 原始材质特性
        }
    });

    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = scaleFactor / maxDim;

    object.position.x = -center.x * scale;
    object.position.y = -center.y * scale;
    object.position.z = -center.z * scale;
    object.scale.setScalar(scale);

    const wrapper = new THREE.Group();
    wrapper.add(object);
    return wrapper;
}

function preloadAssets() {
    const loader = new FBXLoader();
    let loadedCount = 0;
    const totalFiles = 4;
    const progText = document.getElementById('loading-text');
    const progBar = document.getElementById('progress-bar');

    // 追踪每个文件的独立加载进度 (0 ~ 1)
    const fileProgress = [0, 0, 0, 0];

    function updateProgressUI() {
        const totalProgress = fileProgress.reduce((sum, val) => sum + val, 0) / totalFiles;
        const pct = Math.min(Math.round(totalProgress * 100), 100);
        progText.innerText = `正在加载超高清 3D 资产 (${pct}%)`;
        progBar.style.width = `${pct}%`;
    }

    function createProgressHandler(index) {
        return function(xhr) {
            if (xhr.lengthComputable) {
                fileProgress[index] = xhr.loaded / xhr.total;
                updateProgressUI();
            }
        };
    }

    function checkDone(index) {
        fileProgress[index] = 1; // 确保完全加载后计入 100%
        updateProgressUI();
        loadedCount++;
        
        if (loadedCount === totalFiles) {
            setTimeout(() => {
                document.getElementById('global-loading').classList.remove('active');
                initAllScenes();
            }, 800); // 给用户一点时间看满进度条
        }
    }

    loader.load(MAIN_HERO_FBX, (obj) => { loadedModels.hero = preprocessFBXMaterials(obj, 150); checkDone(0); }, createProgressHandler(0), console.error);
    loader.load(APP_DATA.ring.file, (obj) => { loadedModels.ring = preprocessFBXMaterials(obj, 100); checkDone(1); }, createProgressHandler(1), console.error);
    loader.load(APP_DATA.earring.file, (obj) => { loadedModels.earring = preprocessFBXMaterials(obj, 100); checkDone(2); }, createProgressHandler(2), console.error);
    loader.load(APP_DATA.necklace.file, (obj) => { loadedModels.necklace = preprocessFBXMaterials(obj, 100); checkDone(3); }, createProgressHandler(3), console.error);
}

function initAllScenes() {
    initHero();
    initCardCanvas('ring');
    initCardCanvas('earring');
    initCardCanvas('necklace');
    initInteractions();
    startMainLoop();
}

function initHero() {
    const container = document.getElementById('hero-canvas-container');
    const scene = new THREE.Scene();
    scene.background = null; 

    // Camera zoomed in more for impact
    const camera = new THREE.PerspectiveCamera(35, container.clientWidth / container.clientHeight, 1, 2000);
    camera.position.set(0, 5, 85);   // Brought even closer

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace; // 开启 sRGB 精确还原真实色彩映射
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = true;
    controls.enableZoom = true; // 允许滑动放大缩小
    controls.minDistance = 15;  // 更小缩放距离
    controls.maxDistance = 400; // 最大缩放距离
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.8;
    controls.enableDamping = true;

    // 模型包围盒几何中心偏上，所以将交互控制的中心焦点强制向下拉 15 个单位，解决被遮挡和中心漂移的问题
    controls.target.set(0, -15, 0);
    // 手动更新一次以应用新的控制中心
    controls.update();

    setupLighting(scene);
    
    // Clone model to prevent conflicts
    scene.add(loadedModels.hero.clone());

    renderersMap['hero'] = { scene, camera, renderer, controls };

    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
}

function initCardCanvas(key) {
    const container = document.getElementById(`canvas-${key}`);
    const scene = new THREE.Scene();
    scene.background = null;

    // Zoomed in version for cards
    const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 1, 2000);
    camera.position.set(0, 20, 140);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2.5;
    controls.enableDamping = true;
    // disable manual rotation on cards so they just look like active previews
    controls.enableRotate = false;

    setupLighting(scene);
    
    scene.add(loadedModels[key].clone());

    renderersMap[key] = { scene, camera, renderer, controls };

    const resizeObserver = new ResizeObserver(() => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
    resizeObserver.observe(container);
}

/* --- Modal Logic --- */

function initInteractions() {
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const type = card.getAttribute('data-model');
            openModal(type);
        });
    });

    const closeBtn = document.getElementById('modal-close-btn');
    closeBtn.addEventListener('click', closeModal);
}

function openModal(type) {
    const data = APP_DATA[type];
    if (!data) return;

    document.getElementById('modal-title').innerText = data.title;
    document.getElementById('modal-desc').innerText = data.desc;
    
    const overlay = document.getElementById('detail-modal');
    overlay.classList.add('active');

    initModal3D(type);
}

function closeModal() {
    const overlay = document.getElementById('detail-modal');
    overlay.classList.remove('active');
    
    if (reqModalAnim) cancelAnimationFrame(reqModalAnim);
    if (renderersMap['modal'] && renderersMap['modal'].renderer) {
        document.getElementById('modal-canvas-container').innerHTML = '';
        renderersMap['modal'].renderer.dispose();
        delete renderersMap['modal'];
    }
}

function initModal3D(key) {
    const container = document.getElementById('modal-canvas-container');
    container.innerHTML = '';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfcfcfc);

    const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 1, 2000);
    camera.position.set(0, 30, 180);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    setupLighting(scene);

    scene.add(loadedModels[key].clone());

    renderersMap['modal'] = { scene, camera, renderer, controls };

    const resizeObserver = new ResizeObserver(() => {
        const cam = renderersMap['modal'].camera;
        const ren = renderersMap['modal'].renderer;
        if (!cam || !ren) return;
        cam.aspect = container.clientWidth / container.clientHeight;
        cam.updateProjectionMatrix();
        ren.setSize(container.clientWidth, container.clientHeight);
    });
    resizeObserver.observe(container);

    function animateModal() {
        if (!renderersMap['modal']) return;
        reqModalAnim = requestAnimationFrame(animateModal);
        const { scene, camera, renderer, controls } = renderersMap['modal'];
        controls.update();
        renderer.render(scene, camera);
    }
    animateModal();
}
