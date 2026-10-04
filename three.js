// ============================================================
// PROFESSIONAL CARBON CAPTURE DIGITAL TWIN
// Step 6: clickable components + state-based colors
// ============================================================

import * as THREE from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";


// ============================================================
// CONTAINER
// ============================================================

const container = document.getElementById("threejs");

if (!container) {
    throw new Error("Three.js container #threejs not found.");
}

container.innerHTML = "";


// ============================================================
// COLOR PALETTE
// ============================================================

const COLORS = {

    background: 0x07121d,
    ground: 0x101a24,
    platform: 0x202d39,

    plant: 0x394b5b,
    plantRoof: 0x17222d,

    chimney: 0x65727c,
    chimneyDark: 0x4b5862,
    chimneyBand: 0x9f4037,

    absorber: 0x46656d,
    absorberDark: 0x304d55,

    stripper: 0x56636b,
    stripperDark: 0x414d55,

    steel: 0x87939b,
    steelLight: 0xb5bdc2,
    steelDark: 0x5d6870,

    reboiler: 0x4d5961,

    storage: 0x737e85,
    storageDark: 0x555f66,

    fanHousing: 0x161e26,
    fanBlade: 0x2b353d,

    flueFlow: 0xe0a63d,
    cleanFlow: 0x3bca88,
    solventFlow: 0x42a98e,
    co2Flow: 0xd9544f,

    smoke: 0x9ba5ad

};


// ============================================================
// SCENE
// ============================================================

const scene = new THREE.Scene();

scene.background = new THREE.Color(COLORS.background);


// ============================================================
// CAMERA
// ============================================================

const camera = new THREE.PerspectiveCamera(
    42,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
);

camera.position.set(28, 15, 30);


// ============================================================
// RENDERER
// ============================================================

const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

renderer.setSize(container.clientWidth, container.clientHeight);

renderer.shadowMap.enabled = true;

renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.outputColorSpace = THREE.SRGBColorSpace;

container.appendChild(renderer.domElement);


// ============================================================
// CONTROLS
// ============================================================

const controls = new OrbitControls(camera, renderer.domElement);

controls.enableDamping = true;

controls.dampingFactor = 0.05;

controls.minDistance = 14;

controls.maxDistance = 55;

controls.target.set(1, 6, 0);


// ============================================================
// LIGHTING
// ============================================================

scene.add(new THREE.AmbientLight(0xdce8f0, 1.55));


const mainLight = new THREE.DirectionalLight(0xffffff, 3.0);

mainLight.position.set(12, 25, 16);

mainLight.castShadow = true;

scene.add(mainLight);


const processLight = new THREE.PointLight(0x28a8bb, 7, 35);

processLight.position.set(3, 8, 8);

scene.add(processLight);


// ============================================================
// MATERIALS
// ============================================================

function metal(color, roughness = 0.42) {

    return new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.55,
        roughness: roughness
    });

}


function darkMetal(color) {

    return new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.72,
        roughness: 0.28
    });

}


function vesselMaterial(color) {

    return new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.42,
        roughness: 0.32,
        transparent: true,
        opacity: 0.95
    });

}


// ============================================================
// GROUND
// ============================================================

const ground = new THREE.Mesh(

    new THREE.PlaneGeometry(70, 70),

    new THREE.MeshStandardMaterial({
        color: COLORS.ground,
        roughness: 0.82,
        metalness: 0.12
    })

);

ground.rotation.x = -Math.PI / 2;

ground.receiveShadow = true;

scene.add(ground);


// ============================================================
// PLATFORM
// ============================================================

const platform = new THREE.Mesh(
    new THREE.BoxGeometry(28, 0.7, 19),
    metal(COLORS.platform, 0.5)
);

platform.position.y = 0.35;

platform.receiveShadow = true;

scene.add(platform);


// ============================================================
// BOX HELPER
// ============================================================

function createBox(width, height, depth, material, x, y, z) {

    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        material
    );

    mesh.position.set(x, y, z);

    mesh.castShadow = true;

    mesh.receiveShadow = true;

    scene.add(mesh);

    return mesh;

}


// ============================================================
// CYLINDER HELPER
// ============================================================

