/* globals */
import * as THREE from 'three';
// import * as d3 from 'd3';
import Papa from 'papaparse';
import { registerDragEvents } from './dragAndDrop.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import URDFManipulator from './urdf-manipulator-element.js';
import globalTimer from './utils/global-timer.js';
import movementContainer from './utils/movement-container.js';
import SvgPlotterObs from './utils/svg-plotter-obs.js';
import SvgPlotterRobot from './utils/svg-plotter-robot.js';
import animationControl from './utils/animation-control.js';
import globalVariables from './utils/global-variables.js';

customElements.define('urdf-viewer', URDFManipulator);

// declare these globally for the sake of the example.
// Hack to make the build work with webpack for now.
// TODO: Remove this once modules or parcel is being used
const viewer = document.querySelector('urdf-viewer');

const limitsToggle = document.getElementById('ignore-joint-limits');
const collisionToggle = document.getElementById('collision-toggle');
const radiansToggle = document.getElementById('radians-toggle');
const autocenterToggle = document.getElementById('autocenter-toggle');
const upSelect = document.getElementById('up-select');
// const sliderList = document.querySelector('#controls ul');
const controlsel = document.getElementById('controls');
const controlsToggle = document.getElementById('toggle-controls');

const loadButton1 = document.getElementById('load-movement1');
const loadButton2 = document.getElementById('load-movement2');
const loadButton3 = document.getElementById('load-movement3');
const svgContainer = document.getElementById('svg-container');
const plotsControls = document.getElementById('plots-controls');
const togglePlotsControls = document.getElementById('toggle-plots-controls');
const plotsLinkControlsContainer = document.getElementById(
    'plots-link-controls-container',
);
const plotsGroupSelection = document.getElementById('plots-group-selection');
const plotsLinkOptionName = document.getElementById('plots-link-option-name');
const plotsRobotControlsContainer = document.getElementById(
    'plots-robot-controls-container',
);
const plotsRobotOptionName = document.getElementById('plots-robot-option-name');

const robotControls1 = document.getElementById('robot1-controls');
const robotControls2 = document.getElementById('robot2-controls');
const robotControls3 = document.getElementById('robot3-controls');
const robotControlsToggle1 = document.getElementById('robot1-toggle-controls');
const robotControlsToggle2 = document.getElementById('robot2-toggle-controls');
const robotControlsToggle3 = document.getElementById('robot3-toggle-controls');

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 1 / DEG2RAD;
let sliders = {};
const svgList = {};

// Global Functions
const setColor = (color) => {
    document.body.style.backgroundColor = color;
    viewer.highlightColor =
        '#' +
        new THREE.Color(0xffffff)
            .lerp(new THREE.Color(color), 0.35)
            .getHexString();
};

// Events
// toggle checkbox
limitsToggle.addEventListener('click', () => {
    limitsToggle.classList.toggle('checked');
    viewer.ignoreLimits = limitsToggle.classList.contains('checked');
});

radiansToggle.addEventListener('click', () => {
    radiansToggle.classList.toggle('checked');
    Object.values(sliders).forEach((sl) => sl.update());
});

collisionToggle.addEventListener('click', () => {
    collisionToggle.classList.toggle('checked');
    viewer.showCollision = collisionToggle.classList.contains('checked');
});

autocenterToggle.addEventListener('click', () => {
    autocenterToggle.classList.toggle('checked');
    viewer.noAutoRecenter = !autocenterToggle.classList.contains('checked');
});

togglePlotsControls.addEventListener('click', () => {
    plotsControls.classList.toggle('hidden');
});

viewer.addEventListener('joint-mouseover', (event) => {
    globalVariables.mouseOverObs = event.detail;
    if (!globalTimer.isRunning) {
        for (const key in svgList) {
            const svg = svgList[key];
            svg.updatePlotOnTime();
        }
    }
});

viewer.addEventListener('joint-mouseout', (event) => {
    globalVariables.mouseOverObs = null;
    if (!globalTimer.isRunning) {
        for (const key in svgList) {
            const svg = svgList[key];
            svg.updatePlotOnTime();
        }
    }
});

class RobotControlsEventListeners {

    constructor(robotNumber) {
        this.robotNumber = robotNumber;
        this.toggleVisibility = document.getElementById(
            `robot${ robotNumber }-visible`,
        );
        this.toggleHightlight = document.getElementById(
            `robot${ robotNumber }-highlight`,
        );
        this.toggleMovement = document.getElementById(
            `robot${ robotNumber }-position`,
        );
        this.initialPosition = {
            x: document.getElementById(`robot${ robotNumber }-positionx`),
            y: document.getElementById(`robot${ robotNumber }-positiony`),
            z: document.getElementById(`robot${ robotNumber }-positionz`),
        };
        viewer.addEventListener('urdf-processed', () =>
            this.initEventListeners(),
        );
    }

