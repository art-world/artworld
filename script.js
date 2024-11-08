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

// Detect if it's mobile (Safari on iPhone, etc.)
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Initialize the loading manager at the top
const manager = new THREE.LoadingManager();

// This function updates the percentage counter during asset loading
manager.onProgress = function(url, itemsLoaded, itemsTotal) {
    const progress = Math.round((itemsLoaded / itemsTotal) * 100);
    loadingPercentage.innerText = `${progress}%`; // Update the loading percentage text
};

// Once all assets are loaded, hide the loading screen
manager.onLoad = function() {
    console.log('All assets loaded.');
    loadingScreen.style.display = 'none'; // Hide the loading screen
    container.style.display = 'block'; // Show the main content container
};

// Initialize scene
init();

// Animation loop
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

    // Renderer setup with anti-aliasing disabled for mobile
    renderer = new THREE.WebGLRenderer({ antialias: !isMobile });
    renderer.setClearColor(0x000000); // Set background to black
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMappingExposure = 1.5; // Increase the exposure
    container.appendChild(renderer.domElement);
    console.log('Renderer initialized.');

    // // Lighting
    // const ambientLight = new THREE.AmbientLight(0xffffff, 3); // Increase intensity of ambient light
    // scene.add(ambientLight);
    // console.log('Ambient light added.');

    // const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 2); // Increase intensity of hemisphere light
    // hemisphereLight.position.set(0, 200, 0);
    // scene.add(hemisphereLight);
    // console.log('Hemisphere light added.');

    // const directionalLight1 = new THREE.DirectionalLight(0xffffff, 2); // Increase intensity of directional light 1
    // directionalLight1.position.set(1, 1, 1).normalize();
    // scene.add(directionalLight1);

    // const directionalLight2 = new THREE.DirectionalLight(0xffffff, 2); // Increase intensity of directional light 2
    // directionalLight2.position.set(-1, -1, -1).normalize();
    // scene.add(directionalLight2);
    // console.log('Directional lights added.');

    // // Load HDRI environment
    // const pmremGenerator = new THREE.PMREMGenerator(renderer);
    // pmremGenerator.compileEquirectangularShader();

    // new THREE.RGBELoader()
    //     .setDataType(THREE.UnsignedByteType) // set data type
    //     .load('assets/little_paris_under_tower_1k.hdr', function(texture) {
    //         const envMap = pmremGenerator.fromEquirectangular(texture).texture;
    //         scene.environment = envMap; // Use the HDR for environment lighting only
    //         texture.dispose();
    //         pmremGenerator.dispose();
    //         console.log('Environment map loaded.');
    //     });

    // OrbitControls setup
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2;
    controls.autoRotate = true; // Enable auto-rotate
    controls.autoRotateSpeed = 1.0; // Adjust the speed as needed

    // Add event listeners to manage auto-rotate
    renderer.domElement.addEventListener('mousedown', onUserInteractionStart, false);
    renderer.domElement.addEventListener('mousemove', onUserInteractionStart, false);
    renderer.domElement.addEventListener('mouseup', onUserInteractionEnd, false);
    renderer.domElement.addEventListener('wheel', onUserInteractionStart, false);

    // Add touch event listeners for iPhone compatibility
    setupTouchEvents();

    // Load model using the manager
    const loader = new THREE.GLTFLoader(manager);
    loader.load('assets/model/Buttons2.gltf', function(gltf) {
        console.log('Model loaded successfully.');
        model = gltf.scene;
        model.position.set(0, 0, 0);
        model.scale.set(200, 200, 200); // Scale the model up
        scene.add(model);
        controls.target.set(0, 0, 0); // Ensure the controls target the center of the model
        controls.update();

        // Increase the envMapIntensity for all materials in the model
        model.traverse((child) => {
            if (child.isMesh) {
                child.material.envMapIntensity = 2; // Increase the intensity
            }
        });

        // setupModelControls(); // Setup button actions after the model is loaded
    });

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    // Create audio listener and loader
    listener = new THREE.AudioListener();
    camera.add(listener);
    audioLoader = new THREE.AudioLoader();

    // Create and add video texture
    createVideoTexture();
}

// Touch event listeners for mobile devices
function setupTouchEvents() {
    renderer.domElement.addEventListener('touchstart', onUserInteractionStart, false);
    renderer.domElement.addEventListener('touchmove', onUserInteractionStart, false);
    renderer.domElement.addEventListener('touchend', onUserInteractionEnd, false);
}

