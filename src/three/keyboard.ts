import * as THREE from "three";
import { MathUtils } from "three";
import type { GLTF } from "three/examples/jsm/Addons.js";
import { three, options } from "../assets/three.json";
import { geometry } from "../assets/geometry.json";
import { usb } from "../assets/geometry/usb.json";

type KBSwitchPosition = {
  mx: { x: number; y: number; z: number }[];
  rows: {
    [key: string]: { length: number; matrix: number[] };
  };
};

type KBPlateType = "macro" | "no-macro" | "base";
type KBPlateGeometry = {
  [key in KBPlateType]?: number[][];
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

export class Keeb {
  #pivotGroup = new THREE.Group();
  #keebGroup = new THREE.Group();
  #caseGroup = new THREE.Group();
  #keysGroup = new THREE.Group();

  #selectedOptType: KBVariantType;
  #selectedOptValue: KBVariantOptions;
  #selectedOptBottom: KBBottomOption = "standard";

  #switchInstancedMesh?: THREE.InstancedMesh;
  #switch3DMap = new THREE.Object3D();

  #usbInstancedMesh?: THREE.InstancedMesh;
  #usb3DMap = new THREE.Object3D();

  #plateGeometry: KBPlateGeometry = {};
  #switchGeometry: KBVariantSwitchGeometry = {};
  #usbGeometry: KBUSBGeometry = [];

  constructor({ selectedOptType, selectedOptValue }: { selectedOptType: KBVariantType; selectedOptValue: KBVariantOptions }) {
    this.#selectedOptType = selectedOptType;
    this.#selectedOptValue = selectedOptValue;

    const bottomTypeInput = document.querySelector("#bottom-case option:checked");
    if (bottomTypeInput instanceof HTMLOptionElement) {
      const { value } = bottomTypeInput;
      if (value === "standard" || value === "vented") this.#selectedOptBottom = value;
    }

    this.#keebGroup.add(this.#caseGroup, this.#keysGroup);
    this.#keebGroup.rotation.y = Math.PI / 2;
    this.#pivotGroup.add(this.#keebGroup);
  }

  get keyboard() {
    return this.#pivotGroup;
  }

  get selectedSwitchGeometry() {
    return this.#switchGeometry[this.#selectedOptValue];
  }

  get selectedOptType() {
    return this.#selectedOptType;
  }

  get selectedOptValue() {
    return this.#selectedOptValue;
  }

  set plateGeometry(data: KBPlateGeometry) {
    this.#plateGeometry = data;
  }

  set switchGeometry(data: KBVariantSwitchGeometry) {
    this.#switchGeometry = data;
  }

  set usbGeometry(data: KBUSBGeometry) {
    this.#usbGeometry = data;
  }

  set selectedOptValue(value: KBVariantOptions) {
    this.#selectedOptValue = value;
  }

  setKBOGeometry(data: KBSwitchPosition, options: KBOData) {
    // Transform kbo specific layouts
    const newData: KBOData = {};
    KBOBLOCKEROPTIONS.forEach((opt) => {
      const dataCopy = JSON.parse(JSON.stringify(data));
      const extraData = options[opt];
      if (extraData) {
        dataCopy.mx = [...dataCopy.mx, ...extraData.mx];
        dataCopy.rows = { ...dataCopy.rows, ...extraData.rows };
      }
      newData[opt] = dataCopy;
    });

    this.switchGeometry = newData;
  }

  set bottomCase(type: string) {
    if (isValidKeyboardBottom(type)) {
      this.#selectedOptBottom = type;
      const toHide = type === "standard" ? "vented" : "standard";
      const caseToShow = this.#caseGroup.getObjectByName(type);
      const caseToHide = this.#caseGroup.getObjectByName(toHide);
      if (caseToHide && caseToShow) {
        caseToHide.visible = false;
        caseToShow.visible = true;
      }
    }
  }

  set render(i: number) {
    if (this.#switchInstancedMesh && this.selectedSwitchGeometry && this.#usbInstancedMesh) {
      const { mx, rows } = this.selectedSwitchGeometry;
      this.#switch3DMap.position.set(mx[i].x, mx[i].y, mx[i].z);
      this.#switch3DMap.updateMatrix();

      if (i < 2) {
        this.#usb3DMap.position.set(this.#usbGeometry[i].x, this.#usbGeometry[i].y, this.#usbGeometry[i].z);
        this.#usb3DMap.updateMatrix();
        this.#usbInstancedMesh.setMatrixAt(i, this.#usb3DMap.matrix);
      }

      this.#keysGroup.children.forEach((mesh) => {
        if (mesh instanceof THREE.InstancedMesh && rows[mesh.name].matrix[i]) {
          mesh.setMatrixAt(rows[mesh.name].matrix[i] - 1, this.#switch3DMap.matrix);
        }
      });
      this.#switchInstancedMesh.setMatrixAt(i, this.#switch3DMap.matrix);
    }
  }

  updateInstancedMesh() {
    if (this.#switchInstancedMesh) this.#switchInstancedMesh.instanceMatrix.needsUpdate = true;
  }

  caseLoader({ gltf, caseMat, faceMat, baseMat }: { gltf: GLTF; caseMat: THREE.MeshStandardMaterial; faceMat: THREE.MeshStandardMaterial; baseMat: THREE.MeshStandardMaterial }) {
    const filesToAdd: THREE.Group[] = [];

    gltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.isMesh) {
        child.castShadow = true;
        if (child.name.includes("_2")) child.material = faceMat;
        else child.material = caseMat;
      }
      if (child instanceof THREE.Group && child.name !== "Scene") {
        child.visible = false;
        if (child.name === "top" || child.name === this.#selectedOptBottom) child.visible = true;
        filesToAdd.push(child);
      }
    });

    this.#createPlates({ baseMat });

    this.#caseGroup.clear();
    for (let i = 0; i < filesToAdd.length; i++) this.#caseGroup.add(filesToAdd[i]);
  }

  #createPlates({ baseMat }: { baseMat: THREE.MeshStandardMaterial }) {
    let selectedPlateOption: KBPlateType = "macro";

    if (this.#selectedOptType !== "macro") {
      // Where there is only a blocker option (eg. sinc right, kbo)
      selectedPlateOption = "base";
    } else {
      // Quefrency right has macro and blocker options
      // We call 60 as no-macro and 65 as macro
      switch (this.#selectedOptValue) {
        case "no-macro":
        case "60":
          selectedPlateOption = "no-macro";
          break;
      }
    }
    const plateData = this.#plateGeometry[selectedPlateOption];

    if (plateData) {
      const name = "plate";
      const coordinatePts = plateData.map((pt) => new THREE.Vector2(pt[0], pt[1]));
      const shape = new THREE.Shape(coordinatePts);
      const plateGeometry = new THREE.ExtrudeGeometry(shape, {
        depth: 0.016,
        bevelEnabled: false,
      });
      const mesh = new THREE.Mesh(plateGeometry, baseMat);
      mesh.scale.set(1, 1, -1);
      mesh.rotation.x = -Math.PI / 2 + MathUtils.degToRad(6);
      mesh.position.y = 0.1762;
      mesh.name = name;

      // Remove the previous plate mesh if it exists
      const filesToDispose: THREE.Object3D[] = [];
      if (this.#keebGroup.children.length) {
        this.#keebGroup.traverse((child) => {
          if (child instanceof THREE.Mesh && child.name === name) {
            filesToDispose.push(child);
            child.geometry.dispose();
          }
        });
        if (filesToDispose.length) {
          for (var i = 0, n = filesToDispose.length; i < n; i++) this.#keebGroup.remove(filesToDispose[i]);
        }
      }

      this.#keebGroup.add(mesh);
    }
  }

  createUSB({ scene, usbMat }: { scene: THREE.Scene; usbMat: THREE.MeshStandardMaterial }) {
    const _usbMesh = scene.getObjectByName("usb");

    if (_usbMesh instanceof THREE.Mesh) {
      this.#usbInstancedMesh = new THREE.InstancedMesh(_usbMesh.geometry.clone(), usbMat, 2);
      this.#usbInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.#keebGroup.add(this.#usbInstancedMesh);
    }
  }

  createKeys({ scene, keyMat, baseMat }: { scene: THREE.Scene; keyMat: THREE.MeshStandardMaterial; baseMat: THREE.MeshStandardMaterial }) {
    const _switchMesh = scene.getObjectByName("switch");
    const switchData = this.selectedSwitchGeometry;

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
        this.#keebGroup.add(this.#switchInstancedMesh);
      }
    }
  }
}

