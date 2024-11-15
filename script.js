import * as THREE from 'three';
import { OrbitControls } from 'three/OrbitControls';
import { GLTFLoader } from 'three/GLTFLoader';
import { RGBELoader } from 'three/RGBELoader';

let scene, camera, renderer, model, controls, videoTexture;
const container = document.getElementById('container');
const loadingScreen = document.getElementById('loadingScreen');
const loadingText = document.createElement('div');
loadingText.innerText = 'Use the walkman buttons to play audio...';
loadingText.style.textAlign = 'center';
loadingScreen.appendChild(loadingText);
const loadingPercentage = document.createElement('div');
loadingScreen.appendChild(loadingPercentage);

let audioLoader, listener, sound, audioContextUnlocked = false;
let audioFiles = [
    'assets/audio/Arthur Hopewell - 90 - JFM.mp3',
    'assets/audio/Arthur Hopewell - 11 V1 - JFM.mp3',
    'assets/audio/Arthur Hopewell - 86 - JFM.mp3',
    'assets/audio/Arthur Hopewell - 91 - JFM.mp3'
];
let currentAudioIndex = 0;

// Detect if it's mobile (Safari on iPhone, etc.)
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Initialize the loading manager
const manager = new THREE.LoadingManager();
manager.onProgress = (url, itemsLoaded, itemsTotal) => {
    const progress = Math.round((itemsLoaded / itemsTotal) * 100);
    loadingPercentage.innerText = `${progress}%`;
};
manager.onLoad = () => {
    loadingScreen.style.display = 'none';
    container.style.display = 'block';
};

// Initialize scene
init();
animate();

function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.set(0, 50, 20);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMappingExposure = 1.5;
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 3);
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 2);
    hemisphereLight.position.set(0, 200, 0);
    scene.add(hemisphereLight);

    // Load HDRI environment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    new RGBELoader()
        .setDataType(THREE.HalfFloatType)
        .load('assets/little_paris_under_tower_1k.hdr', function(texture) {
            const envMap = pmremGenerator.fromEquirectangular(texture).texture;
            scene.environment = envMap;
            texture.dispose();
            pmremGenerator.dispose();
        });

    // OrbitControls setup
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.maxPolarAngle = Math.PI / 2;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.0;

    // Add event listeners to unlock audio context
    document.addEventListener('click', unlockAudioContext);
    document.addEventListener('touchstart', unlockAudioContext);

    // Load model
    const loader = new GLTFLoader(manager);
    loader.load('assets/model/model.gltf', function(gltf) {
        model = gltf.scene;
        model.position.set(0, 0, 0);
        model.scale.set(200, 200, 200);
        scene.add(model);
        controls.target.set(0, 0, 0);
        controls.update();
        setupModelControls();
    });

    // Window resize handling
    window.addEventListener('resize', onWindowResize);

    // Create audio listener and loader
    listener = new THREE.AudioListener();
    camera.add(listener);
    audioLoader = new THREE.AudioLoader();
}

// Unlock audio context function
function unlockAudioContext() {
    if (!audioContextUnlocked && listener.context.state === 'suspended') {
        listener.context.resume().then(() => {
            console.log('Audio context unlocked');
            audioContextUnlocked = true;
        }).catch(err => console.error('Failed to unlock audio context:', err));
    }
}

// Play audio function
function playAudio(url) {
    if (!sound) {
        sound = new THREE.Audio(listener);
    }

    audioLoader.load(url, function(buffer) {
        sound.setBuffer(buffer);
        sound.setLoop(false);
        sound.setVolume(0.5);
        sound.play();
    });
}

// Pause audio function
function pauseAudio() {
    if (sound && sound.isPlaying) {
        sound.pause();
    }
}

// Navigation functions
function nextAudio() {
    currentAudioIndex = (currentAudioIndex + 1) % audioFiles.length;
    playAudio(audioFiles[currentAudioIndex]);
}

function previousAudio() {
    currentAudioIndex = (currentAudioIndex - 1 + audioFiles.length) % audioFiles.length;
    playAudio(audioFiles[currentAudioIndex]);
}

// Resize handling
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