function createCylinder(
    radiusTop,
    radiusBottom,
    height,
    material,
    x,
    y,
    z,
    segments = 40
) {

    const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
        material
    );

    mesh.position.set(x, y, z);

    mesh.castShadow = true;

    mesh.receiveShadow = true;

    scene.add(mesh);

    return mesh;

}


// ============================================================
// POWER PLANT BUILDING
// ============================================================

const powerPlant = createBox(
    10, 7, 8,
    metal(COLORS.plant, 0.58),
    -6, 4, 0
);


createBox(
    10.6, 0.65, 8.6,
    darkMetal(COLORS.plantRoof),
    -6, 7.8, 0
);


// ============================================================
// ROOFTOP EQUIPMENT
// ============================================================

for (let i = 0; i < 4; i++) {

    createBox(
        1.15, 0.9, 1.15,
        metal(COLORS.steelDark, 0.48),
        -9 + i * 2, 8.5, -1.7
    );

}


// ============================================================
// BOILER
// ============================================================

const boiler = createCylinder(
    2.1, 2.1, 5.5,
    metal(COLORS.steelDark, 0.4),
    -6, 4.1, -0.8,
    40
);

boiler.rotation.z = Math.PI / 2;


// ============================================================
// CHIMNEY
// ============================================================

const chimney = createCylinder(
    1.45, 1.8, 12,
    metal(COLORS.chimney, 0.68),
    -6, 14, 0,
    48
);


createCylinder(
    1.65, 1.65, 0.5,
    darkMetal(COLORS.chimneyDark),
    -6, 20.2, 0,
    48
);


// ============================================================
// CHIMNEY SAFETY BANDS
// ============================================================

const chimneyBands = [];

function chimneyBand(y) {

    chimneyBands.push(

        createCylinder(
            1.58, 1.72, 0.42,
            metal(COLORS.chimneyBand, 0.5),
            -6, y, 0,
            48
        )

    );

}

chimneyBand(17.8);
chimneyBand(14.3);
chimneyBand(10.9);


// ============================================================
// ABSORBER
// ============================================================

const absorber = createCylinder(
    2.15, 2.4, 8,
    vesselMaterial(COLORS.absorber),
    2, 5.3, 0,
    48
);


createCylinder(
    2.25, 2.25, 0.5,
    darkMetal(COLORS.absorberDark),
    2, 9.55, 0,
    48
);


// ============================================================
// RINGS
// ============================================================

function createRing(x, y, z, radius) {

    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.07, 12, 48),
        metal(COLORS.steelLight, 0.28)
    );

    ring.rotation.x = Math.PI / 2;

    ring.position.set(x, y, z);

    scene.add(ring);

}

createRing(2, 1.6, 0, 2.42);

createRing(2, 9.55, 0, 2.42);


// ============================================================
// ABSORBER SUPPORTS
// ============================================================

for (let i = 0; i < 4; i++) {

    const angle = i * Math.PI * 2 / 4;

    const x = 2 + Math.cos(angle) * 1.8;

    const z = Math.sin(angle) * 1.8;

    createBox(
        0.16, 3, 0.16,
        darkMetal(COLORS.steel),
        x, 1.3, z
    );

}


// ============================================================
// STRIPPER / REGENERATOR
// ============================================================

const stripperX = 9.5;
const stripperZ = 2.2;

const stripper = createCylinder(
    1.65, 1.9, 7.5,
    vesselMaterial(COLORS.stripper),
    stripperX, 4.8, stripperZ,
    44
);


createCylinder(
    1.72, 1.72, 0.5,
    darkMetal(COLORS.stripperDark),
    stripperX, 8.8, stripperZ,
    44
);


createRing(stripperX, 1.1, stripperZ, 1.95);

createRing(stripperX, 8.8, stripperZ, 1.95);


// ============================================================
// REBOILER
// ============================================================

const reboiler = createBox(
    3.5, 2.2, 3,
    metal(COLORS.reboiler, 0.38),
    stripperX, 1.8, stripperZ
);


// Heat element

const heatCore = new THREE.Mesh(

    new THREE.BoxGeometry(2.5, 0.28, 2),

    new THREE.MeshBasicMaterial({ color: 0xd99020 })

);

heatCore.position.set(stripperX, 2.0, stripperZ);

