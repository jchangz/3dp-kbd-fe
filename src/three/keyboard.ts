import * as THREE from "three";
import { MathUtils } from "three";
import type { GLTF } from "three/examples/jsm/Addons.js";

type KBSwitchPosition = {
  mx: { x: number; y: number; z: number }[];
  rows: {
    [key: string]: { length: number; matrix: number[] };
  };
};

type KBUSBGeometry = { x: number; y: number; z: number }[];

const KBNAMEOPTIONS = ["quefrency", "sinc", "kbo"] as const;
type KBNameOptions = (typeof KBNAMEOPTIONS)[number];
export function isValidKeyboardName(option: string): option is KBNameOptions {
  return KBNAMEOPTIONS.includes(option as KBNameOptions);
}

const KBTYPEOPTIONS = ["1", "2", "3", "g", "gx", "m"] as const;
type KBTypeOptions = (typeof KBTYPEOPTIONS)[number];
export function isValidKeyboardType(option: string): option is KBTypeOptions {
  return KBTYPEOPTIONS.includes(option as KBTypeOptions);
}

type KBVariantType = "macro" | "blocker";
const KBVARIANTOPTIONS = ["macro", "no-macro", "60", "65", "65-b", "blocker", "blocker-1", "blocker-2", "no-blocker", "base"] as const;
type KBVariantOptions = (typeof KBVARIANTOPTIONS)[number];
export function isValidKeyboardVariant(option: string): option is KBVariantOptions {
  return KBVARIANTOPTIONS.includes(option as KBVariantOptions);
}

const KBBOTTOMOPTIONS = ["standard", "vented"] as const;
type KBBottomOption = (typeof KBBOTTOMOPTIONS)[number];
function isValidKeyboardBottom(option: string): option is KBBottomOption {
  return KBBOTTOMOPTIONS.includes(option as KBBottomOption);
}

const KBORIGHTSHIFTOPTIONS = ["175", "275"] as const;
type KBORightShiftOption = (typeof KBORIGHTSHIFTOPTIONS)[number];
function isValidRightShift(option: string): option is KBORightShiftOption {
  return KBORIGHTSHIFTOPTIONS.includes(option as KBORightShiftOption);
}

const KBOBLOCKEROPTIONS = ["no-blocker", "blocker-1", "blocker-2"] as const;
type KBOBlockerType = (typeof KBOBLOCKEROPTIONS)[number];

type KBOData = {
  [key in KBOBlockerType]?: KBSwitchPosition;
};

type KBVariantSwitchGeometry = {
  [key in KBVariantOptions]?: KBSwitchPosition;
};

export class Keeb extends THREE.Group {
  #keebGroup = new THREE.Group();
  #caseGroup = new THREE.Group();
  #plateGroup = new THREE.Group();
  #keysGroup = new THREE.Group();

  #selectedOptType: KBVariantType;
  selectedOptValue: KBVariantOptions;
  #selectedOptBottom: KBBottomOption = "standard";

  #switchInstancedMesh?: THREE.InstancedMesh;
  #switch3DMap = new THREE.Object3D();

  switchGeometry: KBVariantSwitchGeometry = {};

  constructor(selectedOptType: KBVariantType, selectedOptValue: KBVariantOptions) {
    super();

    this.#selectedOptType = selectedOptType;
    this.selectedOptValue = selectedOptValue;

    this.#keebGroup.add(this.#caseGroup, this.#plateGroup, this.#keysGroup);
    this.add(this.#keebGroup);

    this.changeBottomCase();
  }

  get selectedSwitchGeometry() {
    return this.switchGeometry[this.selectedOptValue];
  }

  set blocker(value: KBVariantOptions) {
    const currentBlocker = this.#caseGroup.getObjectByName(this.selectedOptValue);
    const newBlocker = this.#caseGroup.getObjectByName(value);
    if (this.selectedOptValue !== "no-blocker" && currentBlocker) currentBlocker.visible = false;
    if (value !== "no-blocker" && newBlocker) newBlocker.visible = true;

    this.selectedOptValue = value;
  }

  changeBottomCase() {
    const bottomTypeInput = document.querySelector("#bottom-case option:checked");
    if (bottomTypeInput && bottomTypeInput instanceof HTMLOptionElement) {
      const { value } = bottomTypeInput;
      if (isValidKeyboardBottom(value) && value !== this.#selectedOptBottom) {
        const caseToShow = this.#caseGroup.getObjectByName(value);
        const caseToHide = this.#caseGroup.getObjectByName(this.#selectedOptBottom);
        if (caseToHide && caseToShow) {
          caseToHide.visible = false;
          caseToShow.visible = true;
        }
        this.#selectedOptBottom = value;
      }
    }
  }

  updateInstancedMesh() {
    if (this.#switchInstancedMesh) this.#switchInstancedMesh.instanceMatrix.needsUpdate = true;
  }

  caseLoader({ gltf, caseMat, faceMat }: { gltf: GLTF; caseMat: THREE.MeshStandardMaterial; faceMat: THREE.MeshStandardMaterial }) {
    gltf.scene.traverse((child) => {
      child.castShadow = true;
      if (child instanceof THREE.Mesh && child.isMesh) {
        if (child.name.includes("_2")) child.material = faceMat;
        else child.material = caseMat;
      }
      if (child instanceof THREE.Group && child.name !== "Scene") {
        child.visible = false;
        if (child.name === "top" || child.name === this.#selectedOptBottom) child.visible = true;

        // On initial load, check if we should show the blocker
        if (this.#selectedOptType === "blocker" || this.selectedOptValue === "65-b") {
          if (child.name === this.selectedOptValue) child.visible = true;
        }
      }
    });

    this.#caseGroup.clear();
    this.#caseGroup.add(gltf.scene);
  }

  plateLoader({ gltfPlate, baseMat, pcbMat }: { gltfPlate: GLTF; baseMat: THREE.MeshStandardMaterial; pcbMat: THREE.MeshStandardMaterial }) {
    gltfPlate.scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.isMesh) {
        if (child.name === "plate") child.material = baseMat;
        if (child.name === "pcb") child.material = pcbMat;
      }
    });

    this.#plateGroup.clear();
    this.#plateGroup.add(gltfPlate.scene);
  }

