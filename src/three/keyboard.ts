import * as THREE from "three";
import { MathUtils } from "three";
import { three } from "../assets/three.json";
import { geometry } from "../assets/geometry.json";

export default class Keyboard {
  scene;
  keyboardName = ""; // quefrency, sinc, kbo
  fileBaseName = "";
  leftFileName = "";
  rightFileName = "";
  materials: { [key: string]: THREE.Material } = {};

  bottomCaseDefaultValue = "";

  left: { [key: string]: threeObj } = {};
  leftDefaultType = "";
  leftDefaultValue = "";

  right: { [key: string]: threeObj } = {};
  rightDefaultType = "";
  rightDefaultValue = "";
  rightShiftData?: { [index: string]: mxObj };
  rightShiftDefaultValue?: string;

  // Main container for left/right group, to be rotated in scene
  mainGroup = new THREE.Group();

  // Container holding keycaps, case & switches
  leftGroup = new THREE.Group();
  rightGroup = new THREE.Group();

  // Container holding case meshes
  leftCaseGroup = new THREE.Group();
  rightCaseGroup = new THREE.Group();

  // Container holding keycap instanced meshes
  keysGroupLeft = new THREE.Group();
  leftSwitchMesh?: THREE.InstancedMesh;
  leftSwitch3DMap = new THREE.Object3D();
  keysGroupRight = new THREE.Group();
  rightSwitchMesh?: THREE.InstancedMesh;
  rightSwitch3DMap = new THREE.Object3D();

  // Parent container to be rotated for mounting
  leftPivotGroup = new THREE.Group();
  rightPivotGroup = new THREE.Group();

  constructor(scene: THREE.Scene) {
    this.leftGroup.add(this.leftCaseGroup, this.keysGroupLeft);
    this.rightGroup.add(this.rightCaseGroup, this.keysGroupRight);

    this.leftPivotGroup.add(this.leftGroup);
    this.rightPivotGroup.add(this.rightGroup);

    this.mainGroup.add(this.leftPivotGroup, this.rightPivotGroup);
    this.mainGroup.rotation.y = Math.PI / 2;

    const leftDefault = document.querySelector("#left-options input:checked") as HTMLInputElement;
    this.leftDefaultType = leftDefault.dataset.type || "";
    this.leftDefaultValue = leftDefault?.value || "";

    const rightDefault = document.querySelector("#right-options input:checked") as HTMLInputElement;
    this.rightDefaultType = rightDefault?.dataset.type || "";
    this.rightDefaultValue = rightDefault?.value || "";

    const rightShiftDefault = document.querySelector("#right-shift input:checked") as HTMLInputElement;
    this.rightShiftDefaultValue = rightShiftDefault?.value;

    const bottomCaseDefault = document.querySelector("#bottom-case input:checked") as HTMLInputElement;
    this.bottomCaseDefaultValue = bottomCaseDefault?.value;

    this.scene = scene;
  }

  get main() {
    return this.mainGroup;
  }

  set bottomCase(value: string) {
    this.bottomCaseDefaultValue = value;
  }
  set rightShift(value: string) {
    this.rightShiftDefaultValue = value;
  }
  set leftKeyboard(value: string) {
    this.leftDefaultValue = value;
    this.createKeys("left");
  }
  set rightKeyboard(value: string) {
    this.rightDefaultValue = value;
    this.createKeys("right");
  }

  clearCaseGroup(side: string) {
    if (side === "left") this.leftCaseGroup.clear();
    if (side === "right") this.rightCaseGroup.clear();
  }

  setLeftCase(meshes: THREE.Group) {
    this.leftCaseGroup.add(meshes);
  }

  setRightCase(meshes: THREE.Group) {
    this.rightCaseGroup.add(meshes);
  }

  setBottomCase(type: string) {
    this.bottomCaseDefaultValue = type;
    const toHide = type === "standard" ? "vented" : "standard";
    const groupsToShow = this.mainGroup.getObjectsByProperty("name", type);
    const groupsToHide = this.mainGroup.getObjectsByProperty("name", toHide);
    if (groupsToHide.length && groupsToShow.length) {
      for (let i = 0; i < groupsToHide.length; i++) {
        groupsToHide[i].visible = false;
        groupsToShow[i].visible = true;
      }
    }
  }

  setMaterials(baseMaterial: THREE.Material, keyMaterial: THREE.Material) {
    this.materials.baseMat = baseMaterial;
    this.materials.keyMat = keyMaterial;
  }

