import * as THREE from "three";

// Lights

const dirLight = new THREE.DirectionalLight(0x55505a, 3);
dirLight.position.set(0, 3, 0);

const keyLight = new THREE.DirectionalLight(0xffffff, 1);
keyLight.position.set(-2, 4, -2);

const fillLight = new THREE.DirectionalLight(0xffffff, 1);
fillLight.position.set(-5, 4, 2);

// const spotLight = new THREE.SpotLight(0x318ce7, 150);
const spotLight = new THREE.SpotLight(0xffffff, 50);
spotLight.angle = Math.PI / 4;
spotLight.penumbra = 0.2;
// spotLight.position.set( -2, 3, 3 );
spotLight.position.set(0, 5, -2);
spotLight.castShadow = true;
spotLight.shadow.camera.near = 3;
spotLight.shadow.camera.far = 10;
spotLight.shadow.mapSize.width = 1024;
spotLight.shadow.mapSize.height = 1024;

// 0x318ce7

const pointLightL = new THREE.PointLight(0xa9a9a9, 20, 0);
pointLightL.position.set(-2, 2, -2);

const pointLightR = new THREE.PointLight(0xa9a9a9, 20, 0);
pointLightR.position.set(2, 2, -2);

export { spotLight, pointLightL, pointLightR };
