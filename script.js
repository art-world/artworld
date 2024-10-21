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

init();

animate();

const manager = new THREE.LoadingManager();

// This function updates the percentage counter
manager.onProgress = function(url, itemsLoaded, itemsTotal) {
    const progress = Math.round((itemsLoaded / itemsTotal) * 100);
    const loadingPercentage = document.getElementById('loadingPercentage');
    if (loadingPercentage) {
        loadingPercentage.innerHTML = progress + '%'; // Update the percentage text
    }
};

manager.onLoad = function() {
    console.log('All assets loaded.');
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none'; // Hide the loading screen when everything is loaded
    }
};

// Example of using manager for loading a GLTF model
const loader = new THREE.GLTFLoader(manager);
loader.load('assets/model/Walkman buttons screen.gltf', function(gltf) {
    model = gltf.scene;
    scene.add(model);
});


function init() {
    console.log('Initializing scene...');
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Set background to black
    console.log('Scene created.');

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.set(0, 50, 20); // Move the camera closer to the model
    console.log('Camera initialized.');

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(0x000000); // Set background to black
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMappingExposure = 1.5; // Increase the exposure
    container.appendChild(renderer.domElement);
    console.log('Renderer initialized.');

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 3); // Increase intensity of ambient light
    scene.add(ambientLight);
    console.log('Ambient light added.');

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 3); // Additional lighting
    scene.add(hemisphereLight);
    
    // Controls initialization (if needed)
    controls = new THREE.OrbitControls(camera, renderer.domElement); // If you are using controls
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5; // Set your own rotation speed
}

function animate() {
    requestAnimationFrame(animate);
    if (controls) {
        controls.update(); // Only required if controls.enableDamping = true, or if controls.autoRotate = true
    }
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

