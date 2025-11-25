import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

let camera, scene, renderer;
let controllers = [];
let room;
let particles = [];
let floatingObjects = [];
const clock = new THREE.Clock();

init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.Fog(0x050510, 10, 50);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 1.6, 3);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    const vrButton = document.getElementById('vrButton');
    if ('xr' in navigator) {
        navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
            if (supported) {
                vrButton.textContent = 'Enter VR';
                vrButton.disabled = false;
                vrButton.onclick = () => {
                    if (renderer.xr.isPresenting) {
                        renderer.xr.getSession().end();
                    } else {
                        navigator.xr.requestSession('immersive-vr', {
                            optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
                        }).then((session) => {
                            renderer.xr.setSession(session);
                        });
                    }
                };
            } else {
                vrButton.textContent = 'VR Not Supported';
                vrButton.disabled = true;
            }
        });
    } else {
        vrButton.textContent = 'WebXR Not Available';
        vrButton.disabled = true;
    }

    const ambientLight = new THREE.AmbientLight(0x4444ff, 0.3);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xff0066, 2, 20);
    pointLight1.position.set(3, 3, 3);
    pointLight1.castShadow = true;
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x00ffff, 2, 20);
    pointLight2.position.set(-3, 3, -3);
    pointLight2.castShadow = true;
    scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0x00ff88, 1.5, 15);
    pointLight3.position.set(0, 5, 0);
    scene.add(pointLight3);

    createLightOrb(pointLight1, 0xff0066);
    createLightOrb(pointLight2, 0x00ffff);
    createLightOrb(pointLight3, 0x00ff88);

    const floorGeometry = new THREE.CircleGeometry(10, 64);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        roughness: 0.3,
        metalness: 0.7,
        side: THREE.DoubleSide
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    createGeometricStructures();

    createParticles();

    createFloatingCrystals();

    createTunnel();

    setupControllers();

    window.addEventListener('resize', onWindowResize);

    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    });

    const keys = {};
    document.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
    document.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

    function updateMovement() {
        if (!renderer.xr.isPresenting) {
            const speed = 0.05;
            if (keys['w']) camera.position.z -= speed;
            if (keys['s']) camera.position.z += speed;
            if (keys['a']) camera.position.x -= speed;
            if (keys['d']) camera.position.x += speed;
            
            camera.rotation.y = mouseX * Math.PI * 0.3;
            camera.rotation.x = mouseY * Math.PI * 0.15;
        }
    }

    renderer.setAnimationLoop(() => {
        updateMovement();
        animate();
    });
}

function createLightOrb(light, color) {
    const orbGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const orbMaterial = new THREE.MeshBasicMaterial({ 
        color: color,
        transparent: true,
        opacity: 0.8
    });
    const orb = new THREE.Mesh(orbGeometry, orbMaterial);
    orb.position.copy(light.position);
    
    const glowGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    orb.add(glow);
    
    scene.add(orb);
    orb.userData.light = light;
    floatingObjects.push(orb);
}

function createGeometricStructures() {
    const geometries = [
        new THREE.IcosahedronGeometry(0.5, 0),
        new THREE.OctahedronGeometry(0.5, 0),
        new THREE.TetrahedronGeometry(0.5, 0),
        new THREE.TorusKnotGeometry(0.3, 0.1, 64, 8)
    ];

    for (let i = 0; i < 12; i++) {
        const geometry = geometries[Math.floor(Math.random() * geometries.length)];
        const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(Math.random(), 0.8, 0.6),
            roughness: 0.3,
            metalness: 0.8,
            emissive: new THREE.Color().setHSL(Math.random(), 0.8, 0.3),
            emissiveIntensity: 0.5,
            wireframe: Math.random() > 0.5
        });

        const mesh = new THREE.Mesh(geometry, material);
        const angle = (i / 12) * Math.PI * 2;
        const radius = 4 + Math.random() * 2;
        mesh.position.set(
            Math.cos(angle) * radius,
            1 + Math.random() * 3,
            Math.sin(angle) * radius
        );
        mesh.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        mesh.castShadow = true;
        mesh.userData.rotationSpeed = {
            x: (Math.random() - 0.5) * 0.02,
            y: (Math.random() - 0.5) * 0.02,
            z: (Math.random() - 0.5) * 0.02
        };
        scene.add(mesh);
        floatingObjects.push(mesh);
    }
}