export class LeftKeeb extends Keeb {
  #fileBaseName;

  constructor({ keyboard, type }: { keyboard: KBNameOptions; type: KBTypeOptions }) {
    let selectedOptType: KBVariantType = "macro";
    let selectedOptValue: KBVariantOptions = "macro";

    const leftOption = document.querySelector("#left-options option:checked");
    if (leftOption instanceof HTMLOptionElement) {
      const {
        dataset: { type: caseType },
        value,
      } = leftOption;

      if (caseType === "blocker") selectedOptType = "blocker";
      if (isValidKeyboardVariant(value)) selectedOptValue = value;
    }

    super({ selectedOptType, selectedOptValue });

    this.#fileBaseName = `models/type${type}/t${type}-${keyboard.slice(0, 1)}-left`;

    this.plateGeometry = geometry[keyboard].left;

    this.usbGeometry = usb[keyboard].left;

    if (keyboard === "kbo") this.setKBOGeometry(three.kbo.left.base, options.blocker.left);
    else this.switchGeometry = three[keyboard].left;
  }

  getFileName(value?: string) {
    let string = this.#fileBaseName;
    const leftSideValue = value || this.selectedOptValue;
    if (leftSideValue === "macro") string += "-macro";

    return (string += ".glb");
  }
}

export class RightKeeb extends Keeb {
  #fileBaseName;
  #rightShiftValue: KBORightShiftOption | false = false;

