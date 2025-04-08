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

let audioLoader, listener, sound;
let audioFiles = [
    'assets/audio/Arthur Hopewell - 90 - JFM.mp3',
    'assets/audio/Arthur Hopewell - 11 V1 - JFM.mp3',
    'assets/audio/Arthur Hopewell - 86 - JFM.mp3',
    'assets/audio/Arthur Hopewell - 91 - JFM.mp3'
];
let currentAudioIndex = 0;
let userInteracting = false;
let video;

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

const manager = new THREE.LoadingManager();
manager.onProgress = function(url, itemsLoaded, itemsTotal) {
    const progress = Math.round((itemsLoaded / itemsTotal) * 100);
    loadingPercentage.innerText = `${progress}%`;
};
manager.onLoad = function() {
    console.log('All assets loaded.');
    loadingScreen.style.display = 'none';
    container.style.display = 'block';
};

init();
animate();

function init() {
    console.log('Initializing scene...');

    // Resume audio context on first touch for iOS Safari
    document.body.addEventListener('touchstart', () => {
        if (THREE.AudioContext.getContext().state === 'suspended') {
            THREE.AudioContext.getContext().resume().then(() => {
                console.log('Audio context resumed');
            });
        }
    }, { once: true });

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.set(0, 50, 20);

    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setClearColor(0x000000);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
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
    new RGBELoader().setDataType(THREE.HalfFloatType)
        .load('assets/little_paris_under_tower_1k.hdr', function(texture) {
            const envMap = pmremGenerator.fromEquirectangular(texture).texture;
            scene.environment = envMap;
            texture.dispose();
            pmremGenerator.dispose();
        });

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.0;

    renderer.domElement.addEventListener('mousedown', onUserInteractionStart, false);
    renderer.domElement.addEventListener('mousemove', onUserInteractionStart, false);
    renderer.domElement.addEventListener('mouseup', onUserInteractionEnd, false);
    renderer.domElement.addEventListener('wheel', onUserInteractionStart, false);

    setupTouchEvents();

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

    window.addEventListener('resize', onWindowResize, false);

    listener = new THREE.AudioListener();
    camera.add(listener);
    audioLoader = new THREE.AudioLoader();

    createVideoTexture();
}

function setupTouchEvents() {
    renderer.domElement.addEventListener('touchstart', onUserInteractionStart, false);
    renderer.domElement.addEventListener('touchmove', onUserInteractionStart, false);
    renderer.domElement.addEventListener('touchend', onUserInteractionEnd, false);
}

function createVideoTexture() {
    video = document.createElement('video');
    video.src = 'assets/Body Scan Short.mp4';
    video.setAttribute('playsinline', '');
    video.setAttribute('muted', '');
    video.setAttribute('controls', '');
    video.load();

    video.addEventListener('loadeddata', () => {
        video.loop = true;
        videoTexture = new THREE.VideoTexture(video);
        videoTexture.minFilter = THREE.LinearFilter;
        videoTexture.magFilter = THREE.LinearFilter;
        videoTexture.format = THREE.RGBFormat;
        videoTexture.repeat.set(4.1, 4.1);
        videoTexture.offset.set(-1.02, -1.05);
    });
}

function setupModelControls() {
    if (!model) return;

    const playButton = model.getObjectByName('PlayButton');
    const pauseButton = model.getObjectByName('PauseButton');
    const forwardButton = model.getObjectByName('ForwardButton');
    const backwardButton = model.getObjectByName('BackwardButton');
    const glass2 = model.getObjectByName('Glass2');
    const glass2Glass1_0 = model.getObjectByName('Glass2_Glass1_0');

    if (!playButton || !pauseButton || !forwardButton || !backwardButton || !glass2 || !glass2Glass1_0) return;

    playButton.userData = {
        action: () => {
            console.log('Play button pressed.');
            if (listener.context.state === 'suspended') {
                listener.context.resume().then(() => {
                    playAudio(audioFiles[currentAudioIndex]);
                });
            } else {
                playAudio(audioFiles[currentAudioIndex]);
            }
            if (videoTexture) {
                glass2.material.map = videoTexture;
                glass2.material.needsUpdate = true;
                glass2Glass1_0.material.map = videoTexture;
                glass2Glass1_0.material.needsUpdate = true;
                video.play();
            }
        }
    };
    pauseButton.userData = {
        action: () => {
            console.log('Pause button pressed.');
            pauseAudio();
            if (video) video.pause();
        }
    };
    forwardButton.userData = { action: () => { nextAudio(); } };
    backwardButton.userData = { action: () => { previousAudio(); } };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function onDocumentMouseDown(event) {
        event.preventDefault();
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(model.children, true);
        if (intersects.length > 0) {
            const object = intersects[0].object;
            if (object.userData.action) {
                object.userData.action();
            }
        }
    }

    window.addEventListener('mousedown', onDocumentMouseDown, false);
}

function onUserInteractionStart() {
    userInteracting = true;
    controls.autoRotate = false;
}

function onUserInteractionEnd() {
    userInteracting = false;
    controls.autoRotate = true;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function playAudio(url) {
    if (!sound) {
        sound = new THREE.Audio(listener);
        audioLoader.load(url, function(buffer) {
            sound.setBuffer(buffer);
            sound.setLoop(false);
            sound.setVolume(0.5);
            sound.play();
        });
    } else {
        if (sound.isPlaying) {
            sound.stop();
        }
        audioLoader.load(url, function(buffer) {
            sound.setBuffer(buffer);
            sound.play();
        });
    }
}

function pauseAudio() {
    if (sound && sound.isPlaying) {
        sound.pause();
    }
}

function nextAudio() {
    currentAudioIndex = (currentAudioIndex + 1) % audioFiles.length;
    playAudio(audioFiles[currentAudioIndex]);
}

function previousAudio() {
    currentAudioIndex = (currentAudioIndex - 1 + audioFiles.length) % audioFiles.length;
    playAudio(audioFiles[currentAudioIndex]);
}