function createParticles() {
    const particleCount = 500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 1] = Math.random() * 10;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

        const color = new THREE.Color().setHSL(Math.random(), 0.8, 0.6);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });

    const particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);
    particles.push(particleSystem);
}

function createFloatingCrystals() {
    const crystalGeometry = new THREE.ConeGeometry(0.2, 0.8, 6);
    
    for (let i = 0; i < 8; i++) {
        const material = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color().setHSL(i / 8, 0.8, 0.5),
            metalness: 0.9,
            roughness: 0.1,
            transparent: true,
            opacity: 0.8,
            transmission: 0.5,
            thickness: 0.5,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1
        });

        const crystal = new THREE.Mesh(crystalGeometry, material);
        const angle = (i / 8) * Math.PI * 2;
        crystal.position.set(
            Math.cos(angle) * 2.5,
            1.5 + Math.sin(i) * 0.5,
            Math.sin(angle) * 2.5
        );
        crystal.rotation.z = Math.random() * Math.PI;
        crystal.castShadow = true;
        scene.add(crystal);
        floatingObjects.push(crystal);
    }
}

function createTunnel() {
    const tunnelGroup = new THREE.Group();
    
    for (let i = 0; i < 10; i++) {
        const geometry = new THREE.TorusGeometry(3 - i * 0.1, 0.05, 16, 50);
        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL(i / 10, 0.8, 0.5),
            transparent: true,
            opacity: 0.3
        });
        const torus = new THREE.Mesh(geometry, material);
        torus.position.z = -i * 2;
        torus.rotation.y = i * 0.2;
        tunnelGroup.add(torus);
    }
    
    scene.add(tunnelGroup);
    floatingObjects.push(tunnelGroup);
}

function setupControllers() {
    const controllerModelFactory = new XRControllerModelFactory();

    for (let i = 0; i < 2; i++) {
        const controller = renderer.xr.getController(i);
        controller.addEventListener('selectstart', onSelectStart);
        controller.addEventListener('selectend', onSelectEnd);
        scene.add(controller);

        const grip = renderer.xr.getControllerGrip(i);
        grip.add(controllerModelFactory.createControllerModel(grip));
        scene.add(grip);

        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -1)
        ]);
        const material = new THREE.LineBasicMaterial({ 
            color: 0x00ffff,
            linewidth: 2
        });
        const line = new THREE.Line(geometry, material);
        line.scale.z = 5;
        controller.add(line);

        controllers.push({ controller, grip });
    }
}

function onSelectStart(event) {
    const controller = event.target;
    controller.children[0].material.color.setHex(0xff00ff);
}

function onSelectEnd(event) {
    const controller = event.target;
    controller.children[0].material.color.setHex(0x00ffff);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    const time = clock.getElapsedTime();

    particles.forEach((particleSystem) => {
        particleSystem.rotation.y = time * 0.05;
        const positions = particleSystem.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 1] += Math.sin(time + positions[i]) * 0.001;
        }
        particleSystem.geometry.attributes.position.needsUpdate = true;
    });

    floatingObjects.forEach((obj, index) => {
        if (obj.userData.rotationSpeed) {
            obj.rotation.x += obj.userData.rotationSpeed.x;
            obj.rotation.y += obj.userData.rotationSpeed.y;
            obj.rotation.z += obj.userData.rotationSpeed.z;
        }
        
        obj.position.y += Math.sin(time * 2 + index) * 0.001;
        
        if (obj.userData.light) {
            const light = obj.userData.light;
            const radius = 5;
            light.position.x = Math.cos(time * 0.5 + index) * radius;
            light.position.z = Math.sin(time * 0.5 + index) * radius;
            light.position.y = 3 + Math.sin(time + index) * 1;
            obj.position.copy(light.position);
        }
    });

    renderer.render(scene, camera);
}

