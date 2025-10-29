import * as THREE from "three";
import { OrbitControls } from "three/OrbitControls";
import { GLTFLoader } from "three/GLTFLoader";
import { RGBELoader } from "three/RGBELoader";

let scene, camera, renderer, model, controls, videoTexture, videoPlane;
let userInteracting = false;

const container = document.getElementById("container");
const loadingScreen = document.getElementById("loadingScreen");

// Loading overlay text + %
const loadingText = document.createElement("div");
loadingText.innerText = "Zoom in on the Walkman and hit the 'Play' button...";
loadingText.style.textAlign = "center";
loadingScreen.appendChild(loadingText);

const loadingPercentage = document.createElement("div");
loadingPercentage.id = "loadingPercentage";
loadingScreen.appendChild(loadingPercentage);

// Video / playback state
let video;              // <video> element
let hlsInstance = null; // hls.js instance so we can reload streams
let currentVideoIndex = 0;

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// UI elements
const nowPlayingContainer = document.getElementById("nowPlayingContainer");
const nowPlayingText = document.getElementById("nowPlayingText");
const progressBar = document.getElementById("progressBar");

// download link element for the ZIP file
const downloadAudioLink = document.getElementById("downloadAudio");

const MIN_DISPLAY_TIME = 5000;
const loadingStartTime = Date.now();

// =========================
// MULTI VIDEO STATE
// =========================
// Order: your NEW video first, original video second.
const videosData = [
  {
    // VIDEO 1 (new one you sent)
    hlsUrl:
      "https://customer-2qqx87orhla11tfu.cloudflarestream.com/b7423142323ade1585dc51bd498de56c/manifest/video.m3u8",
    label: "[1/2] Now Playing: Artworld - M4",
  },
  {
    // VIDEO 2 (original / older one)
    hlsUrl:
      "https://customer-2qqx87orhla11tfu.cloudflarestream.com/45d54a2b3ec8f752c672d8f727ca8a0a/manifest/video.m3u8",
    label: "[2/2] Now Playing: Artworld - Alpina",
  },
];

// =========================
// LOADING MANAGER
// =========================
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

// =========================
// BOOT
// =========================
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
  // iOS audio unlock
  document.body.addEventListener(
    "touchstart",
    () => {
      if (THREE.AudioContext.getContext().state === "suspended") {
        THREE.AudioContext.getContext().resume();
      }
    },
    { once: true }
  );

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    10000
  );
  camera.position.set(0, 60, 50);
  camera.up.set(0, 1, 0);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setClearColor(0xffffff);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.toneMappingExposure = 1.5;
  container.appendChild(renderer.domElement);

  // Lights
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

  // HDR environment reflection
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

  // Orbit Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
  controls.screenSpacePanning = false;
  controls.maxPolarAngle = Math.PI / 2;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.0;

  // Mouse / wheel interaction stops auto rotate
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
  renderer.domElement.addEventListener(
    "mouseup",
    onUserInteractionEnd,
    false
  );
  renderer.domElement.addEventListener("wheel", onUserInteractionStart, false);

  setupTouchEvents();

  // Load model
  const loader = new GLTFLoader(manager);
  loader.load("assets/model/model.gltf", function (gltf) {
    model = gltf.scene;
    model.position.set(0, 0, 0);
    model.scale.set(200, 200, 200);
    scene.add(model);

    controls.target.set(0, 0, 0);
    controls.update();

    // give shiny feel on meshes
    model.traverse((child) => {
      if (child.isMesh) {
        child.material.envMapIntensity = 2;
      }
    });

    // setup clickable Walkman areas
    setupModelControls();

    // if videoTexture already exists, we can overlay it now
    if (videoTexture) createVideoPlaneOverlay();
  });

  // resize listener
  window.addEventListener("resize", onWindowResize, false);

  // init video system & load first stream
  initVideoSystem();

  // start render loop
  animate();
}

// =========================
// TOUCH EVENTS
// =========================
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
  renderer.domElement.addEventListener(
    "touchend",
    onUserInteractionEnd,
    false
  );
}