scene.add(heatCore);


// ============================================================
// CO2 STORAGE TANK
// ============================================================

const storageX = 15;
const storageY = 4.0;
const storageZ = -3.8;

const storage = createCylinder(
    1.9, 1.9, 5.8,
    metal(COLORS.storage, 0.3),
    storageX, storageY, storageZ,
    44
);

storage.rotation.z = Math.PI / 2;


// Tank caps

const storageLeft = createCylinder(
    2.0, 2.0, 0.35,
    darkMetal(COLORS.storageDark),
    12.1, storageY, storageZ,
    44
);

storageLeft.rotation.z = Math.PI / 2;


const storageRight = createCylinder(
    2.0, 2.0, 0.35,
    darkMetal(COLORS.storageDark),
    17.9, storageY, storageZ,
    44
);

storageRight.rotation.z = Math.PI / 2;


// ============================================================
// FAN
// ============================================================

const fanX = 14.5;
const fanY = 8.0;
const fanZ = 4.5;

const fanHousing = createCylinder(
    2.0, 2.0, 1.25,
    darkMetal(COLORS.fanHousing),
    fanX, fanY, fanZ,
    44
);

fanHousing.rotation.z = Math.PI / 2;


const fan = new THREE.Group();

fan.position.set(fanX + 0.7, fanY, fanZ);

scene.add(fan);


// fan center

fan.add(

    new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 20, 20),
        metal(COLORS.steelLight, 0.25)
    )

);


// fan blades

for (let i = 0; i < 6; i++) {

    const blade = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.18, 0.38),
        darkMetal(COLORS.fanBlade)
    );

    blade.position.x = 0.85;

    blade.rotation.z = i * Math.PI / 3;

    fan.add(blade);

}


// ============================================================
// PIPE FUNCTION
// ============================================================

function createPipe(start, end, radius, color) {

    const a = new THREE.Vector3(...start);

    const b = new THREE.Vector3(...end);

    const direction = new THREE.Vector3().subVectors(b, a);

    const length = direction.length();


    const pipe = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, length, 24),
        metal(color, 0.25)
    );


    pipe.position.copy(a.clone().add(b).multiplyScalar(0.5));


    pipe.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.normalize()
    );


    pipe.castShadow = true;

    scene.add(pipe);

    return pipe;

}


// ============================================================
// MULTI-SEGMENT PIPE
// ============================================================

function createPipePath(points, radius, color) {

    for (let i = 0; i < points.length - 1; i++) {

        createPipe(points[i], points[i + 1], radius, color);

    }

}


// ============================================================
// PROCESS CONNECTIONS
// ============================================================

// 1. FLUE GAS: POWER PLANT -> ABSORBER

createPipePath(
    [
        [-1.0, 6.3, 0],
        [0.0, 6.3, 0],
        [0.0, 6.8, 0],
        [2.0, 6.8, 0]
    ],
    0.28,
    COLORS.steel
);


// 2. ABSORBER -> STRIPPER (RICH SOLVENT)

createPipePath(
    [
        [3.2, 4.0, 0],
        [4.8, 4.0, 0],
        [6.0, 4.2, 1.0],
        [8.0, 4.6, stripperZ],
        [stripperX - 1.8, 4.6, stripperZ]
    ],
    0.22,
    COLORS.steel
);


// 3. STRIPPER -> REBOILER

createPipePath(
    [
        [stripperX, 2.3, stripperZ],
        [stripperX, 2.3, stripperZ + 0.9]
    ],
    0.22,
    COLORS.steel
);


// 4. STRIPPER -> CO2 STORAGE (CAPTURED CO2)

createPipePath(
    [
        [stripperX + 1.4, 6.2, stripperZ],
        [12.8, 6.2, stripperZ],
        [12.8, 5.4, storageZ],
        [12.1, storageY, storageZ]
    ],
    0.25,
    COLORS.steelLight
);


// 5. ABSORBER -> CLEAN GAS HEADER

createPipePath(
    [
        [2.0, 9.55, 0],
        [2.0, 10.5, 0],
        [6.0, 10.5, 0],
        [9.5, 10.0, 2.0],
        [11.5, 9.0, fanZ]
    ],
    0.22,
    COLORS.steelLight
);


