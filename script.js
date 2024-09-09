let scene, camera, renderer, model, controls, videoTexture;
const container = document.getElementById('container');
let audioLoader, listener, sound;
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
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // OrbitControls setup
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2;
    controls.autoRotate = true; // Enable auto-rotate
    controls.autoRotateSpeed = 1.0; // Adjust the speed as needed

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 3);
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 2);
    hemisphereLight.position.set(0, 200, 0);
    scene.add(hemisphereLight);

    // Load model
    const loader = new THREE.GLTFLoader();
    loader.load(
        'assets/model/Buttons2.gltf',
        function(gltf) {
            model = gltf.scene;
            model.scale.set(200, 200, 200);
            scene.add(model);
            controls.target.set(0, 0, 0); // Ensure the controls target the center of the model
            controls.update();  // Apply the update method after the model loads
            createVideoTexture();  // Create video texture but don't apply it yet
        }
    );

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    // Create audio listener and loader
    listener = new THREE.AudioListener();
    camera.add(listener);
    audioLoader = new THREE.AudioLoader();
}

function createVideoTexture() {
    video = document.createElement('video');
    video.src = 'assets/Untitled.mp4';  // Path to your video
    video.setAttribute('playsinline', '');  // For iOS support
    video.load();

    video.addEventListener('loadeddata', () => {
        console.log('Video loaded successfully');
        video.loop = true;

        // Create video texture
        videoTexture = new THREE.VideoTexture(video);
        videoTexture.minFilter = THREE.LinearFilter;
        videoTexture.magFilter = THREE.LinearFilter;
        videoTexture.format = THREE.RGBFormat;

        console.log('Video texture created.');
    });

    video.addEventListener('error', (e) => {
        console.error('Error loading video:', e);
    });
}

function applyVideoTextureToMesh() {
    const Glass2_Glass1_0 = model.getObjectByName('Glass2_Glass1_0');
    if (Glass2_Glass1_0 && videoTexture) {
        Glass2_Glass1_0.material = new THREE.MeshBasicMaterial({ map: videoTexture });
        
        // Calculate the aspect ratio of the video and the mesh
        const meshAspect = Glass2_Glass1_0.geometry.boundingBox.max.x / Glass2_Glass1_0.geometry.boundingBox.max.y;
        const videoAspect = video.videoWidth / video.videoHeight;

        // Adjust texture scaling
        if (videoAspect > meshAspect) {
            videoTexture.repeat.set(meshAspect / videoAspect, 1);
        } else {
            videoTexture.repeat.set(1, videoAspect / meshAspect);
        }

        video.play();  // Play the video
        console.log('Video texture applied and scaled to Glass2_Glass1_0.');
    } else {
        console.error('Glass2_Glass1_0 not found in the model or video texture is unavailable.');
    }
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
            applyVideoTextureToMesh(); // Apply the video texture on play button press
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

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    if (controls) {
        controls.update();  // Ensure controls.update() is called only if controls are defined
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