    initEventListeners() {
        viewer.setRobotVisibility(this.robotNumber, true);
        this.toggleVisibility.addEventListener('click', () => {
            this.toggleVisibility.classList.toggle('checked');
            if (this.toggleVisibility.classList.contains('checked')) {
                viewer.setRobotVisibility(this.robotNumber, true);
            } else {
                viewer.setRobotVisibility(this.robotNumber, false);
            }
        });

        viewer.setRobotHighlight(this.robotNumber, false);
        this.toggleHightlight.addEventListener('click', () => {
            this.toggleHightlight.classList.toggle('checked');
            if (this.toggleHightlight.classList.contains('checked')) {
                viewer.setRobotHighlight(this.robotNumber, true);
            } else {
                viewer.setRobotHighlight(this.robotNumber, false);
            }
        });

        viewer.setRobotStandStill(this.robotNumber, true);
        this.toggleMovement.addEventListener('click', () => {
            this.toggleMovement.classList.toggle('checked');
            if (this.toggleMovement.classList.contains('checked')) {
                viewer.setRobotStandStill(this.robotNumber, false);
            } else {
                viewer.setRobotStandStill(this.robotNumber, true);
            }
        });

        Object.values(this.initialPosition).forEach((input, index) => {
            // init values
            input.value = viewer.getRobotInitPosition(this.robotNumber, index);
            input.addEventListener('change', () => {
                const position = parseFloat(input.value);
                viewer.setRobotInitPosition(this.robotNumber, index, position);
            });
        });
    }

}
// Initialize listeners for 3 robots
const robotControlsEventListeners = [1, 2, 3].map(
    (num) => new RobotControlsEventListeners(num),
);

const addObsSelectToggles = () => {
    // ADD right bar selection
    while (plotsLinkControlsContainer.firstChild) {
        plotsLinkControlsContainer.removeChild(
            plotsLinkControlsContainer.firstChild,
        );
    }

    for (const key in globalVariables.nameObsMap) {
        // create toggle button
        const toggle = document.createElement('div');
        toggle.className = 'toggle';
        toggle.innerHTML = key;
        toggle.textContent = key;
        toggle.addEventListener('click', () => {
            if (toggle.classList.contains('checked')) {
                toggle.classList.remove('checked');
                // remove from checkedObs
                const index = globalVariables.checkedObs.indexOf(key);
                if (index > -1) {
                    globalVariables.checkedObs.splice(index, 1);
                    updateAllSVG();
                }
                if (svgList[key] !== undefined) {
                    svgList[key].svg.remove();
                }
            } else {
                toggle.classList.add('checked');
                globalVariables.checkedObs.push(key);
                if (globalVariables.groupByRobot === false) {
                    addObsSVG(key);
                }
                updateAllSVG();
            }
        });
        plotsLinkControlsContainer.appendChild(toggle);
    }
};

const addRobotSelectToggles = (robotNum) => {
    const toggle = document.createElement('div');
    toggle.className = 'toggle';
    toggle.classList.add('checked');
    toggle.innerHTML = 'Robot ' + robotNum;
    toggle.textContent = 'Robot ' + robotNum;
    toggle.addEventListener('click', () => {
        if (toggle.classList.contains('checked')) {
            toggle.classList.remove('checked');
            // remove from checkedRobots
            const index = globalVariables.checkedRobots.indexOf(robotNum);
            if (index > -1) {
                globalVariables.checkedRobots.splice(index, 1);
                updateAllSVG();
            }
            if (svgList[robotNum] !== undefined) {
                svgList[robotNum].svg.remove();
            }
        } else {
            toggle.classList.add('checked');
            globalVariables.checkedRobots.push(robotNum);
            if (globalVariables.groupByRobot === true) {
                addRobotSVG(robotNum);
            }
            updateAllSVG();
        }
    });

    plotsRobotControlsContainer.appendChild(toggle);
};

