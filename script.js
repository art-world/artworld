let scene, camera, renderer, controls;
const container = document.getElementById('container');
const loadingScreen = document.getElementById('loadingScreen');
const loadingPercentage = document.getElementById('loadingPercentage');

init();
animate();

function init() {
    console.log('Initializing scene...');

    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    console.log('Scene created.');

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 50, 20);
    console.log('Camera initialized.');

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
    console.log('Renderer initialized.');

    // Controls setup
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;
    console.log('Controls initialized.');

    // Lights setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 2);
    scene.add(ambientLight);
    console.log('Ambient light added.');

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);
    console.log('Directional light added.');

    // Load environment map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    new THREE.RGBELoader()
        .setDataType(THREE.UnsignedByteType)
        .load('assets/little_paris_under_tower_1k.hdr', function (texture) {
            const envMap = pmremGenerator.fromEquirectangular(texture).texture;
            scene.environment = envMap;
            scene.background = envMap;
            texture.dispose();
            pmremGenerator.dispose();
            console.log('Environment map loaded.');
        });

    // Load model
    const loader = new THREE.GLTFLoader();
    loader.load(
        'assets/model/Buttons2.gltf', 
        function (gltf) {
            const model = gltf.scene;
            scene.add(model);
            console.log('Model loaded:', model);
            loadingScreen.style.display = 'none'; // Hide loading screen
        },
        function (xhr) {
            const percentage = (xhr.loaded / xhr.total) * 100;
            loadingPercentage.textContent = Math.round(percentage) + '%';
            console.log('Model loading progress:', Math.round(percentage) + '%');
        },
        function (error) {
            console.error('An error happened during model loading:', error);
        }
    );

    // Event listeners
    window.addEventListener('resize', onWindowResize);
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
