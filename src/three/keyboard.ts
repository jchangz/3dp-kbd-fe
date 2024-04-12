import * as THREE from "three";
import { MathUtils } from "three";
import type { GLTF } from "three/examples/jsm/Addons.js";
import { three, options } from "../assets/three.json";
import { geometry } from "../assets/geometry.json";

class Keeb {
  #pivotGroup = new THREE.Group();
  #keebGroup = new THREE.Group();
  #caseGroup = new THREE.Group();
  #keysGroup = new THREE.Group();

  #selectedOptType;
  #selectedOptValue;
  #selectedOptBottom = "standard";

  #switchInstancedMesh?: THREE.InstancedMesh;
  #switch3DMap = new THREE.Object3D();

  #plateGeometry: { [key: string]: number[][] } = {};
  #switchGeometry: { [key: string]: threeObj } = {};

  constructor({ selectedOptType, selectedOptValue }: { selectedOptType: string; selectedOptValue: string }) {
    this.#selectedOptType = selectedOptType;
    this.#selectedOptValue = selectedOptValue;

    const bottomTypeInput = document.querySelector("#bottom-case input:checked") as HTMLInputElement;
    this.#selectedOptBottom = bottomTypeInput?.value;

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

  set plateGeometry(data: { [key: string]: number[][] }) {
    this.#plateGeometry = data;
  }

  set switchGeometry(data: { [key: string]: threeObj }) {
    this.#switchGeometry = data;
  }

  set selectedOptValue(value: string) {
    this.#selectedOptValue = value;
  }

  setKBOGeometry(data: threeObj, options: { [key: string]: threeObj }) {
    // Transform kbo specific layouts
    const newData: { [index: string]: threeObj } = {};

    Object.keys(options).forEach((opt) => {
      const dataCopy = JSON.parse(JSON.stringify(data));
      const extraData = options[opt];
      dataCopy.mx = [...dataCopy.mx, ...extraData.mx];
      dataCopy.rows = { ...dataCopy.rows, ...extraData.rows };
      newData[opt] = dataCopy;
    });

    this.switchGeometry = newData;
  }

  set bottomCase(type: string) {
    this.#selectedOptBottom = type;
    const toHide = type === "standard" ? "vented" : "standard";
    const caseToShow = this.#caseGroup.getObjectByName(type);
    const caseToHide = this.#caseGroup.getObjectByName(toHide);
    if (caseToHide && caseToShow) {
      caseToHide.visible = false;
      caseToShow.visible = true;
    }
  }

  set render(i: number) {
    if (this.#switchInstancedMesh) {
      const { mx, rows } = this.selectedSwitchGeometry;
      this.#switch3DMap.position.set(mx[i].x, mx[i].y, mx[i].z);
      this.#switch3DMap.updateMatrix();

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
    let selectedPlateOption;
    if (this.#selectedOptType !== "macro") selectedPlateOption = "base";
    else {
      switch (this.#selectedOptValue) {
        case "60":
          selectedPlateOption = "no-macro";
          break;
        case "65":
        case "65-b":
          selectedPlateOption = "macro";
          break;
        default:
          selectedPlateOption = this.#selectedOptValue;
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

  constructor({ keyboardName, keyboardType }: { keyboardName: string; keyboardType: string }) {
    const leftOption = document.querySelector("#left-options input:checked") as HTMLInputElement;
    const selectedOptType = leftOption.dataset.type || "";
    const selectedOptValue = leftOption?.value || "";

    super({ selectedOptType, selectedOptValue });

    this.#fileBaseName = `models/type${keyboardType}/t${keyboardType}-${keyboardName.slice(0, 1)}-left`;

    this.plateGeometry = (geometry as geometryObj)[keyboardName].left;
    if (keyboardName === "kbo") this.setKBOGeometry(three.kbo.left.base, options.blocker.left);
    else this.switchGeometry = (three as keyboardObj)[keyboardName].left;
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

  #rightShiftGeometry: { [key: string]: mxObj } = {};
  #rightShiftValue;

  constructor({ keyboardName, keyboardType }: { keyboardName: string; keyboardType: string }) {
    const rightOption = document.querySelector("#right-options input:checked") as HTMLInputElement;
    const selectedOptType = rightOption.dataset.type || "";
    const selectedOptValue = rightOption?.value || "";

    super({ selectedOptType, selectedOptValue });

    const rightShift = document.querySelector("#right-shift input:checked") as HTMLInputElement;
    this.#rightShiftValue = rightShift?.value;

    this.#fileBaseName = `models/type${keyboardType}/t${keyboardType}-${keyboardName.slice(0, 1)}-right`;

    this.plateGeometry = (geometry as geometryObj)[keyboardName].right;

    if (keyboardName === "kbo") {
      const {
          blocker: { right },
          shift,
        } = options,
        {
          kbo: {
            right: { base },
          },
        } = three;

      this.setKBOGeometry(base, right);
      this.#rightShiftGeometry = shift;
    } else this.switchGeometry = (three as keyboardObj)[keyboardName].right;
  }

  get rightShiftData() {
    if (this.#rightShiftGeometry) return this.#rightShiftGeometry[this.#rightShiftValue];
    return false;
  }

  set rightShiftValue(value: string) {
    this.#rightShiftValue = value;
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