// =========================
// VIDEO SYSTEM
// =========================

// Create the <video>, create the texture, attach overlay plane if model is ready,
// and load the first video source.
function initVideoSystem() {
  // create <video> tag once
  video = document.createElement("video");
  video.setAttribute("playsinline", "");
  video.setAttribute("controls", "");
  video.crossOrigin = "anonymous";
  video.loop = true;

  // build Three.js texture once
  videoTexture = new THREE.VideoTexture(video);
  videoTexture.minFilter = THREE.LinearFilter;
  videoTexture.magFilter = THREE.LinearFilter;
  videoTexture.format = THREE.RGBFormat;
  videoTexture.encoding = THREE.sRGBEncoding;
  videoTexture.repeat.set(1, 1);
  videoTexture.offset.set(0, 0);
  videoTexture.flipY = false;

  // if model already loaded, we can draw the plane now
  if (model) {
    createVideoPlaneOverlay();
  }

  // load first video in the array
  loadVideoByIndex(currentVideoIndex);
}

// Swap which video is active, update the bottom bar text,
// and set up auto-advance to the next video when it ends.
function loadVideoByIndex(index) {
  currentVideoIndex = index;

  const { hlsUrl, label } = videosData[currentVideoIndex];

  // update "now playing" text line
  if (nowPlayingText) {
    nowPlayingText.textContent = label;
  }

  // kill old hls instance if it exists
  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }

  // attach new source (Safari/iOS native first, else hls.js)
  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = hlsUrl;
    video.load();
  } else if (window.Hls && window.Hls.isSupported()) {
    hlsInstance = new Hls();
    hlsInstance.loadSource(hlsUrl);
    hlsInstance.attachMedia(video);
  } else {
    console.error("HLS not supported in this browser");
  }

  // when this video ends, jump to the next one automatically
  video.onended = async () => {
    const nextIndex = (currentVideoIndex + 1) % videosData.length;
    loadVideoByIndex(nextIndex);

    try {
      await video.play();
      video.muted = false;
      video.volume = 1;

      nowPlayingContainer.style.display = "block";
      focusOnVideoPlane();

      if (videoPlane) {
        videoPlane.visible = true;
      }
    } catch (err) {
      console.error("Auto-play failed:", err);
    }
  };
}

// =========================
// USER INTERACTION STATE
// =========================
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

