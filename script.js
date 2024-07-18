let scene, camera, renderer, model, controls;
const container = document.getElementById('container');
const loadingScreen = document.getElementById('loadingScreen');
const loadingPercentage = document.getElementById('loadingPercentage');
let audioLoader, listener, sound;
let audioFiles = [
    './assets/audio/11_WIP_.mp3',
    './assets/audio/86_WIP_.mp3',
    './assets/audio/90 V1_WIP_.mp3',
    './assets/audio/91_WIP_.mp3'
];
let currentAudioIndex = 0;
let shaderMaterial;

init();
animate();

function init() {
    console.log('Initializing scene...');
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a); // Set background to a lighter shade
    console.log('Scene created.');

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.set(0, 50, 20); // Move the camera closer to the model
    console.log('Camera initialized.');

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(0x1a1a1a); // Set background to a lighter shade
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    console.log('Renderer initialized.');

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 2); // Increase intensity of ambient light
    scene.add(ambientLight);
    console.log('Ambient light added.');

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    hemisphereLight.position.set(0, 200, 0);
    scene.add(hemisphereLight);
    console.log('Hemisphere light added.');

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight1.position.set(1, 1, 1).normalize();
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight2.position.set(-1, -1, -1).normalize();
    scene.add(directionalLight2);
    console.log('Directional lights added.');

    // Load HDRI environment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    new THREE.RGBELoader()
        .setDataType(THREE.UnsignedByteType) // set data type
        .load('./assets/little_paris_under_tower_1k.hdr', function(texture) {
            const envMap = pmremGenerator.fromEquirectangular(texture).texture;
            scene.environment = envMap; // Use the HDR for environment lighting only
            texture.dispose();
            pmremGenerator.dispose();
        });

    // OrbitControls setup
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2;

    // Load model with progress tracking
    const loader = new THREE.GLTFLoader();
    loader.load('./assets/model/Buttons2.gltf', function(gltf) {
        console.log('Model loaded successfully.');
        model = gltf.scene;
        model.position.set(0, 0, 0);
        model.scale.set(200, 200, 200); // Scale the model up
        scene.add(model);
        controls.target.set(0, 0, 0); // Ensure the controls target the center of the model
        controls.update();

        setupModelControls();
        loadingScreen.style.display = 'none';
        container.style.display = 'block';
    }, function(xhr) {
        // Update loading percentage
        if (xhr.lengthComputable) {
            const percentComplete = Math.round((xhr.loaded / xhr.total) * 100);
            loadingPercentage.innerText = `${percentComplete}%`;
        }
    }, function (error) {
        console.error('Error loading model:', error);
    });

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    // Create audio listener and loader
    listener = new THREE.AudioListener();
    camera.add(listener);
    audioLoader = new THREE.AudioLoader();

    // Create shader material
    shaderMaterial = new THREE.ShaderMaterial({
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float iTime;
            uniform vec2 iResolution;
            varying vec2 vUv;

            // Shadertoy shader code
            void mainImage( out vec4 fragColor, in vec2 fragCoord )
            {
                vec2 uv = fragCoord / iResolution.xy;
                vec3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + vec3(0,2,4));
                fragColor = vec4(col,1.0);
            }

            void main() {
                mainImage(gl_FragColor, vUv * iResolution.xy);
            }
        `,
        uniforms: {
            iTime: { value: 0 },
            iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
        }
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
    const glass2 = model.getObjectByName('Glass2');
    const glass2Glass1_0 = model.getObjectByName('Glass2_Glass1_0');

    console.log("Buttons and Screens:", {
        playButton,
        pauseButton,
        forwardButton,
        backwardButton,
        glass2,
        glass2Glass1_0
    });

    if (!playButton || !pauseButton || !forwardButton || !backwardButton || !glass2 || !glass2Glass1_0) {
        console.error('One or more buttons or the screen textures are not found on the model.');
        return;
    }
    playButton.userData = { action: () => { console.log('Play button pressed.'); playAudio(audioFiles[currentAudioIndex]); } };
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

    playButton.userData.action = () => {
        console.log('Play button pressed.');
        playAudio(audioFiles[currentAudioIndex]);
        glass2.material = shaderMaterial;
        glass2Glass1_0.material = shaderMaterial;
    };
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    shaderMaterial.uniforms.iResolution.value.set(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
    shaderMaterial.uniforms.iTime.value += 0.05; // Update time uniform
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