// 6. CLEAN GAS -> FAN

createPipePath(
    [
        [11.5, 9.0, fanZ],
        [12.6, fanY, fanZ],
        [fanX - 0.7, fanY, fanZ]
    ],
    0.22,
    COLORS.steelLight
);


// 7. FAN OUTLET

createPipePath(
    [
        [fanX + 1.35, fanY, fanZ],
        [17.0, fanY, fanZ]
    ],
    0.30,
    COLORS.steel
);


// ============================================================
// FLOW PARTICLES
// ============================================================

const flowGroups = [];


function createFlow(count, start, end, color, speed) {

    const particles = [];

    for (let i = 0; i < count; i++) {

        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.06, 6, 6),
            new THREE.MeshBasicMaterial({ color })
        );

        particle.userData.progress = Math.random();

        particle.userData.start = new THREE.Vector3(...start);

        particle.userData.end = new THREE.Vector3(...end);

        particle.userData.speed = speed;

        scene.add(particle);

        particles.push(particle);

    }

    flowGroups.push(particles);

}


// flue gas (group 0)

createFlow(24, [0.0, 6.8, 0], [2.0, 6.8, 0], COLORS.flueFlow, 0.004);

// solvent (group 1)

createFlow(24, [3.2, 4.0, 0], [stripperX - 1.8, 4.6, stripperZ], COLORS.solventFlow, 0.003);

// clean gas (group 2)

createFlow(24, [2.0, 9.55, 0], [fanX - 0.7, fanY, fanZ], COLORS.cleanFlow, 0.003);

// captured CO2 (group 3)

createFlow(24, [stripperX + 1.4, 6.2, stripperZ], [12.1, storageY, storageZ], COLORS.co2Flow, 0.003);


// ============================================================
// CHIMNEY SMOKE
// ============================================================

const smokeParticles = [];


for (let i = 0; i < 55; i++) {

    const smoke = new THREE.Mesh(

        new THREE.SphereGeometry(0.20, 8, 8),

        new THREE.MeshStandardMaterial({
            color: COLORS.smoke,
            transparent: true,
            opacity: 0.38
        })

    );

    smoke.position.set(
        -6 + (Math.random() - 0.5) * 1.8,
        20 + Math.random() * 8,
        (Math.random() - 0.5) * 1.8
    );

    smoke.userData.speed = 0.012 + Math.random() * 0.016;

    smoke.userData.phase = Math.random() * 10;

    scene.add(smoke);

    smokeParticles.push(smoke);

}


// ============================================================
// STATE STYLES  (colors change with NORMAL / MEDIUM / HIGH)
// ============================================================

const STATE_STYLE = {

    NORMAL: {
        emissive: new THREE.Color(0x00272d),
        intensity: 0.22,
        light: new THREE.Color(0x28a8bb),
        smoke: new THREE.Color(0x9ba5ad),
        smokeOpacity: 0.38,
        flue: new THREE.Color(0xe0a63d),
        band: new THREE.Color(0x000000),
        tank: new THREE.Color(0x000000)
    },

    MEDIUM: {
        emissive: new THREE.Color(0x3d2d00),
        intensity: 0.40,
        light: new THREE.Color(0xe0a63d),
        smoke: new THREE.Color(0x8f8a80),
        smokeOpacity: 0.46,
        flue: new THREE.Color(0xe8893a),
        band: new THREE.Color(0x2a1000),
        tank: new THREE.Color(0x1c1300)
    },

    HIGH: {
        emissive: new THREE.Color(0x3b0000),
        intensity: 0.65,
        light: new THREE.Color(0xd9534f),
        smoke: new THREE.Color(0x4d4745),
        smokeOpacity: 0.62,
        flue: new THREE.Color(0xe0503d),
        band: new THREE.Color(0x661008),
        tank: new THREE.Color(0x3b0000)
    }

};

const heatCool = new THREE.Color(0xc07818);
const heatHot = new THREE.Color(0xff3b1f);
const heatTarget = new THREE.Color();


// ============================================================
// LIVE BACKEND DATA
// ============================================================

let liveData = {

    co2: 500,
    fan: 70,
    prediction: "MEDIUM",
    temperature: 32

};

