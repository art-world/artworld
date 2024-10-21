let scene, camera, renderer, model, controls, videoTexture;
const container = document.getElementById('container');
const loadingScreen = document.getElementById('loadingScreen');
const loadingText = document.createElement('div');
loadingText.innerText = 'Use the walkman buttons to play audio...';
loadingText.style.textAlign = 'center';
loadingScreen.appendChild(loadingText);

const loadingPercentage = document.createElement('div');
loadingPercentage.setAttribute('id', 'loadingPercentage'); // Add percentage text element
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
    
    // Add loader logic
    const manager = new THREE.LoadingManager();
    
    // This function updates the percentage counter
    manager.onProgress = function(url, itemsLoaded, itemsTotal) {
        const progress = Math.round((itemsLoaded / itemsTotal) * 100);
        loadingPercentage.innerHTML = progress + '%'; // Update the percentage text
    };

    manager.onLoad = function() {
        console.log('All assets loaded.');
        loadingScreen.style.display = 'none'; // Hide the loading screen when everything is loaded
    };

    // Loading the models and textures using the manager
    const loader = new THREE.GLTFLoader(manager);
    loader.load('assets/model/Walkman buttons screen.gltf', function(gltf) {
        model = gltf.scene;
        scene.add(model);
    });

    // Other scene setup code...
}

function animate() {
    requestAnimationFrame(animate);
    controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
    renderer.render(scene, camera);
}
