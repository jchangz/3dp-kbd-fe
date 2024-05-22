import * as THREE from "three";

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
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x000000,
  roughness: 0.8,
  metalness: 0.6,
});
caseMat.color = faceMat.color = new THREE.Color(0x171718);

const textureLoader = (manager: THREE.LoadingManager) => {
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

  const floorNormal = texloader.load("textures/concrete_normal.webp");
  floorNormal.repeat.set(50, 50);
  floorMat.normalMap = floorNormal;

  const floorRoughness = texloader.load("textures/concrete_roughness.webp");
  floorRoughness.repeat.set(50, 50);
  floorMat.roughnessMap = floorRoughness;

  floorRoughness.wrapS =
    floorRoughness.wrapT =
    floorNormal.wrapS =
    floorNormal.wrapT =
    caseNormal.wrapS =
    caseNormal.wrapT =
    caseRoughness.wrapS =
    caseRoughness.wrapT =
    caseAO.wrapS =
    caseAO.wrapT =
    caseFaceNormal.wrapS =
    caseFaceNormal.wrapT =
    keyNormal.wrapS =
    keyNormal.wrapT =
    keyRoughness.wrapS =
    keyRoughness.wrapT =
      THREE.RepeatWrapping;
};

export { caseMat, faceMat, keyMat, baseMat, pcbMat, usbMat, floorMat, textureLoader };
