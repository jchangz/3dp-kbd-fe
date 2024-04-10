import * as THREE from "three";
import { debounce } from "lodash";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { GainMapLoader } from "@monogrid/gainmap-js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import { MathUtils } from "three";
import Keyboard from "./keyboard";
import { keyLight, fillLight, shadowPlane } from "./lights";

let canvas: HTMLElement | null, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, controls: OrbitControls;
let keyboardName: string;
let keyboardType: string;
let changed = false;
const scene = new THREE.Scene();
const keyboard = new Keyboard(scene);

const manager2 = new THREE.LoadingManager();
manager2.onProgress = (url, loaded, total) => {
  let progress = (loaded / total) * 100;
};
manager2.onLoad = () => {};
const reloader = new GLTFLoader(manager2).setMeshoptDecoder(MeshoptDecoder);

const centerVector = new THREE.Vector3(),
  centerBox = new THREE.Box3();

const onChange = () => (changed = true);

const onKeyboardChange = (e: Event, side: string) => {
  const { target } = e;
  if (target instanceof HTMLInputElement) {
    const {
      value,
      dataset: { type },
    } = target;

    if (type === "macro") {
      const fileName = keyboard.getFileName(side, value);
      reloader.loadAsync(fileName).then((gltf: GLTF) => {
        if (side === "left") keyboard.leftKeyboard = value;
        if (side === "right") keyboard.rightKeyboard = value;
        keyboard.caseLoader(gltf, side);
        keyboard.createKeys(side);
        setCameraCenter();
      });
    } else {
      if (side === "left") keyboard.leftKeyboard = value;
      if (side === "right") keyboard.rightKeyboard = value;
      keyboard.createKeys(side);
      changed = true;
    }
  }
};

const leftSideInput = document.getElementById("left-options");
const rightSideInput = document.getElementById("right-options");
const rightShiftInput = document.getElementById("right-shift");
const bottomCaseInput = document.getElementById("bottom-case");

bottomCaseInput?.addEventListener("change", function (e) {
  if (e.target instanceof HTMLInputElement) {
    keyboard.setBottomCase(e.target.value);
    changed = true;
  }
});
leftSideInput?.addEventListener("change", (e) => onKeyboardChange(e, "left"));
rightSideInput?.addEventListener("change", (e) => onKeyboardChange(e, "right"));
rightShiftInput?.addEventListener("change", function (e) {
  if (e.target instanceof HTMLInputElement) {
    keyboard.rightShift = e.target.value;
    changed = true;
  }
});

init();
animate();

