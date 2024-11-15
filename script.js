import * as THREE from 'three';
import { OrbitControls } from 'three/OrbitControls';
import { GLTFLoader } from 'three/GLTFLoader';
import { RGBELoader } from 'three/RGBELoader';

let scene, camera, renderer, model, controls, videoTexture, video;
let audioElement;
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
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.set(0, 50, 20);

    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMappingExposure = 1.5;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 3);
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 2);
    hemisphereLight.position.set(0, 200, 0);
    scene.add(hemisphereLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight1.position.set(1, 1, 1).normalize();
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight2.position.set(-1, -1, -1).normalize();
    scene.add(directionalLight2);

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

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.maxPolarAngle = Math.PI / 2;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.0;

    document.addEventListener('click', unlockAudioContext);
    document.addEventListener('touchstart', unlockAudioContext);

    const loader = new GLTFLoader(manager);
    loader.load('assets/model/model.gltf', function(gltf) {
        model = gltf.scene;
        model.position.set(0, 0, 0);
        model.scale.set(200, 200, 200);
        scene.add(model);
        controls.target.set(0, 0, 0);
        controls.update();

        model.traverse((child) => {
            if (child.isMesh) {
                child.material.envMapIntensity = 2;
            }
        });

        setupModelControls();
    });

    window.addEventListener('resize', onWindowResize);

    listener = new THREE.AudioListener();
    camera.add(listener);
    audioLoader = new THREE.AudioLoader();

    video = document.createElement('video');
    video.src = 'assets/Body Scan Short.mp4';
    video.setAttribute('playsinline', '');
    video.setAttribute('muted', 'true');
    video.loop = true;
    videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBFormat;

    audioElement = document.createElement('audio');
    document.body.appendChild(audioElement);
}

function unlockAudioContext() {
    console.log('Attempting to unlock Audio Context...');
    if (listener.context.state === 'suspended') {
        listener.context.resume().then(() => {
            console.log('Audio context unlocked successfully.');
            audioContextUnlocked = true;
        }).catch(err => console.error('Failed to unlock audio context:', err));
    } else {
        console.log('Audio context already unlocked.');
        audioContextUnlocked = true;
    }

    // Ensure video playback starts after unlocking
    video.play().then(() => {
        console.log('Video playback started.');
    }).catch(err => console.error('Failed to start video playback:', err));
}

function playAudio(url) {
    if (!audioContextUnlocked) {
        console.warn('Audio context must be unlocked through user interaction.');
        return;
    }

    if (isMobile) {
        audioElement.src = url;
        audioElement.play().then(() => {
            console.log('HTML5 audio playing.');
        }).catch((err) => {
            console.error('HTML5 audio playback failed:', err);
        });
    } else {
        if (!sound) {
            sound = new THREE.Audio(listener);
        }
        audioLoader.load(url, function(buffer) {
            sound.setBuffer(buffer);
            sound.setLoop(false);
            sound.setVolume(1.0);
            sound.play();
            console.log('Web Audio API playing audio.');
        });
    }
}

function setupModelControls() {
    const playButton = model.getObjectByName('PlayButton');
    const pauseButton = model.getObjectByName('PauseButton');
    const glass2 = model.getObjectByName('Glass2');
    const glass2Glass1_0 = model.getObjectByName('Glass2_Glass1_0');

    playButton.userData = {
        action: () => {
            playAudio(audioFiles[currentAudioIndex]);
            glass2.material = new THREE.MeshBasicMaterial({ map: videoTexture });
            glass2Glass1_0.material = new THREE.MeshBasicMaterial({ map: videoTexture });
            video.play().then(() => {
                console.log('Video resumed.');
            }).catch(err => console.error('Failed to resume video:', err));
        }
    };

    pauseButton.userData = {
        action: () => {
            if (isMobile) {
                audioElement.pause();
            } else if (sound && sound.isPlaying) {
                sound.pause();
            }
            video.pause();
            console.log('Audio and video paused.');
        }
    };
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
