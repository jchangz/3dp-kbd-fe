import * as THREE from "three";
import { debounce } from "lodash";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { GainMapLoader } from "@monogrid/gainmap-js";
import { MathUtils } from "three";
import { Keeb, isValidKeyboardName, isValidKeyboardType, isValidKeyboardVariant } from "./keyboard";
import { spotLight, pointLightL, pointLightR } from "./lights";
import { caseMat, faceMat, keyMat, baseMat, pcbMat, usbMat, floorMat, textureLoader } from "./materials";
import { getKeyboardData, getSwitchData, getUSBData } from "./utils";
import { gsap } from "gsap";

type KBSide = "left" | "right";

let canvas: HTMLElement | null, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, controls: OrbitControls;
const scene = new THREE.Scene();
const mainGroup = new THREE.Group();
const clock = new THREE.Clock();
const fov = 50;

const centerVector = new THREE.Vector3(),
  centerBox = new THREE.Box3();

const switchGLB = "models/switch.glb",
  keycapGLB = "models/keycaps.glb",
  mountingGLB = "models/mounting.glb";

let keyboard_L: Keeb, keyboard_R: Keeb;

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
  const reloader = new GLTFLoader(manager2).setDRACOLoader(dracoLoader).setMeshoptDecoder(MeshoptDecoder);

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

    camera = new THREE.PerspectiveCamera(fov, canvas.offsetWidth / canvas.offsetHeight, 1, 1000);
    camera.position.set(0, 200, 20);
    setCameraFOV();

    // Controls

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    // controls.autoRotate = true;
    controls.minDistance = 5;
    // controls.enableZoom = false;
    controls.maxDistance = 20;
    controls.addEventListener("change", () => (changed = true));
    controls.enabled = false;

    // On Initial Load

    manager.onLoad = () => {
      scene.add(mainGroup);

      setKeyboardToCenter();
      keyboard_L.setPivotPoint();
      keyboard_R.setPivotPoint();

      const loadScreen = document.getElementById("three-loading");
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

      let t1 = gsap.timeline();
      t1.to(loadScreen, {
        opacity: 0,
      })
        .to(camera.position, {
          duration: 1,
          x: 0,
          y: 6,
          z: 12,
          ease: "power1.inOut",
          onUpdate: function () {
            controls.update();
          },
          onComplete: function () {
            controls.enabled = true;
          },
        })
        .to(
          configuratorControls,
          {
            opacity: 1,
          },
          "<",
        );

      pmremGenerator.dispose();
      changed = true;
    };

    // Texture Loader

    textureLoader(manager);

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

    scene.background = new THREE.Color(0x121212);
    scene.fog = new THREE.Fog(0x121212, 10, 40);

    scene.add(pointLightL);
    scene.add(pointLightR);
    scene.add(spotLight);

    const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), floorMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // Create Keyboard
    // Load Case, Switch, Keycap Files
    const {
      dataset: { keyboard, type },
    } = canvas;

    if (keyboard && isValidKeyboardName(keyboard) && type && isValidKeyboardType(type)) {
      const { left: switchData_L, right: switchData_R } = getSwitchData({ keyboard });
      const { left: usbData_L, right: usbData_R } = getUSBData({ keyboard });

      const keyboardData = getKeyboardData({ keyboard, type });
      const { fileName: fileName_L, plateName: plateName_L, selectedOptType: optType_L, selectedOptValue: optValue_L, selectedMountingPosition: mountPos_L, selectedMountingAngle: mountAngle_L } = keyboardData.leftSide();
      const { fileName: fileName_R, plateName: plateName_R, selectedOptType: optType_R, selectedOptValue: optValue_R, selectedMountingPosition: mountPos_R, selectedMountingAngle: mountAngle_R } = keyboardData.rightSide();

      keyboard_L = new Keeb(optType_L, optValue_L, 1);
      keyboard_R = new Keeb(optType_R, optValue_R, -1);
      mainGroup.add(keyboard_L, keyboard_R);

      keyboard_L.switchGeometry = switchData_L;
      keyboard_R.switchGeometry = switchData_R;

      if (mountPos_L && mountPos_R) {
        // Set keyboard mounting position coordinates
        keyboard_L.mountingPosition = mountPos_L;
        keyboard_R.mountingPosition = mountPos_R;
      }

      const mountingTranslateZ = type === "2" ? 0.1349 : 0;

      loader.load(mountingGLB, function (gltfMounting) {
        gltfMounting.scene.visible = false;
        scene.add(gltfMounting.scene);

        if (mountAngle_L && mountAngle_R) {
          keyboard_L.setQuaternion(mountAngle_L);
          keyboard_R.setQuaternion(mountAngle_R);
          keyboard_L.createMounting(scene, caseMat, mountingTranslateZ);
          keyboard_R.createMounting(scene, caseMat, mountingTranslateZ);
        }
      });

      loader.load(fileName_L, (gltf) => keyboard_L.caseLoader({ gltf, caseMat, faceMat }));
      loader.load(fileName_R, (gltf) => keyboard_R.caseLoader({ gltf, caseMat, faceMat }));

      loader.load(plateName_L, (gltfPlate) => keyboard_L.plateLoader({ gltfPlate, baseMat, pcbMat }));
      loader.load(plateName_R, (gltfPlate) => keyboard_R.plateLoader({ gltfPlate, baseMat, pcbMat }));

      loader.load(keycapGLB, function (gltf) {
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
          if (mesh.name === "left") keyboard_L.addKeys({ mesh });
          if (mesh.name === "right") keyboard_R.addKeys({ mesh });
        }
      });

      loader.load(switchGLB, function (gltf) {
        gltf.scene.visible = false;
        scene.add(gltf.scene);

        keyboard_L.createKeys({ scene, keyMat, baseMat });
        keyboard_R.createKeys({ scene, keyMat, baseMat });

        const _usbMesh = scene.getObjectByName("usb");
        if (_usbMesh) {
          keyboard_L.createUSB(_usbMesh, usbMat, usbData_L);
          keyboard_R.createUSB(_usbMesh, usbMat, usbData_R);
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
        keyboard_L.changeBottomCase();
        keyboard_R.changeBottomCase();
        changed = true;
      });

      const mountingInput = document.getElementById("mounting-option");
      mountingInput?.addEventListener("change", () => {
        const { selectedMountingAngle: mountAngle_L } = keyboardData.leftSide();
        const { selectedMountingAngle: mountAngle_R } = keyboardData.rightSide();
        keyboard_L.setQuaternion(mountAngle_L);
        keyboard_R.setQuaternion(mountAngle_R);
        keyboard_L.createMounting(scene, caseMat, mountingTranslateZ);
        keyboard_R.createMounting(scene, caseMat, mountingTranslateZ);
      });

      async function onKeyboardChange(side: KBSide) {
        let keyboardSide, keyboardInfo;
        if (side === "left") {
          keyboardSide = keyboard_L;
          keyboardInfo = keyboardData.leftSide();
        }
        if (side === "right") {
          keyboardSide = keyboard_R;
          keyboardInfo = keyboardData.rightSide();
        }

        if (keyboardSide instanceof Keeb && keyboardInfo) {
          const { fileName, plateName, selectedOptType, selectedOptValue, selectedMountingPosition, selectedMountingAngle } = keyboardInfo;
          if (selectedOptType === "macro") {
            // Reset position for recalculating object bounds
            mainGroup.position.x = 0;

            const gltf = await reloader.loadAsync(fileName);
            const gltfPlate = await reloader.loadAsync(plateName);
            keyboardSide.selectedOptValue = selectedOptValue;
            keyboardSide.plateLoader({ gltfPlate, baseMat, pcbMat });
            keyboardSide.caseLoader({ gltf, caseMat, faceMat });
            keyboardSide.createKeys({ scene, keyMat, baseMat });
            setKeyboardToCenter();

            keyboardSide.setPivotPoint();
            if (selectedMountingPosition) keyboardSide.mountingPosition = selectedMountingPosition;
            if (selectedMountingAngle) {
              keyboardSide.setQuaternion(selectedMountingAngle);
              keyboardSide.createMounting(scene, caseMat, mountingTranslateZ);
            }
          } else {
            keyboardSide.blocker = selectedOptValue;
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

  const delta = clock.getDelta();
  const step = 0.5 * delta;
  const leftRotationComplete = keyboard_L.quaternion.equals(keyboard_L.localQuaternion);
  const rightRotationComplete = keyboard_R.quaternion.equals(keyboard_R.localQuaternion);
  keyboard_L.quaternion.rotateTowards(keyboard_L.localQuaternion, step);
  keyboard_R.quaternion.rotateTowards(keyboard_R.localQuaternion, step);

  if (!leftRotationComplete || !rightRotationComplete) {
    changed = true;
  }

  if (controls.update() || changed) {
    render();
    changed = false;
  }
}

function render() {
  controls.update();
  renderer.render(scene, camera);
}
