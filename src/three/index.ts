import * as THREE from "three";
import { debounce } from "lodash";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { GainMapLoader } from "@monogrid/gainmap-js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import { MathUtils } from "three";
import { LeftKeeb, RightKeeb } from "./keyboard";
import { keyLight, fillLight, shadowPlane } from "./lights";

let canvas: HTMLElement | null, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, controls: OrbitControls;
const scene = new THREE.Scene();
const mainGroup = new THREE.Group();
const centerVector = new THREE.Vector3(),
  centerBox = new THREE.Box3();

let leftKeyboard: LeftKeeb, rightKeyboard: RightKeeb;
let changed = false;

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
  const reloader = new GLTFLoader(manager2).setMeshoptDecoder(MeshoptDecoder);

  // Materials

  const envMapIntensity = 2;
  const caseMat = new THREE.MeshStandardMaterial({
    roughness: 0.8,
    envMapIntensity: envMapIntensity,
  });
  const faceMat = new THREE.MeshStandardMaterial({
    roughness: 0.4,
    envMapIntensity: envMapIntensity,
  });
  const keyMat = new THREE.MeshStandardMaterial({
    color: 0x171718,
    roughness: 0.5,
    envMapIntensity: envMapIntensity,
  });
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x171718,
    roughness: 0.3,
    envMapIntensity: envMapIntensity,
  });
  const pcbMat = new THREE.MeshStandardMaterial({
    color: 0x046307,
    roughness: 0.8,
    envMapIntensity: envMapIntensity,
  });
  const usbMat = new THREE.MeshStandardMaterial({
    metalness: 1,
    roughness: 0.2,
    envMapIntensity: envMapIntensity,
  });
  caseMat.color = faceMat.color = new THREE.Color(0x171718);

  // GUI

  const gui = new GUI({ autoPlace: false }),
    params = {
      case: caseMat.color.getHex(),
      keycap: keyMat.color.getHex(),
    };
  gui.domElement.id = "gui";
  gui.addColor(params, "case").onChange(function (val) {
    caseMat.color.setHex(val);
    changed = true;
  });
  gui.addColor(params, "keycap").onChange(function (val) {
    keyMat.color.setHex(val);
    changed = true;
  });
  gui.open();

  // Change Keyboard Options

  const onKeyboardChange = (e: Event, side: string) => {
    const { target } = e;
    if (target instanceof HTMLInputElement) {
      const {
        value,
        dataset: { type },
      } = target;
      if (type === "macro") {
        let fileName = "";
        if (side === "left") fileName = leftKeyboard.getFileName(value);
        if (side === "right") fileName = rightKeyboard.getFileName(value);

        reloader.loadAsync(fileName).then((gltf: GLTF) => {
          if (side === "left") {
            leftKeyboard.selectedOptValue = value;
            leftKeyboard.caseLoader({ gltf, caseMat, faceMat, baseMat });
            leftKeyboard.createKeys({ scene, keyMat, baseMat });
          }
          if (side === "right") {
            rightKeyboard.selectedOptValue = value;
            rightKeyboard.caseLoader({ gltf, caseMat, faceMat, baseMat });
            rightKeyboard.createKeys({ scene, keyMat, baseMat });
          }

          setCameraCenter();
        });
      } else {
        if (side === "left") {
          leftKeyboard.selectedOptValue = value;
          leftKeyboard.createKeys({ scene, keyMat, baseMat });
        }
        if (side === "right") {
          rightKeyboard.selectedOptValue = value;
          rightKeyboard.createKeys({ scene, keyMat, baseMat });
        }
        changed = true;
      }
    }
  };

  // Event Listeners

  const leftSideInput = document.getElementById("left-options");
  leftSideInput?.addEventListener("change", (e) => onKeyboardChange(e, "left"));

  const rightSideInput = document.getElementById("right-options");
  rightSideInput?.addEventListener("change", (e) => onKeyboardChange(e, "right"));

  const rightShiftInput = document.getElementById("right-shift");
  rightShiftInput?.addEventListener("change", function (e) {
    if (e.target instanceof HTMLInputElement) {
      rightKeyboard.rightShiftValue = e.target.value;
      rightKeyboard.updateInstancedMesh();
      changed = true;
    }
  });

  const bottomCaseInput = document.getElementById("bottom-case");
  bottomCaseInput?.addEventListener("change", function (e) {
    if (e.target instanceof HTMLInputElement) {
      leftKeyboard.bottomCase = e.target.value;
      rightKeyboard.bottomCase = e.target.value;
      changed = true;
    }
  });

  if (canvas) {
    // Create Keyboard

    const keyboardName = canvas.dataset.keyboard || "";
    const keyboardType = canvas.dataset.type || "";

    leftKeyboard = new LeftKeeb({ keyboardName, keyboardType });
    rightKeyboard = new RightKeeb({ keyboardName, keyboardType });

    mainGroup.add(leftKeyboard.keyboard, rightKeyboard.keyboard);

    // Renderer

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

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    // Camera

    camera = new THREE.PerspectiveCamera(1, canvas.offsetWidth / canvas.offsetHeight, 1, 1000);
    camera.position.set(110, 90, -70);
    setCameraFOV();

    // Controls

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    // controls.autoRotate = true;
    controls.minDistance = 50;
    controls.maxDistance = 200;
    controls.addEventListener("change", () => (changed = true));
    canvas.appendChild(gui.domElement);

    // On Initial Load

    manager.onLoad = () => {
      scene.add(mainGroup);
      const loadScreen = document.getElementById("three-loading");
      loadScreen?.classList.add("opacity-0");
      loadScreen?.addEventListener("transitionend", (e) => {
        if (e.target instanceof HTMLElement) e.target.remove();
      });
      pmremGenerator.dispose();
      setCameraCenter();
      changed = true;
    };

    // Texture Loader

    const texloader = new THREE.TextureLoader(manager);

    const caseNormal = texloader.load("models/3dp_normal.webp");
    caseNormal.repeat.set(0, 3);
    caseMat.normalMap = caseNormal;

    const caseRoughness = texloader.load("models/3dp_roughness.webp");
    caseRoughness.repeat.set(0, 3);
    caseMat.roughnessMap = caseRoughness;

    const caseAO = texloader.load("models/3dp_ao.webp");
    caseAO.repeat.set(0, 3);
    caseMat.aoMap = caseAO;

    const caseFaceNormal = texloader.load("models/3dp_face.webp");
    caseFaceNormal.repeat.set(25, 25);
    faceMat.normalMap = caseFaceNormal;

    const keyNormal = texloader.load("models/key_normal.webp");
    keyNormal.repeat.set(2, 2);
    keyMat.normalMap = keyNormal;

    const keyRoughness = texloader.load("models/key_roughness.webp");
    keyRoughness.repeat.set(2, 2);
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

    scene.add(keyLight);
    scene.add(fillLight);
    scene.add(shadowPlane);

    // Load Case, Switch, Keycap Files

    loader.load(leftKeyboard.getFileName(), (gltf) => leftKeyboard.caseLoader({ gltf, caseMat, faceMat, baseMat }));
    loader.load(rightKeyboard.getFileName(), (gltf) => rightKeyboard.caseLoader({ gltf, caseMat, faceMat, baseMat }));

    loader.load("models/switch.glb", function (gltf) {
      gltf.scene.visible = false;
      scene.add(gltf.scene);

      leftKeyboard.createKeys({ scene, keyMat, baseMat });
      rightKeyboard.createKeys({ scene, keyMat, baseMat });
    });

    // Resize Handler

    const debounceResize = debounce(onWindowResize, 250);
    window.addEventListener("resize", debounceResize);
  }
}

function setCameraCenter() {
  centerBox.setFromObject(mainGroup);
  centerBox.getCenter(centerVector);
  camera.lookAt(centerVector);
  camera.updateProjectionMatrix();
  controls.target.set(centerVector.x, centerVector.y, centerVector.z);
  changed = true;
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
  const left = leftKeyboard.selectedSwitchGeometry;
  const right = rightKeyboard.selectedSwitchGeometry;

  var maxLength = Math.max(left.mx.length, right.mx.length);

  if (rightKeyboard.rightShiftData) right.mx[42] = rightKeyboard.rightShiftData;

  let i = 0;
  for (let x = 0; x < maxLength; x++) {
    if (x < left.mx.length) leftKeyboard.render = i;
    if (x < right.mx.length) rightKeyboard.render = i;
    i++;
  }

  controls.update();
  renderer.render(scene, camera);
}
