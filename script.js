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
    'assets/audio/11_WIP_.mp3',
    'assets/audio/86_WIP_.mp3',
    'assets/audio/90 V1_WIP_.mp3',
    'assets/audio/91_WIP_.mp3'
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

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 2); // Increase intensity of hemisphere light
    hemisphereLight.position.set(0, 200, 0);
    scene.add(hemisphereLight);
    console.log('Hemisphere light added.');

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 2); // Increase intensity of directional light 1
    directionalLight1.position.set(1, 1, 1).normalize();
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 2); // Increase intensity of directional light 2
    directionalLight2.position.set(-1, -1, -1).normalize();
    scene.add(directionalLight2);
    console.log('Directional lights added.');

    // Load HDRI environment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    new THREE.RGBELoader()
        .setDataType(THREE.UnsignedByteType) // set data type
        .load('assets/little_paris_under_tower_1k.hdr', function(texture) {
            const envMap = pmremGenerator.fromEquirectangular(texture).texture;
            scene.environment = envMap; // Use the HDR for environment lighting only
            texture.dispose();
            pmremGenerator.dispose();
            console.log('Environment map loaded.');
        });

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

    // Load model
    const loader = new THREE.GLTFLoader();
    loader.load(
        'assets/model/Buttons2.gltf',
        function(gltf) {
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

            setupModelControls();
            loadingScreen.style.display = 'none';
            container.style.display = 'block';
        },
        function(xhr) {
            // Calculate and display percentage
            const percentComplete = Math.min((xhr.loaded / xhr.total) * 100, 100);
            loadingPercentage.innerText = `${Math.round(percentComplete)}%`;
        },
        function (error) {
            console.error('Error loading model:', error);
        }
    );

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    // Create audio listener and loader
    listener = new THREE.AudioListener();
    camera.add(listener);
    audioLoader = new THREE.AudioLoader();

    // Create and add video texture
    createVideoTexture();
}

function createVideoTexture() {
    video = document.createElement('video');
    video.src = 'assets/Untitled.mp4'; // Path to the new video file
    video.setAttribute('playsinline', ''); // Ensures video plays inline on iOS
    video.load();

    video.addEventListener('loadeddata', () => {
        console.log('Video loaded successfully');
        video.play();
        video.loop = true;

        videoTexture = new THREE.VideoTexture(video);
        videoTexture.minFilter = THREE.LinearFilter;
        videoTexture.magFilter = THREE.LinearFilter;
        videoTexture.format = THREE.RGBFormat;

        // Adjust texture to fit perfectly
        videoTexture.wrapS = THREE.ClampToEdgeWrapping;
        videoTexture.wrapT = THREE.ClampToEdgeWrapping;
        videoTexture.repeat.set(1, 1); // Adjust repeat values if necessary
    });

    video.addEventListener('error', (e) => {
        console.error('Error loading video:', e);
    });
}

function setupModelControls() {
    if (!model) {
        console.error('Model is not loaded.');
        return;
    }
    const playButton = model.getObjectByName('PlayButton');
    const pauseButton = model.getObjectByName('PauseButton');
    const forwardButton = model.getObjectByName('ForwardButton');
    const backwardButton = model.getObjectByName('BackwardButton');
    const Glass2_Glass1_0 = model.getObjectByName('Glass2_Glass1_0');

    console.log("Buttons and Screen:", {
        playButton,
        pauseButton,
        forwardButton,
        backwardButton,
        Glass2_Glass1_0
    });

    if (!playButton || !pauseButton || !forwardButton || !backwardButton || !Glass2_Glass1_0) {
        console.error('One or more buttons or the screen texture are not found on the model.');
        return;
    }
    playButton.userData = { action: () => { 
        console.log('Play button pressed.'); 
        playAudio(audioFiles[currentAudioIndex]); 
        if (videoTexture) {
            // Set the video texture as the material's map
            Glass2_Glass1_0.material = new THREE.MeshBasicMaterial({ map: videoTexture });

            // Make the video 50% smaller and move to the left by 50%
            scaleAndPositionVideo(Glass2_Glass1_0);
        } else {
            console.error('Video texture is not available.');
        }
    }};
    pauseButton.userData = { action: () => { console.log('Pause button pressed.'); pauseAudio(); } };
    forwardButton.userData = { action: () => { console.log('Forward button pressed.'); nextAudio(); } };
    backwardButton.userData = { action: () => { console.log('Backward button pressed.'); previousAudio(); } };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function onDocumentMouseDown(event) {
        event.preventDefault();
        console.log('Mouse down event detected.');
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(model.children, true);
        if (intersects.length > 0) {
            const object = intersects[0].object;
            if (object.userData.action) {
                console.log('Executing action for:', object.name);
                object.userData.action();
            } else {
                console.log('No action found for:', object.name);
            }
        } else {
            console.log('No intersections found.');
        }
    }

    window.addEventListener('mousedown', onDocumentMouseDown, false);
}

function scaleAndPositionVideo(mesh) {
    // Check if the mesh is defined and has a geometry
    if (!mesh || !mesh.geometry) {
        console.error('Mesh or geometry is not defined.');
        return;
    }

    // Ensure the mesh's geometry has a bounding box
    if (!mesh.geometry.boundingBox) {
        mesh.geometry.computeBoundingBox();
    }

    // Verify bounding box is computed
    if (!mesh.geometry.boundingBox) {
        console.error('Bounding box computation failed.');
        return;
    }

    const bbox = mesh.geometry.boundingBox;
    const meshWidth = bbox.max.x - bbox.min.x;
    const meshHeight = bbox.max.y - bbox.min.y;

    // Get the aspect ratio of the video and the mesh
    const videoAspect = video.videoWidth / video.videoHeight;
    const meshAspect = meshWidth / meshHeight;

    // Scaling factor to reduce the video size further
    const scaleFactor = 0.5;  // Adjust this value to shrink the video further

    let repeatX, repeatY, offsetX, offsetY;

    if (videoAspect > meshAspect) {
        // Video is wider than the mesh
        repeatX = 1 / scaleFactor;  // Reduce width
        repeatY = (meshAspect / videoAspect) / scaleFactor;  // Adjust height proportionally
        offsetX = 0;  // No horizontal offset
        offsetY = (1 - repeatY) / 2;  // Center vertically
    } else {
        // Video is taller than the mesh
        repeatX = (videoAspect / meshAspect) / scaleFactor;  // Adjust width proportionally
        repeatY = 1 / scaleFactor;  // Reduce height
        offsetX = (1 - repeatX) / 2;  // Center horizontally
        offsetY = 0;  // No vertical offset
    }

    // Apply repeat and offset to fit and center the video
    mesh.material.map.repeat.set(repeatX, repeatY);
    mesh.material.map.offset.set(offsetX, offsetY);

    console.log(`Video scaling adjusted: repeatX = ${repeatX}, repeatY = ${repeatY}, offsetX = ${offsetX}, offsetY = ${offsetY}`);
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
    controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
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