// Create video texture function with proper scaling and positioning
function createVideoTexture() {
    video = document.createElement('video');
    video.src = 'assets/Body Scan Short.mp4'; // Ensure this path is correct
    video.setAttribute('playsinline', ''); // Ensures video plays inline on iOS
    video.setAttribute('muted', ''); // Ensures autoplay compliance on mobile
    video.setAttribute('controls', ''); // Add controls for Safari iPhone
    video.load();

    video.addEventListener('loadeddata', () => {
        console.log('Video loaded successfully');
        video.loop = true; // Set the loop
        videoTexture = new THREE.VideoTexture(video);
        videoTexture.minFilter = THREE.LinearFilter;
        videoTexture.magFilter = THREE.LinearFilter;
        videoTexture.format = THREE.RGBFormat;

        // Restore original video scaling and placement
        videoTexture.repeat.set(4.1, 4.1);  // Original scale value
        videoTexture.offset.set(-1.019, -1.05);  // Original offset value
    });
}

// Setup model controls function (for buttons and interactivity)
// function setupModelControls() {
//     if (!model) {
//         console.error('Model is not loaded.');
//         return;
//     }
//     const playButton = model.getObjectByName('PlayButton');
//     const pauseButton = model.getObjectByName('PauseButton');
//     const forwardButton = model.getObjectByName('ForwardButton');
//     const backwardButton = model.getObjectByName('BackwardButton');
//     const glass2 = model.getObjectByName('Glass2');
//     const glass2Glass1_0 = model.getObjectByName('Glass2_Glass1_0');

//     console.log("Buttons and Screens:", {
//         playButton,
//         pauseButton,
//         forwardButton,
//         backwardButton,
//         glass2,
//         glass2Glass1_0
//     });

//     // Only set actions for buttons that need them, skip Case_Case1_0
//     if (!playButton || !pauseButton || !forwardButton || !backwardButton || !glass2 || !glass2Glass1_0) {
//         console.error('One or more buttons or the screen textures are not found on the model.');
//         return;
//     }

//     playButton.userData = {
//         action: () => {
//             console.log('Play button pressed.');
//             playAudio(audioFiles[currentAudioIndex]);
//             if (videoTexture) {
//                 // Set the video texture as the material's map
//                 glass2.material = new THREE.MeshBasicMaterial({ map: videoTexture });
//                 glass2Glass1_0.material = new THREE.MeshBasicMaterial({ map: videoTexture });
//                 video.play(); // Play the video when the audio plays
//             } else {
//                 console.error('Video texture is not available.');
//             }
//         }
//     };
//     pauseButton.userData = {
//         action: () => {
//             console.log('Pause button pressed.');
//             pauseAudio();
//             if (video) {
//                 video.pause(); // Pause the video when the audio pauses
//             }
//         }
//     };
//     forwardButton.userData = { action: () => { console.log('Forward button pressed.'); nextAudio(); } };
//     backwardButton.userData = { action: () => { console.log('Backward button pressed.'); previousAudio(); } };

//     // Raycaster setup for mouse interaction with the model
//     const raycaster = new THREE.Raycaster();
//     const mouse = new THREE.Vector2();

//     function onDocumentMouseDown(event) {
//         event.preventDefault();
//         console.log('Mouse down event detected.');
//         mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
//         mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
//         raycaster.setFromCamera(mouse, camera);
//         const intersects = raycaster.intersectObjects(model.children, true);
//         if (intersects.length > 0) {
//             const object = intersects[0].object;
//             if (object.userData.action) {
//                 console.log('Executing action for:', object.name);
//                 object.userData.action(); // Trigger the action set in userData
//             } else {
//                 console.log('No action for this object:', object.name); // Skip objects without actions
//             }
//         } else {
//             console.log('No intersections found.');
//         }
//     }

//     // Add mouse down event listener for interaction
//     window.addEventListener('mousedown', onDocumentMouseDown, false);
// }

// Interaction handling functions
function onUserInteractionStart() {
    userInteracting = true;
    controls.autoRotate = false;
}

function onUserInteractionEnd() {
    userInteracting = false;
    controls.autoRotate = true;
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update(); // Only required if controls.enableDamping = true, or if controls.autoRotate = true
    renderer.render(scene, camera);
}

// function playAudio(url) {
//     if (!sound) {
//         sound = new THREE.Audio(listener);
//         audioLoader.load(url, function(buffer) {
//             sound.setBuffer(buffer);
//             sound.setLoop(false);
//             sound.setVolume(0.5);
//             sound.play();
//         });
//     } else {
//         if (sound.isPlaying) {
//             sound.stop();
//         }
//         audioLoader.load(url, function(buffer) {
//             sound.setBuffer(buffer);
//             sound.play();
//         });
//     }
// }

// function pauseAudio() {
//     if (sound && sound.isPlaying) {
//         sound.pause();
//     }
// }

// function nextAudio() {
//     currentAudioIndex = (currentAudioIndex + 1) % audioFiles.length;
//     playAudio(audioFiles[currentAudioIndex]);
// }

// function previousAudio() {
//     currentAudioIndex = (currentAudioIndex - 1 + audioFiles.length) % audioFiles.length;
//     playAudio(audioFiles[currentAudioIndex]);
// }