  createUSB(_usbMesh: THREE.Object3D, usbMat: THREE.MeshStandardMaterial, usbGeometry: KBUSBGeometry) {
    const meshLength = 2;
    const usb3DMap = new THREE.Object3D();

    if (_usbMesh instanceof THREE.Mesh) {
      const usbInstancedMesh = new THREE.InstancedMesh(_usbMesh.geometry.clone(), usbMat, meshLength);
      usbInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

      for (let i = 0; i < meshLength; i++) {
        usb3DMap.position.set(usbGeometry[i].x, usbGeometry[i].y, usbGeometry[i].z);
        usb3DMap.updateMatrix();
        usbInstancedMesh.setMatrixAt(i, usb3DMap.matrix);
      }

      this.#keebGroup.add(usbInstancedMesh);
    }
  }

  createKeys({ scene, keyMat, baseMat }: { scene: THREE.Scene; keyMat: THREE.MeshStandardMaterial; baseMat: THREE.MeshStandardMaterial }) {
    const _switchMesh = scene.getObjectByName("switch");
    let switchData = this.selectedSwitchGeometry;

    const rightShiftInput = document.querySelector("#right-shift option:checked");
    if (rightShiftInput && rightShiftInput instanceof HTMLOptionElement) {
      const { value } = rightShiftInput;
      if (isValidRightShift(value) && switchData && switchData.mx.length > 41) {
        const shiftName = `r4-${value}`;
        const shiftData = {
          "175": { x: 1.5198, y: -0.1082, z: 0.3101 },
          "275": { x: 1.6151, y: -0.1082, z: 0.3101 },
        };
        const shiftMatrixPosition = new Array(42).fill(0);
        shiftMatrixPosition.push(1);

        const dataCopy = JSON.parse(JSON.stringify(switchData));
        dataCopy.rows = { ...dataCopy.rows, ...{ [shiftName]: { length: 1, matrix: shiftMatrixPosition } } };
        dataCopy.mx[42] = shiftData[value];
        switchData = dataCopy;

        var shiftBlocker = this.#caseGroup.getObjectByName("175");
        if (shiftBlocker) {
          if (value === "175") shiftBlocker.visible = true;
          else shiftBlocker.visible = false;
        }
      }
    }

    if (switchData && _switchMesh) {
      const name = "switches";
      // Remove the previous switches if it exists
      const filesToDispose: THREE.Object3D[] = [];
      if (this.#keebGroup.children.length) {
        this.#keebGroup.traverse((child) => {
          if (child instanceof THREE.InstancedMesh && child.name === name) {
            filesToDispose.push(child);
            child.geometry.dispose();
          }
        });
        this.#keysGroup.traverse((instMesh) => {
          if (instMesh instanceof THREE.InstancedMesh) instMesh.geometry.dispose();
        });
        this.#keysGroup.clear();

        if (filesToDispose.length) {
          for (var i = 0, n = filesToDispose.length; i < n; i++) this.#keebGroup.remove(filesToDispose[i]);
        }
      }

      const { rows, mx } = switchData;

      Object.keys(rows).forEach((row) => {
        const _keycapMesh = scene.getObjectByName(row);
        if (_keycapMesh && _keycapMesh instanceof THREE.Mesh) {
          const keycapMesh = new THREE.InstancedMesh(_keycapMesh.geometry.clone(), keyMat, rows[row].length);
          keycapMesh.name = row;
          keycapMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          this.#keysGroup.add(keycapMesh);
        }
      });

      if (_switchMesh instanceof THREE.Mesh) {
        this.#switchInstancedMesh = new THREE.InstancedMesh(_switchMesh.geometry.clone(), baseMat, mx.length);
        this.#switchInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.#switchInstancedMesh.name = name;

        for (let i = 0; i < switchData.mx.length; i++) {
          const { mx, rows } = switchData;
          this.#switch3DMap.position.set(mx[i].x, mx[i].y, mx[i].z);
          this.#switch3DMap.updateMatrix();

          this.#keysGroup.children.forEach((mesh) => {
            if (mesh instanceof THREE.InstancedMesh && rows[mesh.name].matrix[i]) {
              mesh.setMatrixAt(rows[mesh.name].matrix[i] - 1, this.#switch3DMap.matrix);
            }
          });
          this.#switchInstancedMesh.setMatrixAt(i, this.#switch3DMap.matrix);
        }

        this.#keebGroup.add(this.#switchInstancedMesh);
      }
    }
  }
}
