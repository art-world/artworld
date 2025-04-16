import * as THREE from "three";
import { OrbitControls } from "three/OrbitControls";
import { GLTFLoader } from "three/GLTFLoader";
import { RGBELoader } from "three/RGBELoader";

let scene, camera, renderer, model, controls, videoTexture, videoPlane;
let userInteracting = false;
const container = document.getElementById("container");
const loadingScreen = document.getElementById("loadingScreen");
const loadingText = document.createElement("div");
loadingText.innerText = "Use the walkman buttons to play audio...";
loadingText.style.textAlign = "center";
loadingScreen.appendChild(loadingText);
const loadingPercentage = document.createElement("div");
loadingScreen.appendChild(loadingPercentage);

let video;

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

const manager = new THREE.LoadingManager();
manager.onProgress = function (url, itemsLoaded, itemsTotal) {
  const progress = Math.round((itemsLoaded / itemsTotal) * 100);
  loadingPercentage.innerText = `${progress}%`;
};
manager.onLoad = function () {
  console.log("All assets loaded.");
  loadingScreen.style.display = "none";
  container.style.display = "block";
};

init();
window.init = init;
window.animate = animate;

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

function init() {
  console.log("Initializing scene...");

  document.body.addEventListener(
    "touchstart",
    () => {
      if (THREE.AudioContext.getContext().state === "suspended") {
        THREE.AudioContext.getContext()
          .resume()
          .then(() => {
            console.log("Audio context resumed");
          });
      }
    },
    { once: true }
  );

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    10000
  );
  camera.position.set(0, 60, 50);
  camera.up.set(0, 1, 0);

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
  new RGBELoader()
    .setDataType(THREE.HalfFloatType)
    .load("assets/little_paris_under_tower_1k.hdr", function (texture) {
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

  renderer.domElement.addEventListener(
    "mousedown",
    onUserInteractionStart,
    false
  );
  renderer.domElement.addEventListener(
    "mousemove",
    onUserInteractionStart,
    false
  );
  renderer.domElement.addEventListener("mouseup", onUserInteractionEnd, false);
  renderer.domElement.addEventListener("wheel", onUserInteractionStart, false);

  setupTouchEvents();

  const loader = new GLTFLoader(manager);
  loader.load("assets/model/model.gltf", function (gltf) {
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
    if (videoTexture) createVideoPlaneOverlay();
  });

  window.addEventListener("resize", onWindowResize, false);

  createVideoTexture();
  animate();
}

function setupTouchEvents() {
  renderer.domElement.addEventListener(
    "touchstart",
    onUserInteractionStart,
    false
  );
  renderer.domElement.addEventListener(
    "touchmove",
    onUserInteractionStart,
    false
  );
  renderer.domElement.addEventListener("touchend", onUserInteractionEnd, false);
}

function createVideoTexture() {
  video = document.createElement("video");
  video.setAttribute("playsinline", "");
  video.setAttribute("controls", "");
  video.crossOrigin = "anonymous";
  video.loop = true;

  const hlsUrl =
    "https://videodelivery.net/5f2131064379f44031902d4a4b9a6562/manifest/video.m3u8";

  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = hlsUrl;
    video.load();
    setupVideoTexture();
  } else if (Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource(hlsUrl);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, function () {
      setupVideoTexture();
      createVideoPlaneOverlay();
    });
  } else {
    console.error("HLS not supported in this browser");
  }

  function setupVideoTexture() {
    console.log("✅ Video texture created");
    videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBFormat;
    videoTexture.encoding = THREE.sRGBEncoding;
    videoTexture.repeat.set(1, 1);
    videoTexture.offset.set(0, 0);
    videoTexture.flipY = false;
  }
}

function onUserInteractionStart() {
  userInteracting = true;
  controls.autoRotate = false;
}

