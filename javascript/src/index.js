/* globals */
import * as THREE from 'three';
import * as d3 from 'd3';
import Papa from 'papaparse';
import { registerDragEvents } from './dragAndDrop.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import URDFManipulator from './urdf-manipulator-element.js';
import globalTimer from './utils/globalTimer.js';
import movementContainer from './utils/movement-container.js';

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
const animToggle = document.getElementById('do-animate');

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

const lineColors = {
    noSelection: '#ddd',
    selection: 'Black',
    checked: '#00796B',
    mouseOver: '#FF5722',
};

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 1 / DEG2RAD;
let sliders = {};
const svgList = {};
const checkedObs = [];
const checkedRobots = [];

let movementIndexStart = 0;
let movementMinLen = Number.MAX_SAFE_INTEGER;

let groupByRobot = true;
let mouseOverObs = null;

const nameObsMap = {
    LF_HAA: 'LF_HAA',
    LF_HFE: 'LF_HFE',
    LF_KFE: 'LF_KFE',
    RF_HAA: 'RF_HAA',
    RF_HFE: 'RF_HFE',
    RF_KFE: 'RF_KFE',
    LH_HAA: 'LH_HAA',
    LH_HFE: 'LH_HFE',
    LH_KFE: 'LH_KFE',
    RH_HAA: 'RH_HAA',
    RH_HFE: 'RH_HFE',
    RH_KFE: 'RH_KFE',
};
const positionMap = {
    POS_0: 'pos_0',
    POS_1: 'pos_1',
    POS_2: 'pos_2',
    ROT_0: 'rot_0',
    ROT_1: 'rot_1',
    ROT_2: 'rot_2',
};

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
    mouseOverObs = event.detail;
    if (!globalTimer.isRunning) {
        for (const key in svgList) {
            const svg = svgList[key];
            svg.updatePlotOnTime();
        }
    }
});

