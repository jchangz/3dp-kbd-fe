import * as THREE from "three";

// Lights

const keyLight = new THREE.DirectionalLight(0xffffff, 1);
keyLight.position.set(-2, 4, -2);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 1024;
keyLight.shadow.mapSize.height = 1024;

const fillLight = new THREE.DirectionalLight(0xffffff, 1);
fillLight.position.set(-5, 4, 2);

// Shadow Plane

const planeGeometry = new THREE.PlaneGeometry(2, 5);
planeGeometry.rotateX(-Math.PI / 2);
const shadowMaterial = new THREE.ShadowMaterial();
shadowMaterial.opacity = 0.3;
const shadowPlane = new THREE.Mesh(planeGeometry, shadowMaterial);
shadowPlane.receiveShadow = true;

export { keyLight, fillLight, shadowPlane };
