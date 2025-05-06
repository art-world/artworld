import * as THREE from "three";
import { OrbitControls } from "three/OrbitControls";
import { GLTFLoader } from "three/GLTFLoader";
import { RGBELoader } from "three/RGBELoader";

let scene, camera, renderer, model, controls, videoTexture, videoPlane;
let userInteracting = false;
const container = document.getElementById("container");
const loadingScreen = document.getElementById("loadingScreen");
const loadingText = document.createElement("div");
loadingText.innerText = "Zoom in on the Walkman and hit the 'Play' button...";
loadingText.style.textAlign = "center";
loadingScreen.appendChild(loadingText);
const loadingPercentage = document.createElement("div");
loadingPercentage.id = "loadingPercentage";
loadingScreen.appendChild(loadingPercentage);

let video;
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const nowPlayingContainer = document.getElementById("nowPlayingContainer");
const progressBar = document.getElementById("progressBar");

const MIN_DISPLAY_TIME = 5000;
const loadingStartTime = Date.now();

const manager = new THREE.LoadingManager();
manager.onProgress = function (url, itemsLoaded, itemsTotal) {
  const progress = Math.round((itemsLoaded / itemsTotal) * 100);
  loadingPercentage.innerText = `${progress}%`;
};
manager.onLoad = function () {
  const elapsed = Date.now() - loadingStartTime;
  const remaining = Math.max(MIN_DISPLAY_TIME - elapsed, 0);
  setTimeout(() => {
    loadingScreen.style.display = "none";
    container.style.display = "block";
  }, remaining);
};

init();
window.init = init;
window.animate = animate;

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  updateNowPlayingProgress();
  renderer.render(scene, camera);
}

function init() {
  document.body.addEventListener("touchstart", () => {
    if (THREE.AudioContext.getContext().state === "suspended") {
      THREE.AudioContext.getContext().resume();
    }
  }, { once: true });

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
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
  new RGBELoader().setDataType(THREE.HalfFloatType).load("assets/little_paris_under_tower_1k.hdr", function (texture) {
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

  renderer.domElement.addEventListener("mousedown", onUserInteractionStart, false);
  renderer.domElement.addEventListener("mousemove", onUserInteractionStart, false);
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
  renderer.domElement.addEventListener("touchstart", onUserInteractionStart, false);
  renderer.domElement.addEventListener("touchmove", onUserInteractionStart, false);
  renderer.domElement.addEventListener("touchend", onUserInteractionEnd, false);
}

function createVideoTexture() {
  video = document.createElement("video");
  video.setAttribute("playsinline", "");
  video.setAttribute("controls", "");
  video.crossOrigin = "anonymous";
  video.loop = true;

  const hlsUrl = "https://customer-2qqx87orhla11tfu.cloudflarestream.com/45d54a2b3ec8f752c672d8f727ca8a0a/manifest/video.m3u8";

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
  if (!glass) return;

  const targetPosition = new THREE.Vector3();
  glass.getWorldPosition(targetPosition);
  targetPosition.y -= 7.5;

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

function setupModelControls() {
  if (!model) return;
  const playButton = model.getObjectByName("PlayButton");
  const pauseButton = model.getObjectByName("PauseButton");
  const forwardButton = model.getObjectByName("ForwardButton");
  const backwardButton = model.getObjectByName("BackwardButton");
  const glass2 = model.getObjectByName("Glass2");
  const glass2Glass1_0 = model.getObjectByName("Glass2_Glass1_0");

  if (!playButton || !pauseButton || !forwardButton || !backwardButton || !glass2 || !glass2Glass1_0) return;

  playButton.userData = {
    action: async () => {
      controls.autoRotate = false;
      try {
        await video.play();
        video.muted = false;
        video.volume = 1;
        nowPlayingContainer.style.display = "block";
        focusOnVideoPlane();

        const waitForPlane = setInterval(() => {
          if (videoPlane) {
            videoPlane.visible = true;
            clearInterval(waitForPlane);
          }
        }, 100);
      } catch (err) {
        console.error("Video play failed:", err);
      }
    },
  };

  pauseButton.userData = {
    action: () => {
      if (video) video.pause();
    },
  };

  forwardButton.userData = {
    action: () => {
      video.currentTime = Math.min(video.duration, video.currentTime + 10);
    },
  };

  backwardButton.userData = {
    action: () => {
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
  if (!videoTexture || !model) return;

  const glass2 = model.getObjectByName("Glass2");
  if (!glass2) return;

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

  videoPlane = new THREE.Mesh(videoGeometry, videoMaterial);
  videoPlane.visible = false;
  videoPlane.position.copy(localPosition).add(new THREE.Vector3(-0.5, 0.06, 0.05));
  videoPlane.quaternion.copy(screenWorldQuaternion);
  videoPlane.scale.set(-0.29, 0.29, 0.29);
  videoPlane.rotateY(Math.PI);
  videoPlane.rotation.x += 0.6;

  parent.add(videoPlane);
}

function updateNowPlayingProgress() {
  if (!video || video.paused || video.ended || !video.duration) return;
  const percent = (video.currentTime / video.duration) * 100;
  progressBar.style.width = `${percent}%`;
}