function onUserInteractionEnd() {
  userInteracting = false;
  if (video && video.paused) {
    controls.autoRotate = true;
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function focusOnVideoPlane() {
  if (!model) return;

  const glass = model.getObjectByName("Glass2");
  if (!glass) {
    console.warn("Glass2 not found for focus");
    return;
  }

  const targetPosition = new THREE.Vector3();
  glass.getWorldPosition(targetPosition);
  targetPosition.y -= 7.5; // 👈 Slightly lower the zoom point

  const normal = new THREE.Vector3(0, 0.9999, 1);
  normal.applyQuaternion(glass.quaternion);
  normal.normalize();

  const newCameraPos = targetPosition.clone().add(normal.multiplyScalar(19));

  const duration = 1000;
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  const startTime = performance.now();

  function animateFocus() {
    const elapsed = performance.now() - startTime;
    const t = Math.min(elapsed / duration, 1);
    camera.position.lerpVectors(startPos, newCameraPos, t);
    controls.target.lerpVectors(startTarget, targetPosition, t);
    camera.up.set(0, 1, 0);
    controls.update();
    if (t < 1) requestAnimationFrame(animateFocus);
  }

  animateFocus();
}

// No changes made to setupModelControls or createVideoPlaneOverlay since plane placement was confirmed to be correct

function setupModelControls() {
  if (!model) return;

  const playButton = model.getObjectByName("PlayButton");
  const pauseButton = model.getObjectByName("PauseButton");
  const forwardButton = model.getObjectByName("ForwardButton");
  const backwardButton = model.getObjectByName("BackwardButton");
  const glass2 = model.getObjectByName("Glass2");
  const glass2Glass1_0 = model.getObjectByName("Glass2_Glass1_0");

  if (
    !playButton ||
    !pauseButton ||
    !forwardButton ||
    !backwardButton ||
    !glass2 ||
    !glass2Glass1_0
  )
    return;

  playButton.userData = {
    action: async () => {
      controls.autoRotate = false;
      console.log("Play button pressed.");
      try {
        await video.play();
        video.muted = false;
        video.volume = 1;
        console.log("Video started");

        focusOnVideoPlane();

        const waitForPlane = setInterval(() => {
          if (videoPlane) {
            console.log("👁️ Setting videoPlane.visible = true");
            videoPlane.visible = true;
            clearInterval(waitForPlane);
          }
        }, 100);
      } catch (err) {
        console.error("Video play failed:", err);
        console.log("Video error state:", video.error);
      }
    },
  };

  pauseButton.userData = {
    action: () => {
      console.log("Pause button pressed.");
      if (video) video.pause();
    },
  };

  forwardButton.userData = {
    action: () => {
      console.log("Forward button pressed.");
      video.currentTime = Math.min(video.duration, video.currentTime + 10);
    },
  };

  backwardButton.userData = {
    action: () => {
      console.log("Backward button pressed.");
      video.currentTime = Math.max(0, video.currentTime - 10);
    },
  };

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

  window.addEventListener("mousedown", onDocumentMouseDown, false);
}

function createVideoPlaneOverlay() {
  console.log("⚙️ createVideoPlaneOverlay called");
  if (!videoTexture || !model) return;

  const glass2 = model.getObjectByName("Glass2");
  if (!glass2) {
    console.warn("Glass2 not found");
    return;
  }

  const screenWorldPosition = new THREE.Vector3();
  const screenWorldQuaternion = new THREE.Quaternion();
  glass2.getWorldPosition(screenWorldPosition);
  glass2.getWorldQuaternion(screenWorldQuaternion);

  const parent = glass2.parent;
  const localPosition = new THREE.Vector3();
  parent.worldToLocal(localPosition.copy(screenWorldPosition));

  const videoGeometry = new THREE.PlaneGeometry(16, 9);
  const videoMaterial = new THREE.MeshBasicMaterial({
    map: videoTexture,
    side: THREE.DoubleSide,
  });
  console.log("✅ Video plane created");
  videoPlane = new THREE.Mesh(videoGeometry, videoMaterial);
  videoPlane.visible = false;
  videoPlane.position
    .copy(localPosition)
    .add(new THREE.Vector3(-0.5, 0.06, 0.05));
  videoPlane.quaternion.copy(screenWorldQuaternion);
  videoPlane.scale.set(0.29, 0.29, 0.29);
  videoPlane.rotateY(Math.PI);
  videoPlane.rotation.x += 0.6;

  parent.add(videoPlane);
}
