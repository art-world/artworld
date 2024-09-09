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
    camera.position.set(0, 50, 100);  // Adjusted camera position to make sure it's further from the model
    console.log('Camera initialized at position:', camera.position);

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
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.0;

    // Lighting setup (increased intensity)
    const ambientLight = new THREE.AmbientLight(0xffffff, 5);  // Increased intensity for better visibility
    scene.add(ambientLight);
    console.log('Ambient light added.');

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 3);  // Increased intensity
    hemisphereLight.position.set(0, 200, 0);
    scene.add(hemisphereLight);
    console.log('Hemisphere light added.');

    // Load model
    const loader = new THREE.GLTFLoader();
    loader.load(
        'assets/model/Buttons2.gltf',
        function(gltf) {
            model = gltf.scene;
            model.scale.set(200, 200, 200);
            model.position.set(0, 0, 0);  // Ensure model is positioned at the origin
            scene.add(model);
            console.log('Model loaded and added to the scene.');
            controls.target.set(0, 0, 0);
            controls.update();
            createVideoTexture();  // Create video texture but don't apply it yet
        },
        undefined,
        function(error) {
            console.error('Error loading model:', error);
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