// =========================
// RESIZE HANDLER
// =========================
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// =========================
/* CAMERA FOCUS / ZOOM IN */
// =========================
function focusOnVideoPlane() {
  if (!model) return;
  const glass = model.getObjectByName("Glass2");
  if (!glass) return;

  // world position of the Walkman screen
  const targetPosition = new THREE.Vector3();
  glass.getWorldPosition(targetPosition);
  targetPosition.y -= 7.5;

  // "forward" direction from the glass
  const normal = new THREE.Vector3(0, 1, 1);
  normal.applyQuaternion(glass.quaternion);
  normal.normalize();

  // final camera spot near the screen
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

// =========================
// MODEL BUTTON LOGIC / RAYCAST
// =========================
function setupModelControls() {
  if (!model) return;

  const playButton = model.getObjectByName("PlayButton");
  const pauseButton = model.getObjectByName("PauseButton");
  const forwardButton = model.getObjectByName("ForwardButton");
  const backwardButton = model.getObjectByName("BackwardButton");

  // screen parts (used by your focus function)
  const glass2 = model.getObjectByName("Glass2");
  const glass2Glass1_0 = model.getObjectByName("Glass2_Glass1_0");

  // download hotspot on the Walkman body
  const downloadButton = model.getObjectByName("pCube3_Case1_0");

  if (
    !playButton ||
    !pauseButton ||
    !forwardButton ||
    !backwardButton ||
    !glass2 ||
    !glass2Glass1_0 ||
    !downloadButton
  )
    return;

  // PLAY button
  playButton.userData = {
    action: async () => {
      controls.autoRotate = false;
      try {
        await video.play();
        video.muted = false;
        video.volume = 1;

        nowPlayingContainer.style.display = "block";

        focusOnVideoPlane();

        if (videoPlane) {
          videoPlane.visible = true;
        }
      } catch (err) {
        console.error("Video play failed:", err);
      }
    },
  };

  // PAUSE button
  pauseButton.userData = {
    action: () => {
      if (video) video.pause();
    },
  };

  // FORWARD button = NEXT VIDEO
  forwardButton.userData = {
    action: async () => {
      const nextIndex = (currentVideoIndex + 1) % videosData.length;

      try {
        video.pause();
      } catch (e) {
        // ignore
      }

      loadVideoByIndex(nextIndex);

      try {
        await video.play();
        video.muted = false;
        video.volume = 1;

        nowPlayingContainer.style.display = "block";

        focusOnVideoPlane();

        if (videoPlane) {
          videoPlane.visible = true;
        }
      } catch (err) {
        console.error("Video play failed after forward switch:", err);
      }
    },
  };

  // BACKWARD button = PREVIOUS VIDEO
  backwardButton.userData = {
    action: async () => {
      const prevIndex =
        (currentVideoIndex - 1 + videosData.length) % videosData.length;

      try {
        video.pause();
      } catch (e) {
        // ignore
      }

      loadVideoByIndex(prevIndex);

      try {
        await video.play();
        video.muted = false;
        video.volume = 1;

        nowPlayingContainer.style.display = "block";

        focusOnVideoPlane();

        if (videoPlane) {
          videoPlane.visible = true;
        }
      } catch (err) {
        console.error("Video play failed after backward switch:", err);
      }
    },
  };

  // DOWNLOAD button (pCylinder2_Case1_0)
  downloadButton.userData = {
    action: () => {
      // trigger download of the ZIP that contains both tracks
      if (downloadAudioLink) {
        downloadAudioLink.click();
      }
    },
  };

  // RAYCAST SETUP (click to hit buttons)
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
      if (object.userData && object.userData.action) {
        object.userData.action();
      }
    }
  }

  window.addEventListener("mousedown", onDocumentMouseDown, false);
}

// =========================
// VIDEO PLANE OVERLAY
// =========================
function createVideoPlaneOverlay() {
  if (!videoTexture || !model) return;

  const glass2 = model.getObjectByName("Glass2");
  if (!glass2) return;

  // get Glass2 world transform
  const screenWorldPosition = new THREE.Vector3();
  const screenWorldQuaternion = new THREE.Quaternion();
  glass2.getWorldPosition(screenWorldPosition);
  glass2.getWorldQuaternion(screenWorldQuaternion);

  // convert world pos into parent's local space
  const parent = glass2.parent;
  const localPosition = new THREE.Vector3();
  parent.worldToLocal(localPosition.copy(screenWorldPosition));

  // build plane that shows the playing video
  const videoGeometry = new THREE.PlaneGeometry(16, 9);
  const videoMaterial = new THREE.MeshBasicMaterial({
    map: videoTexture,
    side: THREE.DoubleSide,
  });

  videoPlane = new THREE.Mesh(videoGeometry, videoMaterial);
  videoPlane.visible = false;

  // position + orient plane over Walkman screen
  videoPlane.position
    .copy(localPosition)
    .add(new THREE.Vector3(-0.5, 0.06, 0.05));
  videoPlane.quaternion.copy(screenWorldQuaternion);

  videoPlane.scale.set(-0.29, 0.29, 0.29);
  videoPlane.rotateY(Math.PI);
  videoPlane.rotation.x += 0.6;

  parent.add(videoPlane);
}

// =========================
// NOW PLAYING BAR PROGRESS
// =========================
function updateNowPlayingProgress() {
  if (!video || video.paused || video.ended || !video.duration) return;
  const percent = (video.currentTime / video.duration) * 100;
  progressBar.style.width = `${percent}%`;
}
