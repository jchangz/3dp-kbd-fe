import * as THREE from "three";
import { debounce } from "lodash";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { GainMapLoader } from "@monogrid/gainmap-js";
import { MathUtils } from "three";
import { Keeb, isValidKeyboardName, isValidKeyboardType, isValidKeyboardVariant } from "./keyboard";
import { keyLight, spotLight, fillLight, shadowPlane } from "./lights";
import { getKeyboardData, getSwitchData, getUSBData } from "./utils";

type KBSide = "left" | "right";

let canvas: HTMLElement | null, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, controls: OrbitControls;
const scene = new THREE.Scene();
const mainGroup = new THREE.Group();

const centerVector = new THREE.Vector3(),
  centerBox = new THREE.Box3();

let changed = false;

const fov = 50;

init();
animate();

function init() {
  canvas = document.querySelector(".canvas");

  // Loading Managers

  const manager = new THREE.LoadingManager();
  const dracoLoader = new DRACOLoader(manager);
  dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
  const loader = new GLTFLoader(manager).setDRACOLoader(dracoLoader).setMeshoptDecoder(MeshoptDecoder);

  const manager2 = new THREE.LoadingManager();
  manager2.onProgress = (url, loaded, total) => {
    let progress = (loaded / total) * 100;
  };
  manager2.onLoad = () => {};
  const reloader = new GLTFLoader(manager2).setDRACOLoader(dracoLoader).setMeshoptDecoder(MeshoptDecoder);

  // Materials

  const envMapRotation = new THREE.Euler(0, -Math.PI / 2, 0);
  const envMapIntensity = 0.4;
  const caseMat = new THREE.MeshStandardMaterial({
    roughness: 0.8,
    envMapIntensity: envMapIntensity,
    envMapRotation: envMapRotation,
  });
  const faceMat = new THREE.MeshStandardMaterial({
    roughness: 0.4,
    envMapIntensity: envMapIntensity,
    envMapRotation: envMapRotation,
  });
  const keyMat = new THREE.MeshStandardMaterial({
    color: 0x171718,
    roughness: 0.5,
    envMapIntensity: envMapIntensity,
    envMapRotation: envMapRotation,
  });
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x171718,
    roughness: 0.3,
    envMapIntensity: envMapIntensity,
    envMapRotation: envMapRotation,
  });
  const pcbMat = new THREE.MeshStandardMaterial({
    color: 0x301934,
    roughness: 0.8,
    envMapIntensity: envMapIntensity,
    envMapRotation: envMapRotation,
  });
  const usbMat = new THREE.MeshStandardMaterial({
    metalness: 1,
    roughness: 0.2,
    envMapIntensity: envMapIntensity,
    envMapRotation: envMapRotation,
  });
  caseMat.color = faceMat.color = new THREE.Color(0x171718);

  // Change Color Options

  const onColorChange = (e: Event, material: THREE.MeshStandardMaterial) => {
    const { target } = e;
    if (target instanceof HTMLInputElement) {
      const color = new THREE.Color(target.value);
      material.color.setHex(color.getHex());
      changed = true;
    }
  };

  const inputCaseColor = document.getElementById("case-color");
  inputCaseColor?.addEventListener("input", (e) => onColorChange(e, caseMat));

  const inputKeycapColor = document.getElementById("keycap-color");
  inputKeycapColor?.addEventListener("input", (e) => onColorChange(e, keyMat));

  if (canvas) {
    // Renderer

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
    canvas.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    // Camera

    camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(0, 6, 12);
    setCameraFOV();

    // Controls

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    // controls.autoRotate = true;
    controls.minDistance = 5;
    controls.maxDistance = 20;
    controls.addEventListener("change", () => (changed = true));

    // On Initial Load

    manager.onLoad = () => {
      scene.add(mainGroup);
      const loadScreen = document.getElementById("three-loading");
      loadScreen?.classList.add("opacity-0");
      loadScreen?.addEventListener("transitionend", (e) => {
        if (e.target instanceof HTMLElement) e.target.remove();
      });

      const leftSideInput = document.getElementById("left-options");
      const guiInput = document.getElementsByClassName("three-gui");
      if (leftSideInput && guiInput.length) {
        for (let item of guiInput) {
          if (item instanceof HTMLElement) item.style.height = leftSideInput.offsetHeight + "px";
        }
      }

      const configuratorControls = document.getElementById("configurator");
      configuratorControls?.classList.add("opacity-100");

      pmremGenerator.dispose();
      setKeyboardToCenter();
      changed = true;
    };

    // Texture Loader

    const texloader = new THREE.TextureLoader(manager);

    const caseNormal = texloader.load("textures/3dp_normal.webp");
    caseNormal.repeat.set(0, 3);
    caseMat.normalMap = caseNormal;

    const caseRoughness = texloader.load("textures/3dp_roughness.webp");
    caseRoughness.repeat.set(0, 3);
    caseMat.roughnessMap = caseRoughness;

    const caseAO = texloader.load("textures/3dp_ao.webp");
    caseAO.repeat.set(0, 3);
    caseMat.aoMap = caseAO;

    const caseFaceNormal = texloader.load("textures/3dp_face.webp");
    caseFaceNormal.repeat.set(25, 25);
    faceMat.normalMap = caseFaceNormal;

    const keyNormal = texloader.load("textures/key_normal.webp");
    keyNormal.repeat.set(10, 10);
    keyMat.normalMap = keyNormal;

    const keyRoughness = texloader.load("textures/key_roughness.webp");
    keyRoughness.repeat.set(10, 10);
    keyMat.roughnessMap = keyRoughness;

    caseNormal.wrapS = caseNormal.wrapT = caseRoughness.wrapS = caseRoughness.wrapT = caseAO.wrapS = caseAO.wrapT = caseFaceNormal.wrapS = caseFaceNormal.wrapT = keyNormal.wrapS = keyNormal.wrapT = keyRoughness.wrapS = keyRoughness.wrapT = THREE.RepeatWrapping;

    // Environment Loader

    const gainMap = new GainMapLoader(renderer).load(["gainmap/studio.webp", "gainmap/studio-gainmap.webp", "gainmap/studio.json"], function (texture) {
      const gainMapBackground = texture.renderTarget.texture;
      gainMapBackground.mapping = THREE.EquirectangularReflectionMapping;
      gainMapBackground.needsUpdate = true;
      const gainMapPMREMRenderTarget = pmremGenerator.fromEquirectangular(gainMapBackground);

      caseMat.envMap = faceMat.envMap = usbMat.envMap = pcbMat.envMap = keyMat.envMap = baseMat.envMap = gainMapPMREMRenderTarget ? gainMapPMREMRenderTarget.texture : null;
      gainMap.dispose();
    });

    // Lighting

    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(0x000000, 10, 50);

    // scene.add(keyLight);
    scene.add(spotLight);
    scene.add(shadowPlane);

    // Create Keyboard
    // Load Case, Switch, Keycap Files
    const {
      dataset: { keyboard, type },
    } = canvas;

    if (keyboard && isValidKeyboardName(keyboard) && type && isValidKeyboardType(type)) {
      const keyboardData = getKeyboardData({ keyboard, type });
      const leftKeyboardData = keyboardData.leftSide();
      const rightKeyboardData = keyboardData.rightSide();

      const switchData = getSwitchData({ keyboard });
      const usbGeometry = getUSBData({ keyboard });

      const leftKeyboard = new Keeb(leftKeyboardData.selectedOptType, leftKeyboardData.selectedOptValue);
      const rightKeyboard = new Keeb(rightKeyboardData.selectedOptType, rightKeyboardData.selectedOptValue);
      mainGroup.add(leftKeyboard, rightKeyboard);

      leftKeyboard.switchGeometry = switchData.left;
      rightKeyboard.switchGeometry = switchData.right;

      loader.load(leftKeyboardData.fileName, (gltf) => leftKeyboard.caseLoader({ gltf, caseMat, faceMat }));
      loader.load(rightKeyboardData.fileName, (gltf) => rightKeyboard.caseLoader({ gltf, caseMat, faceMat }));

      loader.load(leftKeyboardData.plateName, (gltfPlate) => leftKeyboard.plateLoader({ gltfPlate, baseMat, pcbMat }));
      loader.load(rightKeyboardData.plateName, (gltfPlate) => rightKeyboard.plateLoader({ gltfPlate, baseMat, pcbMat }));

      loader.load("models/keycaps.glb", function (gltf) {
        const filesToAdd: THREE.Mesh[] = [];
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh && child.isMesh) {
            if (keyboard === "sinc") child.position.set(0.2382, 0, 0.1184);
            if (keyboard === "kbo") child.position.set(0, 0, 0.1184);
            child.material = keyMat;
            filesToAdd.push(child);
          }
        });
        for (let i = 0; i < filesToAdd.length; i++) {
          const mesh = filesToAdd[i];
          if (mesh.name === "left") leftKeyboard.addKeys({ mesh });
          if (mesh.name === "right") rightKeyboard.addKeys({ mesh });
        }
      });

      loader.load("models/switch.glb", function (gltf) {
        gltf.scene.visible = false;
        scene.add(gltf.scene);

        leftKeyboard.createKeys({ scene, keyMat, baseMat });
        rightKeyboard.createKeys({ scene, keyMat, baseMat });

        const _usbMesh = scene.getObjectByName("usb");
        if (_usbMesh) {
          leftKeyboard.createUSB(_usbMesh, usbMat, usbGeometry.left);
          rightKeyboard.createUSB(_usbMesh, usbMat, usbGeometry.right);
        }
      });

      // Event Listeners

      const leftSideInput = document.getElementById("left-options");
      leftSideInput?.addEventListener("change", () => onKeyboardChange("left"));

      const rightSideInput = document.getElementById("right-options");
      rightSideInput?.addEventListener("change", () => onKeyboardChange("right"));

      const rightShiftInput = document.getElementById("right-shift");
      rightShiftInput?.addEventListener("change", () => onKeyboardChange("right"));

      const bottomCaseInput = document.getElementById("bottom-case");
      bottomCaseInput?.addEventListener("change", function () {
        leftKeyboard.changeBottomCase();
        rightKeyboard.changeBottomCase();
        changed = true;
      });

      // Change Keyboard Options

      async function onKeyboardChange(side: KBSide) {
        let keyboardSide, keyboardInfo;
        if (side === "left") {
          keyboardSide = leftKeyboard;
          keyboardInfo = keyboardData.leftSide();
        }
        if (side === "right") {
          keyboardSide = rightKeyboard;
          keyboardInfo = keyboardData.rightSide();
        }

        if (keyboardSide instanceof Keeb && keyboardInfo) {
          if (keyboardInfo.selectedOptType === "macro") {
            const fileName = keyboardInfo.fileName;
            const gltf = await reloader.loadAsync(fileName);
            const plateName = keyboardInfo.plateName;
            const gltfPlate = await reloader.loadAsync(plateName);
            keyboardSide.selectedOptValue = keyboardInfo.selectedOptValue;
            keyboardSide.plateLoader({ gltfPlate, baseMat, pcbMat });
            keyboardSide.caseLoader({ gltf, caseMat, faceMat });
            keyboardSide.createKeys({ scene, keyMat, baseMat });
            setKeyboardToCenter();
          } else {
            keyboardSide.blocker = keyboardInfo.selectedOptValue;
            keyboardSide.createKeys({ scene, keyMat, baseMat });
            changed = true;
          }
        }
      }
    }

    // Resize Handler

    const debounceResize = debounce(onWindowResize, 250);
    window.addEventListener("resize", debounceResize);
  }
}

function setKeyboardToCenter() {
  centerBox.setFromObject(mainGroup);
  centerBox.getCenter(centerVector);
  mainGroup.position.x -= centerVector.x;
  changed = true;
}

function setCameraFOV() {
  // https://discourse.threejs.org/t/keeping-an-object-scaled-based-on-the-bounds-of-the-canvas-really-battling-to-explain-this-one/17574/10
  const aspectRatio = 0.5;
  const cameraHeight = Math.tan(MathUtils.degToRad(fov / 2));
  const ratio = camera.aspect / aspectRatio;
  const newCameraHeight = cameraHeight / ratio;
  camera.fov = MathUtils.radToDeg(Math.atan(newCameraHeight)) * 2;
  camera.updateProjectionMatrix();
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
  controls.update();
  renderer.render(scene, camera);
}
