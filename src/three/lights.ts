import * as THREE from "three";

// Lights

const dirLight = new THREE.DirectionalLight(0x55505a, 3);
dirLight.position.set(0, 3, 0);

const keyLight = new THREE.DirectionalLight(0xffffff, 1);
keyLight.position.set(-2, 4, -2);

const fillLight = new THREE.DirectionalLight(0xffffff, 1);
fillLight.position.set(-5, 4, 2);

const spotLight = new THREE.SpotLight(0xffffff, 60);
spotLight.angle = Math.PI / 5;
spotLight.penumbra = 0.2;
// spotLight.position.set( -2, 3, 3 );
spotLight.position.set(-2, 3, 0);
spotLight.castShadow = true;
spotLight.shadow.camera.near = 3;
spotLight.shadow.camera.far = 10;
spotLight.shadow.mapSize.width = 1024;
spotLight.shadow.mapSize.height = 1024;

// Shadow Plane

const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshPhongMaterial({ color: 0x232323, depthWrite: false }));
shadowPlane.rotation.x = -Math.PI / 2;
shadowPlane.receiveShadow = true;

export { spotLight, keyLight, fillLight, shadowPlane };