const loadMovementFromCSV = (robotNum) => {
    const fileInput = document.getElementById('load-movement' + robotNum);
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = e.target.result;
        const movement = Papa.parse(data, { header: true }).data;
        // remove last empty row
        movement.pop();
        const movementLength = movement.length;
        globalVariables.movementIndexStart = 0;

        console.log('Loaded movement data');
        console.log('Length:' + movementLength);
        console.log('Start index:' + globalVariables.movementIndexStart);

        if (movementContainer.hasMovement(robotNum)) {
            movementContainer.removeMovement(robotNum);
        }
        movementContainer.addMovement(robotNum, movement);

        globalVariables.movementMinLen = Math.min(movementLength, globalVariables.movementMinLen);

        if (!globalVariables.checkedRobots.includes(robotNum)) {
            globalVariables.checkedRobots.push(robotNum);
        }

        if (globalVariables.groupByRobot === true) {
            addRobotSVG(robotNum);
        }
        if (globalVariables.groupByRobot === false) {
            for (const key in svgList) {
                const svg = svgList[key];
                svg.initMovement();
                svg.updatePlotOnTime();
            }
        }

        while (plotsRobotControlsContainer.firstChild) {
            plotsRobotControlsContainer.removeChild(
                plotsRobotControlsContainer.firstChild,
            );
        }

        // if (movement1 !== null) {
        //     addRobotSelectToggles(1);
        // }
        // if (movement2 !== null) {
        //     addRobotSelectToggles(2);
        // }
        // if (movement3 !== null) {
        //     addRobotSelectToggles(3);
        // }

        for (const rbtnum of movementContainer.robotNums) {
            addRobotSelectToggles(rbtnum);
        }

        if (plotsLinkControlsContainer.childElementCount === 0) {
            if (globalVariables.groupByRobot === true) {
                plotsLinkOptionName.textContent = 'Highlight Options:';
                plotsRobotOptionName.textContent = 'Plot Robots:';
            }
            addObsSelectToggles();
        }
    };
    reader.readAsText(file);
};

const addRobotSVG = (robotNum) => {
    if (svgList[robotNum] !== undefined) {
        svgList[robotNum].svg.remove();
    }
    // const movement = movementContainer.movementDict[robotNum];
    const svg = new SvgPlotterRobot(robotNum, svgContainer.offsetWidth);
    const svgNode = svg.svg.node();
    svgNode.id = 'plot-all' + robotNum;
    svgContainer.appendChild(svgNode);
    svgList[robotNum] = svg;
    svg.updatePlotOnTime();
};

const addObsSVG = (obsName) => {
    if (svgList[obsName] !== undefined) {
        svgList[obsName].svg.remove();
    }
    const svg = new SvgPlotterObs(obsName, svgContainer.offsetWidth);
    const svgNode = svg.svg.node();
    svgNode.id = 'plot-all' + obsName;
    svgContainer.appendChild(svgNode);
    svgList[obsName] = svg;
    svg.updatePlotOnTime();
};

loadButton1.addEventListener('change', (e) => loadMovementFromCSV(1));
loadButton2.addEventListener('change', (e) => loadMovementFromCSV(2));
loadButton3.addEventListener('change', (e) => loadMovementFromCSV(3));

const updateAllSVG = () => {
    for (const key in svgList) {
        const svg = svgList[key];
        svg.updatePlotOnTime();
    }
};

upSelect.addEventListener('change', () => (viewer.up = upSelect.value));

plotsGroupSelection.addEventListener('change', () => {
    while (svgContainer.firstChild) {
        svgContainer.removeChild(svgContainer.firstChild);
    }
    if (plotsGroupSelection.value === 'Robot') {
        plotsLinkOptionName.textContent = 'Highlight Options:';
        plotsRobotOptionName.textContent = 'Plot Robots:';
        globalVariables.groupByRobot = true;
        for (const key in globalVariables.checkedRobots) {
            addRobotSVG(globalVariables.checkedRobots[key]);
        }
    } else {
        plotsLinkOptionName.textContent = 'Plot Links:';
        plotsRobotOptionName.textContent = 'Highlight Robots:';
        globalVariables.groupByRobot = false;
        for (const key in globalVariables.checkedObs) {
            addObsSVG(globalVariables.checkedObs[key]);
        }
    }
});

controlsToggle.addEventListener('click', () =>
    controlsel.classList.toggle('hidden'),
);

robotControlsToggle1.addEventListener('click', () =>
    robotControls1.classList.toggle('hidden'),
);
robotControlsToggle2.addEventListener('click', () =>
    robotControls2.classList.toggle('hidden'),
);
robotControlsToggle3.addEventListener('click', () =>
    robotControls3.classList.toggle('hidden'),
);

// watch for urdf changes
viewer.addEventListener('urdf-change', () => {
    Object.values(sliders).forEach((sl) => sl.remove());
    sliders = {};
});

viewer.addEventListener('ignore-limits-change', () => {
    Object.values(sliders).forEach((sl) => sl.update());
});

viewer.addEventListener('angle-change', (e) => {
    if (sliders[e.detail]) sliders[e.detail].update();
});

viewer.addEventListener('joint-mouseover', (e) => {
    const j = document.querySelector(`li[joint-name='${ e.detail }']`);
    if (j) j.setAttribute('robot-hovered', true);
});