  constructor({ keyboard, type }: { keyboard: KBNameOptions; type: KBTypeOptions }) {
    let selectedOptType: KBVariantType = "macro";
    let selectedOptValue: KBVariantOptions = "macro";

    const rightOption = document.querySelector("#right-options option:checked");
    if (rightOption instanceof HTMLOptionElement) {
      const {
        dataset: { type: caseType },
        value,
      } = rightOption;

      if (caseType === "blocker") selectedOptType = "blocker";
      if (isValidKeyboardVariant(value)) selectedOptValue = value;
    }

    super({ selectedOptType, selectedOptValue });

    const rightShift = document.querySelector("#right-shift option:checked");
    if (rightShift && rightShift instanceof HTMLOptionElement && isValidRightShift(rightShift.value)) {
      this.#rightShiftValue = rightShift.value;
    }

    this.#fileBaseName = `models/type${type}/t${type}-${keyboard.slice(0, 1)}-right`;

    this.plateGeometry = geometry[keyboard].right;

    this.usbGeometry = usb[keyboard].right;

    if (keyboard === "kbo") {
      const {
          blocker: { right },
        } = options,
        {
          kbo: {
            right: { base },
          },
        } = three;

      this.setKBOGeometry(base, right);
    } else this.switchGeometry = three[keyboard].right;
  }

  get rightShiftData() {
    if (this.#rightShiftValue) return options.shift[this.#rightShiftValue];
  }

  set rightShiftValue(value: string) {
    if (isValidRightShift(value)) this.#rightShiftValue = value;
  }

  getFileName(value?: string) {
    let string = this.#fileBaseName;
    const caseOpt = value || this.selectedOptValue;

    if (this.selectedOptType === "macro") {
      if (caseOpt === "60") string += "-60";
      else string += "-65";
    }

    return (string += ".glb");
  }
}