  setFileNames() {
    this.leftFileName = `${this.fileBaseName}-left`;
    this.rightFileName = `${this.fileBaseName}-right`;

    if (this.leftDefaultValue === "macro") this.leftFileName += "-macro";

    // Quefrency only
    if (this.rightDefaultType === "macro") {
      if (this.rightDefaultValue === "60") this.rightFileName += "-60";
      else this.rightFileName += "-65";
    }

    this.leftFileName += ".glb";
    this.rightFileName += ".glb";
  }

  setKeyboard(keyboardName: string, keyboardType: string) {
    this.keyboardName = keyboardName;
    this.fileBaseName = `models/type${keyboardType}/t${keyboardType}-${keyboardName.slice(0, 1)}`;

    let { left, right } = (three as keyboardObj)[this.keyboardName];

    // transform kbo specific layouts
    if (keyboardName === "kbo") {
      const options = three.options as kboOptions;
      const newLeft: { [index: string]: threeObj } = {};
      const newRight: { [index: string]: threeObj } = {};

      this.rightShiftData = options.shift;

      Object.keys(options.left).forEach((opt) => {
        const leftCopy = JSON.parse(JSON.stringify(left.base));
        const extraLeft = options.left[opt];
        leftCopy.mx = [...leftCopy.mx, ...extraLeft.mx];
        leftCopy.rows = { ...leftCopy.rows, ...extraLeft.rows };
        newLeft[opt] = leftCopy;
      });
      Object.keys(options.right).forEach((opt) => {
        const leftCopy = JSON.parse(JSON.stringify(right.base));
        const extraLeft = options.right[opt];
        leftCopy.mx = [...leftCopy.mx, ...extraLeft.mx];
        leftCopy.rows = { ...leftCopy.rows, ...extraLeft.rows };
        newRight[opt] = leftCopy;
      });

      left = newLeft;
      right = newRight;
    }

    this.left = left;
    this.right = right;
  }

  setPivotPoint() {
    const groups = [
      { group: this.leftGroup, pivot: this.leftPivotGroup, direction: 1 },
      { group: this.rightGroup, pivot: this.rightPivotGroup, direction: -1 },
    ];

    groups.forEach((item) => {
      const bbox = new THREE.Box3().setFromObject(item.group);
      bbox.getCenter(item.group.position);
      item.group.position.multiplyScalar(-1);

      const xShift = (Math.abs(bbox.max.x) + Math.abs(bbox.min.x)) / 2;
      const yShift = (Math.abs(bbox.max.y) + Math.abs(bbox.min.y)) / 2;

      item.group.position.set(item.group.position.x + item.direction * xShift, -item.group.position.y - yShift, -item.group.position.z);

      item.pivot.position.set(-item.group.position.x, -item.group.position.y, item.group.position.z);
    });
  }

  createKeys(side: string) {
    const _switchMesh = this.scene.getObjectByName("switch");

    let switchData;
    if (side === "left") switchData = this.left[this.leftDefaultValue];
    if (side === "right") switchData = this.right[this.rightDefaultValue];

    if (switchData) {
      const name = "switches";
      // Set the group to add the switches to
      const currentGroup = side === "left" ? this.leftGroup : this.rightGroup;
      // Set the group to add the keycaps to
      const currentKeyGroup = side === "left" ? this.keysGroupLeft : this.keysGroupRight;

      // Remove the previous switches if it exists
      const filesToDispose: THREE.Object3D[] = [];
      if (currentGroup.children.length) {
        currentGroup.traverse((child) => {
          if (child instanceof THREE.InstancedMesh && child.name === name) {
            filesToDispose.push(child);
            child.geometry.dispose();
          }
        });
        currentKeyGroup.traverse((instMesh) => {
          if (instMesh instanceof THREE.InstancedMesh) instMesh.geometry.dispose();
        });
        currentKeyGroup.clear();

        if (filesToDispose.length) {
          for (var i = 0, n = filesToDispose.length; i < n; i++) currentGroup.remove(filesToDispose[i]);
        }
      }

      const rowData = switchData.rows;
      Object.keys(rowData).forEach((row) => {
        const _keycapMesh = this.scene.getObjectByName(row);
        if (_keycapMesh && _keycapMesh instanceof THREE.Mesh) {
          const keycapMesh = new THREE.InstancedMesh(_keycapMesh.geometry.clone(), this.materials.keyMat, rowData[row].length);
          keycapMesh.name = row;
          keycapMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          currentKeyGroup.add(keycapMesh);
        }
      });

      if (_switchMesh instanceof THREE.Mesh) {
        if (side === "left") {
          this.leftSwitchMesh = new THREE.InstancedMesh(_switchMesh.geometry.clone(), this.materials.baseMat, switchData.mx.length);
          this.leftSwitchMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          this.leftSwitchMesh.name = name;
          this.leftGroup.add(this.leftSwitchMesh);
        }
        if (side === "right") {
          this.rightSwitchMesh = new THREE.InstancedMesh(_switchMesh.geometry.clone(), this.materials.baseMat, switchData.mx.length);
          this.rightSwitchMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          this.rightSwitchMesh.name = name;
          this.rightGroup.add(this.rightSwitchMesh);
        }
      }
    }
  }