let fanSpin = 0.02;

let plumePercent = 0;


window.addEventListener("sensorUpdate", event => {

    if (!event.detail) {
        return;
    }

    liveData = event.detail;

    refreshPopup();

});


// ============================================================
// UPDATE DIGITAL TWIN
// ============================================================

function updateTwin() {

    const co2 = Number(liveData.co2) || 500;

    const fanSpeed = Number(liveData.fan) || 70;

    const temperature = Number(liveData.temperature) || 30;

    const prediction = String(liveData.prediction).toUpperCase();

    const style = STATE_STYLE[prediction] || STATE_STYLE.NORMAL;


    // --------------------------------------------------------
    // FAN  (spin speed follows fan %, smoothed)
    // --------------------------------------------------------

    const fanTarget = THREE.MathUtils.lerp(0.02, 0.40, fanSpeed / 100);

    fanSpin += (fanTarget - fanSpin) * 0.05;

    fan.rotation.z += fanSpin;


    // --------------------------------------------------------
    // SMOKE AMOUNT
    // --------------------------------------------------------

    const visibleSmoke = THREE.MathUtils.clamp(
        Math.round(THREE.MathUtils.mapLinear(co2, 300, 900, 7, 55)),
        7,
        55
    );

    plumePercent = Math.round((visibleSmoke - 7) / (55 - 7) * 100);

    smokeParticles.forEach((particle, index) => {

        particle.visible = index < visibleSmoke;

    });


    // --------------------------------------------------------
    // STATE COLORS (smooth transitions)
    // --------------------------------------------------------

    absorber.material.emissive.lerp(style.emissive, 0.06);

    absorber.material.emissiveIntensity +=
        (style.intensity - absorber.material.emissiveIntensity) * 0.06;


    stripper.material.emissive.lerp(style.emissive, 0.06);

    stripper.material.emissiveIntensity +=
        (style.intensity * 0.5 - stripper.material.emissiveIntensity) * 0.06;


    storage.material.emissive.lerp(style.tank, 0.05);

    processLight.color.lerp(style.light, 0.06);


    // chimney bands pulse red on HIGH

    const pulse = prediction === "HIGH"
        ? 1.0 + 0.3 * Math.sin(performance.now() * 0.003)
        : 1.0;

    chimneyBands.forEach(band => {

        band.material.emissive.lerp(style.band, 0.06);

        band.material.emissiveIntensity = pulse;

    });


    // reboiler heat glows hotter with temperature

    const heat = THREE.MathUtils.clamp((temperature - 28) / 14, 0, 1);

    heatTarget.copy(heatCool).lerp(heatHot, heat);

    heatCore.material.color.lerp(heatTarget, 0.05);


    // flue gas particles turn redder as risk rises

    flowGroups[0].forEach(particle => {

        particle.material.color.lerp(style.flue, 0.05);

    });


    // --------------------------------------------------------
    // PROCESS FLOW
    // --------------------------------------------------------

    flowGroups.forEach(group => {

        group.forEach(particle => {

            particle.userData.progress +=
                particle.userData.speed + fanSpeed / 50000;

            if (particle.userData.progress >= 1) {

                particle.userData.progress = 0;

            }

            particle.position.lerpVectors(
                particle.userData.start,
                particle.userData.end,
                particle.userData.progress
            );

        });

    });


    // --------------------------------------------------------
    // SMOKE MOVEMENT + COLOR
    // --------------------------------------------------------

    smokeParticles.forEach(particle => {

        if (!particle.visible) {
            return;
        }

        particle.material.color.lerp(style.smoke, 0.03);

        particle.material.opacity +=
            (style.smokeOpacity - particle.material.opacity) * 0.03;

        particle.position.y += particle.userData.speed;

        particle.position.x +=
            Math.sin(performance.now() * 0.001 + particle.userData.phase) * 0.0018;

        if (particle.position.y > 29) {

            particle.position.y = 20;

        }

    });

}


// ============================================================
// CLICKABLE COMPONENTS
// ============================================================

const centerPanel = container.parentElement;

const popup = document.createElement("div");
popup.className = "part-popup";
popup.style.display = "none";
centerPanel.appendChild(popup);