function init() {
  canvas = document.querySelector(".canvas");

  if (canvas) {
    keyboardName = canvas.dataset.keyboard || "";
    keyboardType = canvas.dataset.type || "";

    keyboard.setKeyboard(keyboardName, keyboardType);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x1f1f1f);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
    canvas.appendChild(renderer.domElement);

    camera = new THREE.PerspectiveCamera(1, canvas.offsetWidth / canvas.offsetHeight, 1, 1000);
    camera.position.set(110, 90, -70);
    setCameraFOV();

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    // controls.autoRotate = true;
    controls.minDistance = 100;
    controls.maxDistance = 200;
    controls.addEventListener("change", onChange);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    // GUI

    const params = {
      case: keyboard.caseMat.color.getHex(),
      keycap: keyboard.keyMat.color.getHex(),
    };

    const gui = new GUI({ autoPlace: false });
    gui.domElement.id = "gui";
    canvas.appendChild(gui.domElement);
    gui.addColor(params, "case").onChange(function (val) {
      keyboard.caseMat.color.setHex(val);
      changed = true;
    });
    gui.addColor(params, "keycap").onChange(function (val) {
      keyboard.keyMat.color.setHex(val);
      changed = true;
    });
    gui.open();

    // Loaders

    const manager = new THREE.LoadingManager(() => {
      scene.add(keyboard.main);
      const loadScreen = document.getElementById("three-loading");
      loadScreen?.classList.add("opacity-0");
      loadScreen?.addEventListener("transitionend", (e) => {
        if (e.target instanceof HTMLElement) e.target.remove();
      });
      setCameraCenter();
      pmremGenerator.dispose();
      changed = true;
    });
    const dracoLoader = new DRACOLoader(manager);
    dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
    const loader = new GLTFLoader(manager).setDRACOLoader(dracoLoader).setMeshoptDecoder(MeshoptDecoder);

    // Textures

    const texloader = new THREE.TextureLoader(manager);

    const caseNormal = texloader.load("models/3dp_normal.webp");
    caseNormal.repeat.set(0, 3);
    keyboard.caseMat.normalMap = caseNormal;

    const caseRoughness = texloader.load("models/3dp_roughness.webp");
    caseRoughness.repeat.set(0, 3);
    keyboard.caseMat.roughnessMap = caseRoughness;

    const caseAO = texloader.load("models/3dp_ao.webp");
    caseAO.repeat.set(0, 3);
    keyboard.caseMat.aoMap = caseAO;

    const caseFaceNormal = texloader.load("models/3dp_face.webp");
    caseFaceNormal.repeat.set(25, 25);
    keyboard.faceMat.normalMap = caseFaceNormal;

    const keyNormal = texloader.load("models/key_normal.webp");
    keyNormal.repeat.set(2, 2);
    keyboard.keyMat.normalMap = keyNormal;

    const keyRoughness = texloader.load("models/key_roughness.webp");
    keyRoughness.repeat.set(2, 2);
    keyboard.keyMat.roughnessMap = keyRoughness;

    caseNormal.wrapS = caseNormal.wrapT = caseRoughness.wrapS = caseRoughness.wrapT = caseAO.wrapS = caseAO.wrapT = caseFaceNormal.wrapS = caseFaceNormal.wrapT = keyNormal.wrapS = keyNormal.wrapT = keyRoughness.wrapS = keyRoughness.wrapT = THREE.RepeatWrapping;

    // Environment

    const gainMap = new GainMapLoader(renderer).load(["gainmap/studio.webp", "gainmap/studio-gainmap.webp", "gainmap/studio.json"], function (texture) {
      const gainMapBackground = texture.renderTarget.texture;
      gainMapBackground.mapping = THREE.EquirectangularReflectionMapping;
      gainMapBackground.needsUpdate = true;
      const gainMapPMREMRenderTarget = pmremGenerator.fromEquirectangular(gainMapBackground);

      keyboard.envMap = gainMapPMREMRenderTarget ? gainMapPMREMRenderTarget.texture : null;
      gainMap.dispose();
    });

    scene.add(keyLight);
    scene.add(fillLight);
    scene.add(shadowPlane);

    loader.load(keyboard.getFileName("left"), (gltf) => keyboard.caseLoader(gltf, "left"));
    loader.load(keyboard.getFileName("right"), (gltf) => keyboard.caseLoader(gltf, "right"));

    loader.load("models/switch.glb", function (gltf) {
      gltf.scene.visible = false;
      scene.add(gltf.scene);

      keyboard.createKeys("left");
      keyboard.createKeys("right");
    });

    // Resize Handler
    const debounceResize = debounce(onWindowResize, 250);
    window.addEventListener("resize", debounceResize);
  }
}

function setCameraCenter() {
  centerBox.setFromObject(keyboard.mainGroup);
  centerBox.getCenter(centerVector);
  camera.lookAt(centerVector);
  camera.updateProjectionMatrix();
  controls.target.set(centerVector.x, centerVector.y, centerVector.z);
}

function setCameraFOV() {
  // https://discourse.threejs.org/t/keeping-an-object-scaled-based-on-the-bounds-of-the-canvas-really-battling-to-explain-this-one/17574/10
  const fov = 1;
  const aspectRatio = 2;
  const cameraHeight = Math.tan(MathUtils.degToRad(fov / 2));
  const ratio = camera.aspect / aspectRatio;
  const newCameraHeight = cameraHeight / ratio;
  camera.fov = MathUtils.radToDeg(Math.atan(newCameraHeight)) * 2;
}

function onWindowResize() {
  if (canvas) {
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    camera.aspect = width / height;

    setCameraFOV();

    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    changed = true;
  }
}

function animate() {
  requestAnimationFrame(animate);
  if (controls.update() || changed) {
    render();
    changed = false;
  }
}

function render() {
  keyboard.renderKeys();
  controls.update();
  renderer.render(scene, camera);
}