  createPlates(side: string) {
    this.setFileNames();

    const data = (geometry as geometryObj)[this.keyboardName];

    let defaultType = side === "left" ? this.leftDefaultType : this.rightDefaultType;
    let defaultTypeValue = side === "left" ? this.leftDefaultValue : this.rightDefaultValue;

    if (defaultType !== "macro") defaultTypeValue = "base";

    if (this.keyboardName === "quefrency" && side === "right") {
      // Quefrency right plate: 65 = macro, 60 = no-macro
      if (this.rightDefaultValue === "60") defaultTypeValue = "no-macro";
      else defaultTypeValue = "macro";
    }

    let plateData;
    if (side === "left") plateData = data && data.left[defaultTypeValue];
    if (side === "right") plateData = data && data.right[defaultTypeValue];

    if (plateData) {
      const name = "plate";
      const coordinatePts = plateData.map((pt) => new THREE.Vector2(pt[0], pt[1]));
      const shape = new THREE.Shape(coordinatePts);
      const plateGeometry = new THREE.ExtrudeGeometry(shape, {
        depth: 0.016,
        bevelEnabled: false,
      });
      const mesh = new THREE.Mesh(plateGeometry, this.materials.baseMat);
      mesh.scale.set(1, 1, -1);
      mesh.rotation.x = -Math.PI / 2 + MathUtils.degToRad(6);
      mesh.position.y = 0.1762;
      mesh.name = name;

      // Set the group to add the plate to
      const currentGroup = side === "left" ? this.leftGroup : this.rightGroup;

      // Remove the previous plate mesh if it exists
      const filesToDispose: THREE.Object3D[] = [];
      if (currentGroup.children.length) {
        currentGroup.traverse((child) => {
          if (child instanceof THREE.Mesh && child.name === "plate") {
            filesToDispose.push(child);
            child.geometry.dispose();
          }
        });
        if (filesToDispose.length) {
          for (var i = 0, n = filesToDispose.length; i < n; i++) currentGroup.remove(filesToDispose[i]);
        }
      }

      currentGroup.add(mesh);
    }
  }

  renderKeys() {
    if (this.leftSwitchMesh && this.rightSwitchMesh) {
      const left = this.left[this.leftDefaultValue];
      const right = this.right[this.rightDefaultValue];
      var maxLength = Math.max(left.mx.length, right.mx.length);

      if (this.keyboardName === "kbo" && this.rightShiftData && this.rightShiftDefaultValue) {
        right.mx[42] = this.rightShiftData[this.rightShiftDefaultValue];
      }

      let i = 0;
      for (let x = 0; x < maxLength; x++) {
        if (x < left.mx.length) {
          this.leftSwitch3DMap.position.set(left.mx[i].x, left.mx[i].y, left.mx[i].z);
          this.leftSwitch3DMap.updateMatrix();

          this.keysGroupLeft.children.forEach((mesh) => {
            if (mesh instanceof THREE.InstancedMesh && left.rows[mesh.name].matrix[i]) {
              mesh.setMatrixAt(left.rows[mesh.name].matrix[i] - 1, this.leftSwitch3DMap.matrix);
            }
          });
          this.leftSwitchMesh.setMatrixAt(i, this.leftSwitch3DMap.matrix);
        }
        if (x < right.mx.length) {
          this.rightSwitch3DMap.position.set(right.mx[i].x, right.mx[i].y, right.mx[i].z);
          this.rightSwitch3DMap.updateMatrix();

          this.keysGroupRight.children.forEach((mesh) => {
            if (mesh instanceof THREE.InstancedMesh && right.rows[mesh.name].matrix[i]) {
              mesh.setMatrixAt(right.rows[mesh.name].matrix[i] - 1, this.rightSwitch3DMap.matrix);
            }
          });
          this.rightSwitchMesh.setMatrixAt(i, this.rightSwitch3DMap.matrix);
        }
        i++;
      }
      this.leftSwitchMesh.instanceMatrix.needsUpdate = true;
      this.rightSwitchMesh.instanceMatrix.needsUpdate = true;
    }
  }
}