const tip = document.createElement("div");
tip.className = "part-tip";
tip.style.display = "none";
centerPanel.appendChild(tip);


const num = (value, digits = 0) => (Number(value) || 0).toFixed(digits);

const stateNow = () => String(liveData.prediction || "NORMAL").toUpperCase();


const parts = {

    plant: {

        name: "Power Plant & Boiler",

        objects: [powerPlant, boiler],

        status: () => ({ text: "Online", level: "ok" }),

        rows: () => [
            ["Plant status", liveData.plantStatus || "Online"],
            ["Temperature", `${num(liveData.temperature, 1)} °C`],
            ["Humidity", `${num(liveData.humidity, 1)} %`],
            ["Air quality", `${num(liveData.airQuality, 2)} AQI`]
        ]

    },


    chimney: {

        name: "Chimney Stack",

        objects: [chimney],

        status: () => {
            const s = stateNow();
            return s === "HIGH" ? { text: "High emissions", level: "bad" }
                : s === "MEDIUM" ? { text: "Elevated", level: "warn" }
                : { text: "Normal", level: "ok" };
        },

        rows: () => [
            ["CO₂ level", `${num(liveData.co2)} ppm`],
            ["Plume intensity", `${plumePercent} %`]
        ]

    },


    absorber: {

        name: "Absorber Tower",

        objects: [absorber],

        status: () => {
            const s = stateNow();
            return s === "HIGH" ? { text: "High load", level: "bad" }
                : s === "MEDIUM" ? { text: "Active", level: "warn" }
                : { text: "Active", level: "ok" };
        },

        rows: () => [
            ["Inlet CO₂", `${num(liveData.co2)} ppm`],
            ["Capture efficiency", `${num(liveData.captureEfficiency)} %`],
            ["Prediction", `${stateNow()} (${num(liveData.confidence, 1)} %)`]
        ]

    },


    stripper: {

        name: "Stripper / Regenerator",

        objects: [stripper],

        status: () => ({ text: "Active", level: "ok" }),

        rows: () => [
            ["Regeneration", "Running"],
            ["Temperature", `${num(liveData.temperature, 1)} °C`]
        ]

    },


    reboiler: {

        name: "Reboiler",

        objects: [reboiler],

        status: () => Number(liveData.temperature) > 35
            ? { text: "High duty", level: "warn" }
            : { text: "On", level: "ok" },

        rows: () => [
            ["Heat duty", Number(liveData.temperature) > 35 ? "HIGH" : "ON"],
            ["Temperature", `${num(liveData.temperature, 1)} °C`]
        ]

    },


    storage: {

        name: "CO₂ Storage Tank",

        objects: [storage, storageLeft, storageRight],

        status: () => stateNow() === "HIGH"
            ? { text: "High", level: "warn" }
            : { text: "Normal", level: "ok" },

        rows: () => [
            ["Storage status", stateNow() === "HIGH" ? "High" : "Normal"],
            ["Capture efficiency", `${num(liveData.captureEfficiency)} %`]
        ]

    },


    fan: {

        name: "Exhaust Fan",

        objects: [fanHousing, fan],

        status: () => ({ text: "Running", level: "ok" }),

        rows: () => [
            ["Speed", `${num(liveData.fan)} %`],
            ["Control mode", liveData.fanMode || "AUTO"]
        ]

    }

};


// mark every pickable object with its part id

const pickObjects = [];

Object.entries(parts).forEach(([id, part]) => {

    part.objects.forEach(object => {

        object.userData.partId = id;

        pickObjects.push(object);

    });

});


const raycaster = new THREE.Raycaster();

const pointer = new THREE.Vector2();


function pick(event) {

    const rect = renderer.domElement.getBoundingClientRect();

    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;

    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    const hits = raycaster.intersectObjects(pickObjects, true);

    if (!hits.length) {
        return null;
    }

    let object = hits[0].object;

    while (object && !object.userData.partId) {
        object = object.parent;
    }

    return object ? object.userData.partId : null;

}


// ------------------------------------------------------------
// SELECTION
// ------------------------------------------------------------

let selectedId = null;

let selectionHelper = null;