viewer.addEventListener('joint-mouseout', (e) => {
    const j = document.querySelector(`li[joint-name='${ e.detail }']`);
    if (j) j.removeAttribute('robot-hovered');
});

let originalNoAutoRecenter;
viewer.addEventListener('manipulate-start', (e) => {
    const j = document.querySelector(`li[joint-name='${ e.detail }']`);
    if (j) {
        j.scrollIntoView({ block: 'nearest' });
        window.scrollTo(0, 0);
    }

    originalNoAutoRecenter = viewer.noAutoRecenter;
    viewer.noAutoRecenter = true;
});

viewer.addEventListener('manipulate-end', (e) => {
    viewer.noAutoRecenter = originalNoAutoRecenter;
});

document.addEventListener('WebComponentsReady', () => {
    viewer.loadMeshFunc = (path, manager, done) => {
        const ext = path.split(/\./g).pop().toLowerCase();
        switch (ext) {

            case 'gltf':
            case 'glb':
                new GLTFLoader(manager).load(
                    path,
                    (result) => done(result.scene),
                    null,
                    (err) => done(null, err),
                );
                break;
            case 'obj':
                new OBJLoader(manager).load(
                    path,
                    (result) => done(result),
                    null,
                    (err) => done(null, err),
                );
                break;
            case 'dae':
                new ColladaLoader(manager).load(
                    path,
                    (result) => done(result.scene),
                    null,
                    (err) => done(null, err),
                );
                break;
            case 'stl':
                new STLLoader(manager).load(
                    path,
                    (result) => {
                        const material = new THREE.MeshPhongMaterial();
                        const mesh = new THREE.Mesh(result, material);
                        done(mesh);
                    },
                    null,
                    (err) => done(null, err),
                );
                break;

        }
    };

    document.querySelector('li[urdf]').dispatchEvent(new Event('click'));

    if (/javascript\/example\/bundle/i.test(window.location)) {
        viewer.package = '../../../urdf';
    }

    registerDragEvents(viewer, () => {
        setColor('#263238');
        // animToggle.classList.remove('checked');
        animationControl.uncheck();
        updateList();
    });
});

const updateAnymal = () => {
    if (!viewer.setJointValue) return;
    const current = getCurrentMovementTime();
    const names = Object.keys(globalVariables.nameObsMap);

    for (const robotNum of movementContainer.robotNums) {
        if (!movementContainer.hasMovement(robotNum)) continue;
        const movement = movementContainer.getMovement(robotNum);
        var mov = movement[current];
        if (mov === undefined) {
            globalTimer.stop();
            for (let i = 0; i < names.length; i++) {
                viewer.setJointValue(robotNum, names[i], 0);
            }
            return;
        }
        for (let i = 0; i < names.length; i++) {
            viewer.setJointValue(robotNum, names[i], parseFloat(mov[names[i]]));
        }

        viewer.setRobotPosition(robotNum, {
            x: mov['pos_' + 0],
            y: mov['pos_' + 1],
            z: mov['pos_' + 2],
        });

        viewer.setRobotRotation(robotNum, {
            x: mov['rot_' + 0],
            y: mov['rot_' + 1],
            z: mov['rot_' + 2],
        });
    }
};

const getCurrentMovementTime = () => {
    return globalTimer.getCurrent();
};

function timerD3Update() {
    for (const key in svgList) {
        const svg = svgList[key];
        svg.updatePlotOnTime();
    }
    updateAnymal();
}

const updateLoop = () => {
    if (movementContainer.hasAnyMovement()) {
        if (animationControl.isChecked()) {
            globalTimer.start();
        } else {
            if (!globalTimer.isRunning) {
                globalTimer.setIgnoreFirst(getCurrentMovementTime());
                globalTimer.stop();
            }
        }
    }
    requestAnimationFrame(updateLoop);
};

const updateList = () => {
    document.querySelectorAll('#urdf-options li[urdf]').forEach((el) => {
        el.addEventListener('click', (e) => {
            const urdf = e.target.getAttribute('urdf');
            const color = e.target.getAttribute('color');

            viewer.up = '+Z';
            document.getElementById('up-select').value = viewer.up;
            viewer.urdf = urdf;
            // animToggle.classList.add('checked');
            setColor(color);
        });
    });
};

updateList();

document.addEventListener('WebComponentsReady', () => {
    // stop the animation if user tried to manipulate the model
    viewer.addEventListener('manipulate-start', (e) =>
        // animToggle.classList.remove('checked'),
        animationControl.uncheck(),
    );
    globalTimer.setTimerD3UpdateFunc(timerD3Update);
    // viewer.addEventListener('urdf-processed', (e) => updateAngles());
    updateLoop();
    viewer.camera.position.set(-5.5, 3.5, 5.5);
});