viewer.addEventListener('joint-mouseout', (event) => {
    mouseOverObs = null;
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

    for (const key in nameObsMap) {
        // create toggle button
        const toggle = document.createElement('div');
        toggle.className = 'toggle';
        toggle.innerHTML = key;
        toggle.textContent = key;
        toggle.addEventListener('click', () => {
            if (toggle.classList.contains('checked')) {
                toggle.classList.remove('checked');
                // remove from checkedObs
                const index = checkedObs.indexOf(key);
                if (index > -1) {
                    checkedObs.splice(index, 1);
                    updateAllSVG();
                }
                if (svgList[key] !== undefined) {
                    svgList[key].svg.remove();
                }
            } else {
                toggle.classList.add('checked');
                checkedObs.push(key);
                if (groupByRobot === false) {
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
            const index = checkedRobots.indexOf(robotNum);
            if (index > -1) {
                checkedRobots.splice(index, 1);
                updateAllSVG();
            }
            if (svgList[robotNum] !== undefined) {
                svgList[robotNum].svg.remove();
            }
        } else {
            toggle.classList.add('checked');
            checkedRobots.push(robotNum);
            if (groupByRobot === true) {
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
        movementIndexStart = 0;

        console.log('Loaded movement data');
        console.log('Length:' + movementLength);
        console.log('Start index:' + movementIndexStart);

        movementContainer.addMovement(robotNum, movement);

        movementMinLen = Math.min(movementLength, movementMinLen);

        if (!checkedRobots.includes(robotNum)) {
            checkedRobots.push(robotNum);
        }

        if (groupByRobot === true) {
            addRobotSVG(robotNum);
        }
        if (groupByRobot === false) {
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

        for (const rbtnum in movementContainer.robotNums) {
            addRobotSelectToggles(rbtnum);
        }

        if (plotsLinkControlsContainer.childElementCount === 0) {
            if (groupByRobot === true) {
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
    const movement = movementContainer.movementDict[robotNum];
    const svg = new SvgPlotterRobot(movement, robotNum);
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
    const svg = new SvgPlotterObs(obsName);
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
        groupByRobot = true;
        for (const key in checkedRobots) {
            addRobotSVG(checkedRobots[key]);
        }
    } else {
        plotsLinkOptionName.textContent = 'Plot Links:';
        plotsRobotOptionName.textContent = 'Highlight Robots:';
        groupByRobot = false;
        for (const key in checkedObs) {
            addObsSVG(checkedObs[key]);
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
        animToggle.classList.remove('checked');
        updateList();
    });
});

// init 2D UI and animation
// const updateAngles = () => {
//     if (!viewer.setJointValue) return;

//     // reset everything to 0 first
//     const resetJointValues = viewer.angles;
//     for (const name in resetJointValues) resetJointValues[name] = 0;
//     viewer.setJointValues(resetJointValues);

//     // animate the legs
//     const time = Date.now() / 3e2;
//     for (let i = 1; i <= 6; i++) {
//         const offset = (i * Math.PI) / 3;
//         const ratio = Math.max(0, Math.sin(time + offset));

//         viewer.setJointValue(
//             `HP${ i }`,
//             THREE.MathUtils.lerp(30, 0, ratio) * DEG2RAD,
//         );
//         viewer.setJointValue(
//             `KP${ i }`,
//             THREE.MathUtils.lerp(90, 150, ratio) * DEG2RAD,
//         );
//         viewer.setJointValue(
//             `AP${ i }`,
//             THREE.MathUtils.lerp(-30, -60, ratio) * DEG2RAD,
//         );

//         viewer.setJointValue(`TC${ i }A`, THREE.MathUtils.lerp(0, 0.065, ratio));
//         viewer.setJointValue(`TC${ i }B`, THREE.MathUtils.lerp(0, 0.065, ratio));

//         viewer.setJointValue(`W${ i }`, window.performance.now() * 0.001);
//     }
// };

const updateAnymal = () => {
    if (!viewer.setJointValue) return;
    const current = getCurrentMovementTime();
    const names = Object.keys(nameObsMap);

    for (const robotNum in movementContainer.robotNums) {
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

// const updateAnglesAnymal = (movement, robotNum) => {
//     if (!viewer.setJointValue) return;
//     if (!movement) return;
//     // reset everything to 0 first
//     // const resetJointValues = viewer.angles;
//     // for (const name in resetJointValues) resetJointValues[name] = 0;
//     // viewer.setJointValues(resetJointValues);

//     const current = getCurrentMovementTime();
//     const names = Object.keys(nameObsMap);

//     var mov = movement[current];
//     if (mov === undefined) {
//         globalTimer.stop();
//         for (let i = 0; i < names.length; i++) {
//             viewer.setJointValue(robotNum, names[i], 0);
//         }
//         return;
//     }
//     for (let i = 0; i < names.length; i++) {
//         viewer.setJointValue(robotNum, names[i], parseFloat(mov[names[i]]));
//     }
// };

// const updatePositionAnymal = (movement, robotNum) => {
//     if (!movement) return;
//     const current = getCurrentMovementTime();
//     const names = Object.keys(nameObsMap);

//     var mov = movement[current];
//     if (mov === undefined) {
//         globalTimer.stop();
//         return;
//     }
//     viewer.setRobotPosition(robotNum, {
//         x: mov['pos_' + 0],
//         y: mov['pos_' + 1],
//         z: mov['pos_' + 2],
//     });
// };

// const updateRotationAnymal = (movement, robotNum) => {
//     if (!movement) return;
//     const current = getCurrentMovementTime();
//     const names = Object.keys(nameObsMap);

//     var mov = movement[current];
//     if (mov === undefined) {
//         globalTimer.stop();
//         return;
//     }
//     viewer.setRobotRotation(robotNum, {
//         x: mov['rot_' + 0],
//         y: mov['rot_' + 1],
//         z: mov['rot_' + 2],
//     });
// };

const getCurrentMovementTime = () => {
    const current = globalTimer.getCurrent();
    if (current >= movementMinLen) {
        globalTimer.setIgnoreFirst(movementMinLen - 1);
        globalTimer.stop();
        animToggle.classList.remove('checked');
        return movementMinLen - 1;
    }
    return current;
};

function timerD3Update() {
    for (const key in svgList) {
        const svg = svgList[key];
        svg.updatePlotOnTime();
    }
    updateAnymal();
}

function pauseAnimation() {
    globalTimer.setIgnoreFirst(getCurrentMovementTime());
    globalTimer.stop();
}

function startAnimation() {
    globalTimer.start(timerD3Update, 30);
}

const updateLoop = () => {
    if (movementContainer.hasAnyMovement()) {
        if (animToggle.classList.contains('checked')) {
            startAnimation();
        } else {
            if (!globalTimer.isRunning) {
                pauseAnimation();
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
    animToggle.addEventListener('click', () => {
        animToggle.classList.toggle('checked');
    });

    // stop the animation if user tried to manipulate the model
    viewer.addEventListener('manipulate-start', (e) =>
        animToggle.classList.remove('checked'),
    );
    // viewer.addEventListener('urdf-processed', (e) => updateAngles());
    updateLoop();
    viewer.camera.position.set(-5.5, 3.5, 5.5);
});

class SvgPlotterRobot {

    constructor(movement, robotNum) {
        this.movement = movement;
        this.robotNum = robotNum;
        this.width = (95 / 100) * svgContainer.offsetWidth;
        this.height = this.width * 0.5;
        this.marginTop = 20;
        this.marginRight = 20;
        this.marginBottom = 30;
        this.marginLeft = 30;
        this.windowSize = 400;
        this.voronoi = false;

        this.svg = null;
        this.dot = null;
        this.lineX = null;
        this.path = null;
        this.groups = null;
        this.points = [];
        this.brush = null;

        this.all_x = null;
        this.all_y = {};
        this.yScale = null;
        this.xScale = null;
        this.current = null;
        this.currentObs = null;

        this.setup();
    }

    setup() {
        this.svg = d3
            .create('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('viewBox', [0, 0, this.width, this.height])
            .attr(
                'style',
                'max-width: 100%; height: auto; overflow: visible; font: 10px sans-serif;',
            );

        // Add an invisible layer for the interactive tip.
        this.dot = this.svg.append('g').attr('display', 'none');

        this.dot.append('circle').attr('r', 2.5);

        this.dot.append('text').attr('text-anchor', 'middle').attr('y', -8);

        this.lineX = this.svg
            .append('g')
            .append('line')
            .attr('y1', this.height * 0.9)
            .attr('y2', this.height * 0.1)
            .attr('stroke', 'black');

        this.brush = d3
            .brushX()
            .extent([
                [this.marginLeft, this.marginTop],
                [
                    this.width - this.marginRight,
                    this.height - this.marginBottom,
                ],
            ])
            .on('end', (event) => {
                if (event.selection) {
                    let [x0, x1] = event.selection.map(this.xScale.invert);
                    x0 = Math.floor(x0);
                    x1 = Math.ceil(x1);
                    console.log(x0, x1);
                    if (x1 - x0 > 1) {
                        const x = d3.range(x0, x1);
                        this.xScale = d3
                            .scaleLinear()
                            .domain(d3.extent(x))
                            .range([
                                this.marginLeft,
                                this.width - this.marginRight,
                            ]);
                        this.points = [];
                        for (const key in nameObsMap) {
                            this.points = this.points.concat(
                                x.map((d, i) => [
                                    this.xScale(d),
                                    this.yScale(
                                        parseFloat(
                                            this.movement[d][nameObsMap[key]],
                                        ),
                                    ),
                                    key,
                                ]),
                            );
                        }
                        this.drawByX();
                    }
                }
            });

        this.svg.append('g').attr('class', 'brush').call(this.brush);

        this.svg
            .on('pointerenter', (event) => this.pointerentered(event))
            .on('pointermove', (event) => this.pointermoved(event))
            .on('pointerleave', (event) => this.pointerleft(event))
            .on('touchstart', (event) => event.preventDefault())
            .on('dblclick', (event) => this.dblclicked(event))
            .on('click', (event) => this.singleclicked(event));
    }

    pointerentered() {
        // this.path.style('mix-blend-mode', null).style('stroke', '#ddd');
        this.dot.attr('display', null);
    }

    pointermoved(event) {
        if (!globalTimer.isRunning) {
            const [xm, ym] = d3.pointer(event);
            const i = d3.leastIndex(this.points, ([x, y]) =>
                Math.hypot(x - xm, y - ym),
            );
            const [x, y, k] = this.points[i];
            this.currentObs = k;
            const textY = this.yScale.invert(y);
            this.path
                .style('stroke', ({ z }) =>
                    z === k
                        ? lineColors.selection
                        : checkedObs.includes(z)
                            ? lineColors.checked
                            : z === mouseOverObs
                                ? lineColors.mouseOver
                                : lineColors.noSelection,
                )
                .filter(({ z }) => z === k)
                .raise();
            this.dot.attr('transform', `translate(${ x },${ y })`);
            this.dot.select('text').text(textY);
            this.lineX.attr('transform', `translate(${ x },0)`);

            const value = this.yScale.invert(ym);
            this.svg
                .property('value', value)
                .dispatch('input', { bubbles: true });
        } else {
            const [xm, ym] = d3.pointer(event);
            const i = d3.leastIndex(this.points, ([x, y]) =>
                Math.hypot(x - xm, y - ym),
            );
            const [, , k] = this.points[i];
            this.currentObs = k;
        }
    }

    pointerleft() {
        // this.path.style('mix-blend-mode', 'multiply').style('stroke', null);
        this.dot.attr('display', 'none');
        this.svg.node().value = null;
        this.svg.dispatch('input', { bubbles: true });
        this.currentObs = null;
        if (!globalTimer.isRunning) {
            this.updatePlotOnTime();
        }
    }

    dblclicked() {
        if (animToggle.classList.contains('checked')) {
            animToggle.classList.remove('checked');
            pauseAnimation();
        }
        this.current = getCurrentMovementTime();
        this.xScale = d3
            .scaleLinear()
            .domain(d3.extent(this.all_x))
            .range([this.marginLeft, this.width - this.marginRight]);
        this.points = [];
        for (const key in nameObsMap) {
            this.points = this.points.concat(
                this.all_x.map((d, i) => [
                    this.xScale(d),
                    this.yScale(parseFloat(this.movement[d][nameObsMap[key]])),
                    key,
                ]),
            );
        }

        this.drawByX();
    }

    singleclicked(event) {
        if (animToggle.classList.contains('checked')) {
            animToggle.classList.remove('checked');
            pauseAnimation();
        } else {
            animToggle.classList.add('checked');
            // get the click position
            const [xm] = d3.pointer(event);
            console.log(this.xScale.invert(xm));
            const ignoreFirst = Math.floor(
                this.xScale.invert(xm) - movementIndexStart,
            );
            globalTimer.setIgnoreFirst(ignoreFirst);
            startAnimation();
        }
    }

    initMovement() {
        this.all_x = d3.range(this.movement.length - 1);

        // y min and max

        for (const key in nameObsMap) {
            this.all_y[key] = this.movement.map((d) =>
                parseFloat(d[nameObsMap[key]]),
            );
        }
        const yMin = d3.min(Object.values(this.all_y).flat());
        const yMax = d3.max(Object.values(this.all_y).flat());

        this.yScale = d3
            .scaleLinear()
            .domain([yMin, yMax])
            .range([this.height - this.marginBottom, this.marginTop]);
        // Add the vertical axis.
        this.svg
            .append('g')
            .attr('transform', `translate(${ this.marginLeft },0)`)
            .attr('class', 'yaxis')
            .call(d3.axisLeft(this.yScale))
            .call((g) => g.select('.domain').remove())
            .call((g) =>
                g
                    .selectAll('.tick line')
                    .attr('stroke', 'black')
                    .attr('stroke-width', 0.5),
            )
            .call(
                this.voronoi
                    ? () => {}
                    : (g) =>
                        g
                            .selectAll('.tick line')
                            .clone()
                            .attr(
                                'x2',
                                this.width -
                                      this.marginLeft -
                                      this.marginRight,
                            )
                            .attr('stroke-opacity', 0.1),
            )
            .call((g) =>
                g
                    .append('text')
                    .attr('x', -this.marginLeft)
                    .attr('y', 10)
                    .attr('fill', 'black')
                    .attr('text-anchor', 'start')
                    .text('Robot ' + this.robotNum),
            )
            .call((g) => g.selectAll('.tick text').attr('fill', 'black'));
    }

    updatePlotOnTime() {
        if (this.movement !== null) {
            this.current = getCurrentMovementTime();
            if (this.current >= this.movement.length) {
                globalTimer.stop();
            }
            if (this.current >= 0 && this.current < this.movement.length) {
                if (this.all_x === null) {
                    this.initMovement();
                }

                // slice the window for the current time
                const x = this.all_x.slice(
                    Math.max(0, this.current - this.windowSize / 2),
                    Math.min(
                        this.movement.length,
                        this.current + this.windowSize / 2,
                    ),
                );

                this.xScale = d3
                    .scaleLinear()
                    .domain(d3.extent(x))
                    .range([this.marginLeft, this.width - this.marginRight]);

                // Compute the points in pixel space as [x, y, z], where z is the name of the series.
                this.points = [];
                for (const key in nameObsMap) {
                    this.points = this.points.concat(
                        x.map((d, i) => [
                            this.xScale(d),
                            this.yScale(
                                parseFloat(this.movement[d][nameObsMap[key]]),
                            ),
                            key,
                        ]),
                    );
                }
                this.drawByX();
            }
        }
    }

    drawByX() {
        // remove
        this.svg.selectAll('.plotline').remove();
        this.svg.selectAll('.xaxis').remove();

        // Add the horizontal axis.
        this.svg
            .append('g')
            .attr(
                'transform',
                `translate(0,${ this.height - this.marginBottom })`,
            )
            .attr('class', 'xaxis')
            .call(
                d3
                    .axisBottom(this.xScale)
                    .ticks(this.width / 80)
                    .tickSizeOuter(0),
            )
            .call((g) =>
                g
                    .selectAll('.tick line')
                    .attr('stroke', 'black')
                    .attr('stroke-width', 0.5),
            )
            .call((g) =>
                g
                    .select('.domain')
                    .attr('stroke', 'black')
                    .attr('stroke-width', 0.5),
            )
            .call((g) => g.selectAll('.tick text').attr('fill', 'black'));

        this.groups = d3.rollup(
            this.points,
            (v) => Object.assign(v, { z: v[0][2] }),
            (d) => d[2],
        );

        // Add the lines.
        this.path = this.svg
            .append('g')
            .attr('class', 'plotline')
            .attr('fill', 'none')
            .attr('stroke-width', 1.5)
            .selectAll('path')
            .data(this.groups.values())
            .join('path')
            .style('mix-blend-mode', 'multiply')
            .attr(
                'd',
                d3
                    .line()
                    .x((d) => d[0])
                    .y((d) => d[1]),
            );
        // keys in checkedObs are blue, others are grey
        this.path
            .style('stroke', ({ z }) =>
                checkedObs.includes(z)
                    ? lineColors.checked
                    : z === this.currentObs
                        ? lineColors.selection
                        : z === mouseOverObs
                            ? lineColors.mouseOver
                            : lineColors.noSelection,
            )
            .filter(({ z }) => checkedObs.includes(z))
            .raise();

        // update the vertical line and the dot
        const a = this.xScale(this.current);
        this.lineX
            .attr('transform', `translate(${ a },0)`)
            // .attr('stroke', '#ddd');
            .attr('stroke', 'black');

        if (this.currentObs !== null) {
            const textY = parseFloat(
                this.movement[this.current][this.currentObs],
            );
            const y = this.yScale(textY);
            this.dot.attr('transform', `translate(${ a },${ y })`);
            this.dot.select('text').text(textY);
        }

        // remove the brush after drawing
        this.svg.select('.brush').call(this.brush.move, null);
    }

}

class SvgPlotterObs {

    constructor(obsName) {
        this.obsName = obsName; // key in nameObsMap
        this.width = (95 / 100) * svgContainer.offsetWidth;
        this.height = this.width * 0.5;
        this.marginTop = 20;
        this.marginRight = 20;
        this.marginBottom = 30;
        this.marginLeft = 30;
        this.windowSize = 400;
        this.voronoi = false;

        this.svg = null;
        this.dot = null;
        this.lineX = null;
        this.path = null;
        this.groups = null;
        this.points = [];
        this.brush = null;

        this.all_x = null;
        this.all_y = {};
        this.yScale = null;
        this.xScale = null;
        this.current = null;
        this.currentMov = null;

        this.setup();
    }

    setup() {
        this.svg = d3
            .create('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('viewBox', [0, 0, this.width, this.height])
            .attr(
                'style',
                'max-width: 100%; height: auto; overflow: visible; font: 10px sans-serif;',
            );

        // Add an invisible layer for the interactive tip.
        this.dot = this.svg.append('g').attr('display', 'none');

        this.dot.append('circle').attr('r', 2.5);

        this.dot.append('text').attr('text-anchor', 'middle').attr('y', -8);

        this.lineX = this.svg
            .append('g')
            .append('line')
            .attr('y1', this.height * 0.9)
            .attr('y2', this.height * 0.1)
            .attr('stroke', 'black');

        this.brush = d3
            .brushX()
            .extent([
                [this.marginLeft, this.marginTop],
                [
                    this.width - this.marginRight,
                    this.height - this.marginBottom,
                ],
            ])
            .on('end', (event) => {
                if (event.selection) {
                    let [x0, x1] = event.selection.map(this.xScale.invert);
                    x0 = Math.floor(x0);
                    x1 = Math.ceil(x1);
                    console.log(x0, x1);
                    if (x1 - x0 > 1) {
                        const x = d3.range(x0, x1);
                        this.xScale = d3
                            .scaleLinear()
                            .domain(d3.extent(x))
                            .range([
                                this.marginLeft,
                                this.width - this.marginRight,
                            ]);
                        this.points = [];
                        for (const key in movementContainer.robotNums) {
                            const movement = movementContainer.getMovement(key);
                            this.points = this.points.concat(
                                x.map((d, i) => [
                                    this.xScale(d),
                                    this.yScale(
                                        parseFloat(
                                            movement[d][
                                                nameObsMap[this.obsName]
                                            ],
                                        ),
                                    ),
                                    key,
                                ]),
                            );
                        }
                        this.drawByX();
                    }
                }
            });

        this.svg.append('g').attr('class', 'brush').call(this.brush);

        this.svg
            .on('pointerenter', (event) => this.pointerentered(event))
            .on('pointermove', (event) => this.pointermoved(event))
            .on('pointerleave', (event) => this.pointerleft(event))
            .on('touchstart', (event) => event.preventDefault())
            .on('dblclick', (event) => this.dblclicked(event))
            .on('click', (event) => this.singleclicked(event));
    }

    pointerentered() {
        // this.path.style('mix-blend-mode', null).style('stroke', '#ddd');
        this.dot.attr('display', null);
    }

    pointermoved(event) {
        if (!globalTimer.isRunning) {
            const [xm, ym] = d3.pointer(event);
            const i = d3.leastIndex(this.points, ([x, y]) =>
                Math.hypot(x - xm, y - ym),
            );
            const [x, y, k] = this.points[i];
            this.currentMov = k;
            const textY = this.yScale.invert(y);
            this.path
                .style('stroke', ({ z }) =>
                    checkedRobots.includes(z)
                        ? lineColors.checked
                        : z === this.currentMov
                            ? lineColors.selection
                            : lineColors.noSelection,
                )
                .filter(({ z }) => z === k)
                .raise();
            this.dot.attr('transform', `translate(${ x },${ y })`);
            this.dot.select('text').text(textY);
            this.lineX.attr('transform', `translate(${ x },0)`);

            const value = this.yScale.invert(ym);
            this.svg
                .property('value', value)
                .dispatch('input', { bubbles: true });
        } else {
            const [xm, ym] = d3.pointer(event);
            const i = d3.leastIndex(this.points, ([x, y]) =>
                Math.hypot(x - xm, y - ym),
            );
            const [, , k] = this.points[i];
            this.currentMov = k;
        }
    }

    pointerleft() {
        // this.path.style('mix-blend-mode', 'multiply').style('stroke', null);
        this.dot.attr('display', 'none');
        this.svg.node().value = null;
        this.svg.dispatch('input', { bubbles: true });
        this.currentMov = null;
        if (!globalTimer.isRunning) {
            this.updatePlotOnTime();
        }
    }

    dblclicked() {
        if (animToggle.classList.contains('checked')) {
            animToggle.classList.remove('checked');
            pauseAnimation();
        }
        this.current = getCurrentMovementTime();
        this.xScale = d3
            .scaleLinear()
            .domain(d3.extent(this.all_x))
            .range([this.marginLeft, this.width - this.marginRight]);
        this.points = [];
        for (const key in movementContainer.robotNums) {
            const movement = movementContainer.getMovement(key);
            this.points = this.points.concat(
                this.all_x.map((d, i) => [
                    this.xScale(d),
                    this.yScale(
                        parseFloat(movement[d][nameObsMap[this.obsName]]),
                    ),
                    key,
                ]),
            );
        }

        this.drawByX();
    }

    singleclicked(event) {
        if (animToggle.classList.contains('checked')) {
            animToggle.classList.remove('checked');
            pauseAnimation();
        } else {
            animToggle.classList.add('checked');
            // get the click position
            const [xm] = d3.pointer(event);
            console.log(this.xScale.invert(xm));
            const ignoreFirst = Math.floor(
                this.xScale.invert(xm) - movementIndexStart,
            );
            globalTimer.setIgnoreFirst(ignoreFirst);
            startAnimation();
        }
    }

    initMovement() {
        this.all_x = d3.range(movementMinLen - 1);
        // y min and max
        // if (movement1 !== null) {
        //     this.all_y[1] = movement1.map((d) =>
        //         parseFloat(d[nameObsMap[this.obsName]]),
        //     );
        // }
        // if (movement2 !== null) {
        //     this.all_y[2] = movement2.map((d) =>
        //         parseFloat(d[nameObsMap[this.obsName]]),
        //     );
        // }
        // if (movement3 !== null) {
        //     this.all_y[3] = movement3.map((d) =>
        //         parseFloat(d[nameObsMap[this.obsName]]),
        //     );
        // }

        for (const rbtnum in movementContainer.robotNums) {
            const movement = movementContainer.getMovement(rbtnum);
            this.all_y[rbtnum] = movement.map((d) =>
                parseFloat(d[nameObsMap[this.obsName]]),
            );
        }

        const yMin = d3.min(Object.values(this.all_y).flat());
        const yMax = d3.max(Object.values(this.all_y).flat());

        // remove old axis
        this.svg.selectAll('.yaxis').remove();
        // update the y scale
        this.yScale = d3
            .scaleLinear()
            .domain([yMin, yMax])
            .range([this.height - this.marginBottom, this.marginTop]);
        // Add the vertical axis.
        this.svg
            .append('g')
            .attr('transform', `translate(${ this.marginLeft },0)`)
            .attr('class', 'yaxis')
            .call(d3.axisLeft(this.yScale))
            .call((g) => g.select('.domain').remove())
            .call((g) =>
                g
                    .selectAll('.tick line')
                    .attr('stroke', 'black')
                    .attr('stroke-width', 0.5),
            )
            .call(
                this.voronoi
                    ? () => {}
                    : (g) =>
                        g
                            .selectAll('.tick line')
                            .clone()
                            .attr(
                                'x2',
                                this.width -
                                      this.marginLeft -
                                      this.marginRight,
                            )
                            .attr('stroke-opacity', 0.1),
            )
            .call((g) =>
                g
                    .append('text')
                    .attr('x', -this.marginLeft)
                    .attr('y', 10)
                    .attr('text-anchor', 'start')
                    .attr('fill', 'black')
                    .text(this.obsName),
            )
            .call((g) => g.selectAll('.tick text').attr('fill', 'black'));
    }

    updatePlotOnTime() {
        this.current = getCurrentMovementTime();
        if (this.current >= movementMinLen) {
            globalTimer.stop();
        }
        if (this.current >= 0 && this.current < movementMinLen) {
            if (this.all_x === null) {
                this.initMovement();
            }

            // slice the window for the current time
            const x = this.all_x.slice(
                Math.max(0, this.current - this.windowSize / 2),
                Math.min(movementMinLen, this.current + this.windowSize / 2),
            );

            this.xScale = d3
                .scaleLinear()
                .domain(d3.extent(x))
                .range([this.marginLeft, this.width - this.marginRight]);

            // Compute the points in pixel space as [x, y, z], where z is the name of the series.
            this.points = [];
            for (const key in movementContainer.robotNums) {
                const movement = movementContainer.getMovement(key);
                this.points = this.points.concat(
                    x.map((d, i) => [
                        this.xScale(d),
                        this.yScale(
                            parseFloat(movement[d][nameObsMap[this.obsName]]),
                        ),
                        key,
                    ]),
                );
            }
            this.drawByX();
        }
    }

    drawByX() {
        // remove
        this.svg.selectAll('.plotline').remove();
        this.svg.selectAll('.xaxis').remove();

        // Add the horizontal axis.
        this.svg
            .append('g')
            .attr(
                'transform',
                `translate(0,${ this.height - this.marginBottom })`,
            )
            .attr('class', 'xaxis')
            .call(
                d3
                    .axisBottom(this.xScale)
                    .ticks(this.width / 80)
                    .tickSizeOuter(0),
            )
            .call((g) =>
                g
                    .selectAll('.tick line')
                    .attr('stroke', 'black')
                    .attr('stroke-width', 0.5),
            )
            .call((g) =>
                g
                    .select('.domain')
                    .attr('stroke', 'black')
                    .attr('stroke-width', 0.5),
            )
            .call((g) => g.selectAll('.tick text').attr('fill', 'black'));

        this.groups = d3.rollup(
            this.points,
            (v) => Object.assign(v, { z: v[0][2] }),
            (d) => d[2],
        );

        // Add the lines.
        this.path = this.svg
            .append('g')
            .attr('class', 'plotline')
            .attr('fill', 'none')
            .attr('stroke-width', 1.5)
            .selectAll('path')
            .data(this.groups.values())
            .join('path')
            .style('mix-blend-mode', 'multiply')
            .attr(
                'd',
                d3
                    .line()
                    .x((d) => d[0])
                    .y((d) => d[1]),
            );

        this.path
            .style('stroke', ({ z }) =>
                checkedRobots.includes(z)
                    ? lineColors.checked
                    : z === this.currentMov
                        ? lineColors.selection
                        : lineColors.noSelection,
            )
            .filter(({ z }) => z === this.currentMov)
            .raise();

        // update the vertical line and the dot
        const a = this.xScale(this.current);
        this.lineX
            .attr('transform', `translate(${ a },0)`)
            .attr('stroke', 'black');

        if (this.currentMov !== null) {
            const mov = movementContainer.getMovement(this.currentMov);
            const textY = parseFloat(
                mov[this.current][nameObsMap[this.obsName]],
            );
            const y = this.yScale(textY);
            this.dot.attr('transform', `translate(${ a },${ y })`);
            this.dot.select('text').text(textY);
        }

        // remove the brush after drawing
        this.svg.select('.brush').call(this.brush.move, null);
    }

}