function select(id) {

    selectedId = id;

    if (selectionHelper) {

        scene.remove(selectionHelper);

        selectionHelper.geometry.dispose();

        selectionHelper.material.dispose();

        selectionHelper = null;

    }

    if (!id) {

        popup.style.display = "none";

        return;

    }

    const box = new THREE.Box3();

    parts[id].objects.forEach(object => box.expandByObject(object));

    selectionHelper = new THREE.Box3Helper(box, 0x12bfff);

    scene.add(selectionHelper);

    popup.style.display = "block";

    refreshPopup();

}


function refreshPopup() {

    if (!selectedId) {
        return;
    }

    const part = parts[selectedId];

    const status = part.status();

    popup.innerHTML = `
        <div class="pp-head">
            <span>${part.name}</span>
            <button class="pp-close" aria-label="Close">×</button>
        </div>
        <div class="pp-status pp-${status.level}">${status.text}</div>
        ${part.rows().map(([label, value]) => `
            <div class="pp-row"><span>${label}</span><b>${value}</b></div>
        `).join("")}
    `;

}


popup.addEventListener("click", event => {

    if (event.target.classList.contains("pp-close")) {
        select(null);
    }

});


// ------------------------------------------------------------
// POINTER EVENTS (click vs drag)
// ------------------------------------------------------------

let downX = 0;
let downY = 0;
let downTime = 0;

renderer.domElement.addEventListener("pointerdown", event => {

    downX = event.clientX;
    downY = event.clientY;
    downTime = performance.now();

});


renderer.domElement.addEventListener("pointerup", event => {

    const moved = Math.hypot(event.clientX - downX, event.clientY - downY);

    if (moved > 5 || performance.now() - downTime > 500) {
        return;
    }

    select(pick(event));

});


renderer.domElement.addEventListener("pointermove", event => {

    if (event.buttons) {

        tip.style.display = "none";

        return;

    }

    const id = pick(event);

    renderer.domElement.style.cursor = id ? "pointer" : "grab";

    if (!id) {

        tip.style.display = "none";

        return;

    }

    const rect = centerPanel.getBoundingClientRect();

    tip.style.left = `${event.clientX - rect.left + 14}px`;

    tip.style.top = `${event.clientY - rect.top + 14}px`;

    tip.textContent = parts[id].name;

    tip.style.display = "block";

});


renderer.domElement.addEventListener("pointerleave", () => {

    tip.style.display = "none";

});


// ============================================================
// CAMERA VIEWS
// ============================================================

const cameraViews = {

    plant: {
        position: new THREE.Vector3(28, 15, 30),
        target: new THREE.Vector3(2, 6, 0)
    },

    capture: {
        position: new THREE.Vector3(19, 11, 18),
        target: new THREE.Vector3(4, 5, 1)
    },

    storage: {
        position: new THREE.Vector3(23, 11, 10),
        target: new THREE.Vector3(10, 4, -2)
    },

    top: {
        position: new THREE.Vector3(0, 36, 0),
        target: new THREE.Vector3(1, 0, 0)
    },

    reset: {
        position: new THREE.Vector3(28, 15, 30),
        target: new THREE.Vector3(2, 6, 0)
    }

};


window.addEventListener("cameraChange", event => {

    const view = cameraViews[event.detail];

    if (!view) {
        return;
    }

    camera.position.copy(view.position);

    controls.target.copy(view.target);

    controls.update();

});


// ============================================================
// RESIZE
// ============================================================

function resize() {

    const width = container.clientWidth;

    const height = container.clientHeight;

    if (width <= 0 || height <= 0) {
        return;
    }

    camera.aspect = width / height;

    camera.updateProjectionMatrix();

    renderer.setSize(width, height);

}


window.addEventListener("resize", resize);


// ============================================================
// ANIMATION
// ============================================================

function animate() {

    requestAnimationFrame(animate);

    // skip rendering while the dashboard tab is hidden
    if (container.clientWidth === 0) {
        return;
    }

    updateTwin();

    controls.update();

    renderer.render(scene, camera);

}


// ============================================================
// START
// ============================================================

resize();

animate();


// Start at professional plant view

camera.position.copy(cameraViews.plant.position);

controls.target.copy(cameraViews.plant.target);

controls.update();


console.log("Carbon-capture digital twin loaded (clickable + state colors).");