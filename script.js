let scene, camera, renderer, model, controls, videoTexture;
let isModelLoaded = false;
let isVideoLoaded = false;
const container = document.getElementById('container');
const loadingScreen = document.getElementById('loadingScreen');

// Create and append loading text
const loadingText = document.createElement('div');
loadingText.innerText = 'Use the walkman buttons to play audio...';
loadingText.style.textAlign = 'center';
loadingScreen.appendChild(loadingText);

// Create and append loading percentage text
const loadingPercentage = document.createElement('div');
loadingScreen.appendChild(loadingPercentage);

let audioLoader, listener, sound;
let audioFiles = [
    'assets/audio/11_WIP_.mp3',
    'assets/audio/86_WIP_.mp3',
    'assets/audio/90 V1_WIP_.mp3',
    'assets/audio/91_WIP_.mp3'
];
let currentAudioIndex = 0;
let video;

init();
animate();

function init() {
    console.log('Initializing scene...');
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.set(0, 50, 20);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(0x000000);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMappingExposure = 1.5;
    container.appendChild(renderer.domElement);

    // Lighting setup
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

    // OrbitControls setup
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.0;

    // Load model
    const loader = new THREE.GLTFLoader();
    loader.load(
        'assets/model/Buttons2.gltf',
        function (gltf) {
            console.log('Model loaded successfully.');
            model = gltf.scene;
            model.position.set(0, 0, 0);

            // Scale the entire model up
            model.scale.set(3, 3, 3); // Scale up the model while keeping video the same size
            scene.add(model);
            
            isModelLoaded = true; // Mark the model as loaded

            // Check if the video is already loaded, and apply the texture if both are ready
            applyTextureIfReady();

            loadingScreen.style.display = 'none';
            container.style.display = 'block';
        },
        function (xhr) {
            const percentComplete = Math.min((xhr.loaded / xhr.total) * 100, 100);
            loadingPercentage.innerText = `${Math.round(percentComplete)}%`;
        },
        function (error) {
            console.error('Error loading model:', error);
        }
    );

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
}

function createVideoTexture() {
    video = document.createElement('video');
    video.src = 'assets/Untitled.mov'; // Path to your video file
    video.setAttribute('playsinline', ''); // Ensures video plays inline on iOS
    video.load();

    video.addEventListener('loadeddata', () => {
        console.log('Video loaded successfully');
        
        videoTexture = new THREE.VideoTexture(video);
        videoTexture.minFilter = THREE.LinearFilter;
        videoTexture.magFilter = THREE.LinearFilter;
        videoTexture.format = THREE.RGBFormat;

        isVideoLoaded = true; // Mark the video as loaded
        
        // Check if the model is already loaded, and apply the texture if both are ready
        applyTextureIfReady();
    });

    video.addEventListener('error', (e) => {
        console.error('Error loading video:', e);
    });
}

function applyTextureIfReady() {
    // Only apply the texture if both the model and video are fully loaded
    if (isModelLoaded && isVideoLoaded) {
        console.log('Both model and video are loaded. Applying texture...');
        
        const Glass2_Glass1_0 = model.getObjectByName('Glass2_Glass1_0');
        if (Glass2_Glass1_0) {
            // Apply the video texture to the material
            Glass2_Glass1_0.material.map = videoTexture;
            Glass2_Glass1_0.material.needsUpdate = true;

            // Optionally scale the video down on the object's UV coordinates
            Glass2_Glass1_0.material.map.repeat.set(0.5, 0.5); // Adjust this to scale the video down
            Glass2_Glass1_0.material.map.offset.set(0.25, 0.25); // Center the video

            console.log('Video texture applied to Glass2_Glass1_0.');
        } else {
            console.error('Glass2_Glass1_0 not found in the model.');
        }
    } else {
        // Log when one or both resources aren't loaded yet
        if (!isModelLoaded) {
            console.log('Model is not loaded yet.');
        }
        if (!isVideoLoaded) {
            console.log('Video is not loaded yet.');
        }
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (videoTexture) {
        videoTexture.needsUpdate = true;
    }
}

function animate() {
    requestAnimationFrame(animate);
    controls.update(); // required if controls.enableDamping = true or if controls.autoRotate = true
    renderer.render(scene, camera);
}
