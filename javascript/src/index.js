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
import SmallLineChartObs from './utils/small-svg/small-linechart-obs.js';
import SmallLineChartRobot from './utils/small-svg/small-linechart-robot.js';
import SmallHeatmapRobot from './utils/small-svg/small-heatmap-robot.js';
import SmallHeatMapObs from './utils/small-svg/small-heatmap-obs.js';
import GlobalHeatmapRobot from './utils/global-svg/global-heatmap-robot.js';
import GlobalLineChartRobot from './utils/global-svg/global-linechart-robot.js';
import GlobalLineChartObs from './utils/global-svg/global-linechart-obs.js';
import GlobalHeatmapObs from './utils/global-svg/global-heatmap-obs.js';
import SnapShotDiv from './utils/snap-shot.js';

import animationControl from './utils/animation-control.js';
import globalVariables from './utils/global-variables.js';

customElements.define('urdf-viewer', URDFManipulator);

// declare these globally for the sake of the example.
// Hack to make the build work with webpack for now.
// TODO: Remove this once modules or parcel is being used
const viewer = document.querySelector('urdf-viewer');

// const limitsToggle = document.getElementById('ignore-joint-limits');
const collisionToggle = document.getElementById('collision-toggle');
const showGridTextureToggle = document.getElementById('show-grid-texture-toggle');
const wireframeToggle = document.getElementById('wireframe-toggle');
const snapShotButton = document.getElementById('snap-shot-button');
const snapShotImg = document.getElementById('snap-shot-img');
// const radiansToggle = document.getElementById('radians-toggle');
// const autocenterToggle = document.getElementById('autocenter-toggle');
const upSelect = document.getElementById('up-select');
// const sliderList = document.querySelector('#controls ul');
const controlsel = document.getElementById('controls');
const controlsToggle = document.getElementById('toggle-controls');

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

const robotControlContainer = document.getElementById(
    'robot-control-container',
);
const addRobotButton = document.getElementById('add-robot-button');

const globalHeatmapContainer = document.getElementById(
    'golbal-heatmap-container',
);
const globalHeatmapSelection = document.getElementById(
    'global-heatmap-selection',
);

const onlyObsSelect = document.getElementById('only-obs-select');

// const DEG2RAD = Math.PI / 180;
// const RAD2DEG = 1 / DEG2RAD;
let sliders = {};
const svgList = {};
let globalHeatmapSvg = null;

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
// limitsToggle.addEventListener('click', () => {
//     limitsToggle.classList.toggle('checked');
//     viewer.ignoreLimits = limitsToggle.classList.contains('checked');
// });

// radiansToggle.addEventListener('click', () => {
//     radiansToggle.classList.toggle('checked');
//     Object.values(sliders).forEach((sl) => sl.update());
// });

collisionToggle.addEventListener('click', () => {
    collisionToggle.classList.toggle('checked');
    viewer.showCollision = collisionToggle.classList.contains('checked');
});

showGridTextureToggle.addEventListener('click', () => {
    showGridTextureToggle.classList.toggle('checked');
    viewer.showMeshPlane(showGridTextureToggle.classList.contains('checked'));
});

wireframeToggle.addEventListener('click', () => {
    wireframeToggle.classList.toggle('checked');
    viewer.changeWireframe(wireframeToggle.classList.contains('checked'));
});

// autocenterToggle.addEventListener('click', () => {
//     autocenterToggle.classList.toggle('checked');
//     viewer.noAutoRecenter = !autocenterToggle.classList.contains('checked');
// });

togglePlotsControls.addEventListener('click', () => {
    plotsControls.classList.toggle('hidden');
});

snapShotButton.addEventListener('click', () => {
    const img = viewer.snapShot();
    while (snapShotImg.firstChild) snapShotImg.removeChild(snapShotImg.firstChild);
    const snapShot = new SnapShotDiv(img, globalTimer.getCurrent());
    snapShotImg.appendChild(snapShot.snapShotDiv);
});

globalHeatmapSelection.addEventListener('change', (e) => {
    // if no option
    if (globalHeatmapSelection.options.length === 0) {
        while (globalHeatmapContainer.firstChild) {
            globalHeatmapContainer.removeChild(
                globalHeatmapContainer.firstChild,
            );
            globalHeatmapSvg = null;
        }
        return;
    }
    if (globalVariables.groupByRobot) {
        const robotNum = parseInt(e.target.value);
        changeGlobalPlot(robotNum);
    } else {
        const obsName = e.target.value;
        changeGlobalPlot(obsName);
    }
});

addRobotButton.addEventListener('click', () => {
    createRobotControls(globalVariables.addedRobotCount);
    viewer.addOneRobot(globalVariables.addedRobotCount, [
        0,
        globalVariables.addedRobotCount,
        0,
    ]);
    globalVariables.addedRobotCount += 1;
});

viewer.addEventListener('joint-mouseover', (event) => {
    globalVariables.mouseOverObs = event.detail;
    if (!globalTimer.isRunning) {
        updateAllSVG();
    }
});

viewer.addEventListener('joint-mouseout', (event) => {
    globalVariables.mouseOverObs = null;
    if (!globalTimer.isRunning) {
        updateAllSVG();
    }
});

function createRobotControls(robotNumber) {
    // Create a container div
    const container = document.createElement('div');
    container.id = `input-container-${ robotNumber }`;
    container.className = 'input-container';

    // Create the inner HTML
    container.innerHTML = `
    <div class="title-name">
        Robot ${ robotNumber }
    </div>
    <div id="robot${ robotNumber }-controls" class="robot-controls hidden">
        <div id="robot${ robotNumber }-toggle-controls" class="toggle-robot-controls"></div>
        <div>
            <label for="load-movement${ robotNumber }"  class="beautiful-label">
                Load Movement
            </label>
            <input type="file" id="load-movement${ robotNumber }" class="load-movement-input" accept=".csv"/> 
        </div>    
        <button id="robot${ robotNumber }-delete" class="beautful-button">Delete</button>
        <div id="robot${ robotNumber }-visible" class="toggle checked robot-control">Visible</div>
        <div id="robot${ robotNumber }-highlight" class="toggle robot-control">Highlight</div>
        <div id="robot${ robotNumber }-position" class="toggle robot-control">Update Pos.</div>
        <div class="init-position">
            Init Pos. (
            <input id="robot${ robotNumber }-positionx" type="number" class="position-input" value="0" step="0.1"/>, 
            <input id="robot${ robotNumber }-positiony" type="number" class="position-input" value="${ robotNumber }" step="0.1"/>, 
            <input id="robot${ robotNumber }-positionz" type="number" class="position-input" value="0" step="0.1"/>
            )
        </div>
        <div id="robot${ robotNumber }-file-name" style="font-size:12px;padding-top: 2px;"> </div>
    </div>
    `;

    robotControlContainer.appendChild(container);
    // disable some controls before urdf is loaded
    animationControl.uncheck();
    addRobotButton.disabled = true;

    // one time event listener
    viewer.addEventListener('urdf-processed', function handler(event) {
        addListenerToNewRobot(robotNumber);
        for (const rbtnum of viewer.robotNames) {
            initRobotControlState(rbtnum);
        }
        addRobotButton.disabled = false;
        // remove the event listener
        viewer.removeEventListener('urdf-processed', handler);
    });
}

const addNewRobotOptionToGlobalHeatmapSelection = (robotNum) => {
    // if already exists, return
    if (globalHeatmapSelection.querySelector(`option[value='${ robotNum }']`)) {
        return;
    }
    const option = document.createElement('option');
    option.value = robotNum;
    option.textContent = `Robot ${ robotNum }`;
    globalHeatmapSelection.appendChild(option);
};

const addNewObsOptionToGlobalHeatmapSelection = (obsName) => {
    // if already exists, return
    if (globalHeatmapSelection.querySelector(`option[value='${ obsName }']`)) {
        return;
    }
    const option = document.createElement('option');
    option.value = obsName;
    option.textContent = obsName;
    globalHeatmapSelection.appendChild(option);
};

const initRobotControlState = (robotNumber) => {
    const toggleVisibility = document.getElementById(
        `robot${ robotNumber }-visible`,
    );
    const toggleHightlight = document.getElementById(
        `robot${ robotNumber }-highlight`,
    );
    const toggleMovement = document.getElementById(
        `robot${ robotNumber }-position`,
    );

    const visibility = toggleVisibility.classList.contains('checked');
    viewer.setRobotVisibility(robotNumber, visibility);
    const highlight = toggleHightlight.classList.contains('checked');
    viewer.setRobotHighlight(robotNumber, highlight);
    const standStill = !toggleMovement.classList.contains('checked');
    viewer.setRobotStandStill(robotNumber, standStill);
};

const addListenerToNewRobot = (robotNumber) => {
    const robotControlsToggle = document.getElementById(
        `robot${ robotNumber }-toggle-controls`,
    );
    const robotControls = document.getElementById(
        `robot${ robotNumber }-controls`,
    );
    const toggleVisibility = document.getElementById(
        `robot${ robotNumber }-visible`,
    );
    const toggleHightlight = document.getElementById(
        `robot${ robotNumber }-highlight`,
    );
    const toggleMovement = document.getElementById(
        `robot${ robotNumber }-position`,
    );
    const loadMovement = document.getElementById(`load-movement${ robotNumber }`);
    const initialPosition = {
        x: document.getElementById(`robot${ robotNumber }-positionx`),
        y: document.getElementById(`robot${ robotNumber }-positiony`),
        z: document.getElementById(`robot${ robotNumber }-positionz`),
    };
    const deleteButton = document.getElementById(`robot${ robotNumber }-delete`);

    robotControlsToggle.addEventListener('click', () => {
        robotControls.classList.toggle('hidden');
    });
    loadMovement.addEventListener('change', () =>
        loadMovementFromCSV(robotNumber),
    );
    toggleVisibility.addEventListener('click', () => {
        toggleVisibility.classList.toggle('checked');
        if (toggleVisibility.classList.contains('checked')) {
            viewer.setRobotVisibility(robotNumber, true);
        } else {
            viewer.setRobotVisibility(robotNumber, false);
        }
    });

    toggleHightlight.addEventListener('click', () => {
        toggleHightlight.classList.toggle('checked');
        if (toggleHightlight.classList.contains('checked')) {
            viewer.setRobotHighlight(robotNumber, true);
        } else {
            viewer.setRobotHighlight(robotNumber, false);
        }
    });
    toggleMovement.addEventListener('click', () => {
        toggleMovement.classList.toggle('checked');
        if (toggleMovement.classList.contains('checked')) {
            viewer.setRobotStandStill(robotNumber, false);
        } else {
            viewer.setRobotStandStill(robotNumber, true);
        }
    });

    deleteButton.addEventListener('click', () => {
        // remove the movement data
        movementContainer.removeMovement(robotNumber);

        // remove from viewer
        viewer.deleteOne(robotNumber);
        const container = document.getElementById(
            'input-container-' + robotNumber,
        );
        container.remove();

        // remove from checkedRobots
        const index = globalVariables.checkedRobots.indexOf(robotNumber);
        if (index > -1) {
            globalVariables.checkedRobots.splice(index, 1);
        }

        // For the global heatmap
        // remove from global heatmap selection
        if (globalVariables.groupByRobot) {
            const option = document.querySelector(
                `#global-heatmap-selection option[value='${ robotNumber }']`,
            );
            option.remove();
        }

        // reset global heatmap selection
        if (globalHeatmapSelection.options.length === 0) {
            while (globalHeatmapContainer.firstChild) {
                globalHeatmapContainer.removeChild(
                    globalHeatmapContainer.firstChild,
                );
                globalHeatmapSvg = null;
            }
        } else {
            const selectedOption = globalHeatmapSelection.options[0];
            globalHeatmapSelection.value = selectedOption.value;
            // changeGlobalPlot(selectedOption.value);
        }

        // For right plot part
        // remove from svg container
        removeRobotSelectToggles(robotNumber);
        // remove from svgList
        delete svgList[robotNumber];
        plotsSVGRedraw();
    });

    Object.values(initialPosition).forEach((input, index) => {
        // init values
        input.value = viewer.getRobotInitPosition(robotNumber, index);
        input.addEventListener('change', () => {
            const position = parseFloat(input.value);
            viewer.setRobotInitPosition(robotNumber, index, position);
        });
    });
};

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
                plotsSVGRedraw();
            }
        });
        plotsLinkControlsContainer.appendChild(toggle);
    }
};

const addRobotSelectToggles = (robotNum) => {
    const toggle = document.createElement('div');
    toggle.id = 'plot-svg-toggle-robot' + robotNum;
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
            plotsSVGRedraw();
        }
    });

    plotsRobotControlsContainer.appendChild(toggle);
};

const removeRobotSelectToggles = (robotNum) => {
    const toggle = document.getElementById('plot-svg-toggle-robot' + robotNum);
    toggle.remove();
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

        globalVariables.movementMinLen = movementLength;
        for (const key in movementContainer.movementDict) {
            globalVariables.movementMinLen = Math.min(
                globalVariables.movementMinLen,
                movementContainer.movementDict[key].length,
            );
        }

        if (!globalVariables.checkedRobots.includes(robotNum)) {
            globalVariables.checkedRobots.push(robotNum);
        }

        while (plotsRobotControlsContainer.firstChild) {
            plotsRobotControlsContainer.removeChild(
                plotsRobotControlsContainer.firstChild,
            );
        }

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

        // add new robot option to global heatmap selection
        if (globalVariables.groupByRobot) {
            addNewRobotOptionToGlobalHeatmapSelection(robotNum);
        }

        // update the svg
        plotsSVGRedraw();

        const fileName = file.name;
        const fileNameDiv = document.getElementById(
            'robot' + robotNum + '-file-name',
        );
        fileNameDiv.textContent = fileName;
    };
    reader.readAsText(file);
};

const addRobotSVG = (robotNum) => {
    if (svgList[robotNum] !== undefined) {
        svgList[robotNum].svg.remove();
    }
    // const movement = movementContainer.movementDict[robotNum];
    const svg = new SmallLineChartRobot(robotNum, svgContainer.offsetWidth);
    const svgNode = svg.svg.node();
    svgNode.id = 'plot-all' + robotNum;
    svgContainer.appendChild(svgNode);
    svgList[robotNum] = svg;
    svg.updatePlotOnTime();
};

const addHeatMapRobotSVG = (robotNum) => {
    if (svgList[robotNum] !== undefined) {
        svgList[robotNum].svg.remove();
    }
    const svg = new SmallHeatmapRobot(robotNum, globalVariables.smallHeatMapGridNum, svgContainer.offsetWidth);
    const svgNode = svg.svg.node();
    svgNode.id = 'heatmap-' + robotNum;
    svgContainer.appendChild(svgNode);
    svgList[robotNum] = svg;
    svg.updatePlotOnTime();
};

const changeGlobalPlotToHeatmapRobot = (robotNum) => {
    while (globalHeatmapContainer.firstChild) {
        globalHeatmapContainer.removeChild(globalHeatmapContainer.firstChild);
        globalHeatmapSvg = null;
    }

    const svg = new GlobalHeatmapRobot(
        robotNum,
        globalVariables.globalHeatMapGridNum,
        globalHeatmapContainer.offsetWidth,
        window.innerHeight * 0.2,
    );
    const svgNode = svg.svg.node();
    globalHeatmapSvg = svg;
    globalHeatmapContainer.appendChild(svgNode);
};

const changeGlobalPlotToLineRobot = (robotNum) => {
    while (globalHeatmapContainer.firstChild) {
        globalHeatmapContainer.removeChild(globalHeatmapContainer.firstChild);
        globalHeatmapSvg = null;
    }
    const svg = new GlobalLineChartRobot(
        robotNum,
        globalHeatmapContainer.offsetWidth,
        window.innerHeight * 0.2,
    );
    const svgNode = svg.svg.node();
    globalHeatmapSvg = svg;
    globalHeatmapContainer.appendChild(svgNode);
};

const changeGlobalPlotToHeatmapObs = (obsName) => {
    while (globalHeatmapContainer.firstChild) {
        globalHeatmapContainer.removeChild(globalHeatmapContainer.firstChild);
        globalHeatmapSvg = null;
    }
    const svg = new GlobalHeatmapObs(
        obsName,
        globalVariables.globalHeatMapGridNum,
        globalHeatmapContainer.offsetWidth,
        window.innerHeight * 0.2,
    );
    const svgNode = svg.svg.node();
    globalHeatmapSvg = svg;
    globalHeatmapContainer.appendChild(svgNode);
};

const changeGlobalPlotToLineObs = (obsName) => {
    while (globalHeatmapContainer.firstChild) {
        globalHeatmapContainer.removeChild(globalHeatmapContainer.firstChild);
        globalHeatmapSvg = null;
    }
    const svg = new GlobalLineChartObs(
        obsName,
        globalHeatmapContainer.offsetWidth,
        window.innerHeight * 0.2,
    );
    const svgNode = svg.svg.node();
    globalHeatmapSvg = svg;
    globalHeatmapContainer.appendChild(svgNode);
};

const changeGlobalPlot = (num, type = null) => {
    if (type === null) {
        type = plotsGroupSelection.value;
    }
    if (type === 'HeatMapRobot') {
        changeGlobalPlotToHeatmapRobot(num);
    } else if (type === 'LineRobot') {
        changeGlobalPlotToLineRobot(num);
    } else if (type === 'HeatMapLink') {
        changeGlobalPlotToHeatmapObs(num);
    } else if (type === 'LineLink') {
        changeGlobalPlotToLineObs(num);
    }
};

const addObsSVG = (obsName) => {
    if (svgList[obsName] !== undefined) {
        svgList[obsName].svg.remove();
    }
    const svg = new SmallLineChartObs(obsName, svgContainer.offsetWidth);
    const svgNode = svg.svg.node();
    svgNode.id = 'plot-all' + obsName;
    svgContainer.appendChild(svgNode);
    svgList[obsName] = svg;
    svg.updatePlotOnTime();
};

const addHeatMapObsSVG = (obsName) => {
    if (svgList[obsName] !== undefined) {
        svgList[obsName].svg.remove();
    }
    const svg = new SmallHeatMapObs(obsName, globalVariables.smallHeatMapGridNum, svgContainer.offsetWidth);
    const svgNode = svg.svg.node();
    svgNode.id = 'heatmap-' + obsName;
    svgContainer.appendChild(svgNode);
    svgList[obsName] = svg;
    svg.updatePlotOnTime();
};

const updateAllSVG = () => {
    for (const key in svgList) {
        const svg = svgList[key];
        svg.updatePlotOnTime();
    }
    if (globalHeatmapSvg !== null) {
        globalHeatmapSvg.updatePlotOnTime();
    } else {
        if (globalHeatmapSelection.options.length > 0) {
            const firstOption = globalHeatmapSelection.options[0];
            globalHeatmapSelection.value = firstOption.value;
            changeGlobalPlot(firstOption.value);
        }
    }
};

document.addEventListener('global-map-brushed', (e) => {
    // const { start, end } = e.detail;
    for (const key in svgList) {
        const svg = svgList[key];
        svg.updateWindowSize(globalVariables.rightSvgWindowSize);
        svg.updatePlotOnTime();
    }
});

upSelect.addEventListener('change', () => (viewer.up = upSelect.value));

const plotsSVGRedraw = () => {
    while (svgContainer.firstChild) {
        svgContainer.removeChild(svgContainer.firstChild);
    }
    if (plotsGroupSelection.value === 'LineRobot') {
        plotsLinkOptionName.textContent = 'Highlight Options:';
        plotsRobotOptionName.textContent = 'Plot Robots:';
        globalVariables.groupByRobot = true;
        for (const key in globalVariables.checkedRobots) {
            addRobotSVG(globalVariables.checkedRobots[key]);
        }

        while (globalHeatmapSelection.firstChild) {
            globalHeatmapSelection.removeChild(
                globalHeatmapSelection.firstChild,
            );
        }
        for (const key in movementContainer.movementDict) {
            addNewRobotOptionToGlobalHeatmapSelection(key);
        }

        // use the first robot to draw the global heatmap
        const firstOption = globalHeatmapSelection.options[0];
        globalHeatmapSelection.value = firstOption.value;
        changeGlobalPlot(firstOption.value, 'LineRobot');
    } else if (plotsGroupSelection.value === 'LineLink') {
        plotsLinkOptionName.textContent = 'Plot Joints:';
        plotsRobotOptionName.textContent = 'Highlight Robots:';
        globalVariables.groupByRobot = false;
        for (const key in globalVariables.checkedObs) {
            addObsSVG(globalVariables.checkedObs[key]);
        }

        while (globalHeatmapSelection.firstChild) {
            globalHeatmapSelection.removeChild(
                globalHeatmapSelection.firstChild,
            );
        }
        for (const key in globalVariables.nameObsMap) {
            addNewObsOptionToGlobalHeatmapSelection(key);
        }

        const firstOption = globalHeatmapSelection.options[0];
        globalHeatmapSelection.value = firstOption.value;
        changeGlobalPlot(firstOption.value, 'LineLink');
    } else if (plotsGroupSelection.value === 'HeatMapRobot') {
        plotsLinkOptionName.textContent = 'Highlight Options:';
        plotsRobotOptionName.textContent = 'Plot Robots:';
        globalVariables.groupByRobot = true;
        for (const key in globalVariables.checkedRobots) {
            addHeatMapRobotSVG(globalVariables.checkedRobots[key]);
        }
        while (globalHeatmapSelection.firstChild) {
            globalHeatmapSelection.removeChild(
                globalHeatmapSelection.firstChild,
            );
        }
        while (globalHeatmapSelection.firstChild) {
            globalHeatmapSelection.removeChild(
                globalHeatmapSelection.firstChild,
            );
        }
        for (const key in movementContainer.movementDict) {
            addNewRobotOptionToGlobalHeatmapSelection(key);
        }

        const firstOption = globalHeatmapSelection.options[0];
        globalHeatmapSelection.value = firstOption.value;
        changeGlobalPlot(firstOption.value, 'HeatMapRobot');
    } else if (plotsGroupSelection.value === 'HeatMapLink') {
        globalVariables.groupByRobot = false;
        plotsLinkOptionName.textContent = 'Plot Joints:';
        plotsRobotOptionName.textContent = 'Highlight Robots:';
        for (const key in globalVariables.checkedObs) {
            addHeatMapObsSVG(globalVariables.checkedObs[key]);
        }

        while (globalHeatmapSelection.firstChild) {
            globalHeatmapSelection.removeChild(
                globalHeatmapSelection.firstChild,
            );
        }
        for (const key in globalVariables.nameObsMap) {
            addNewObsOptionToGlobalHeatmapSelection(key);
        }

        const firstOption = globalHeatmapSelection.options[0];
        globalHeatmapSelection.value = firstOption.value;
        changeGlobalPlot(firstOption.value, 'HeatMapLink');
    }
};

plotsGroupSelection.addEventListener('change', () => {
    plotsSVGRedraw();
});

controlsToggle.addEventListener('click', () =>
    controlsel.classList.toggle('hidden'),
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
        if (globalVariables.onlyMoveOneObs === null) {
            for (let i = 0; i < names.length; i++) {
                viewer.setJointValue(
                    robotNum,
                    names[i],
                    parseFloat(mov[names[i]]),
                );
            }
        } else {
            for (let i = 0; i < names.length; i++) {
                if (names[i] === globalVariables.onlyMoveOneObs) {
                    viewer.setJointValue(
                        robotNum,
                        names[i],
                        parseFloat(mov[names[i]]),
                    );
                } else {
                    viewer.setJointValue(robotNum, names[i], 0);
                }
            }
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

onlyObsSelect.addEventListener('change', () => {
    const obsName = onlyObsSelect.value;
    if (obsName === 'all') {
        globalVariables.onlyMoveOneObs = null;
    } else {
        globalVariables.onlyMoveOneObs = obsName;
    }
});

const getCurrentMovementTime = () => {
    return globalTimer.getCurrent();
};

function timerD3Update() {
    updateAllSVG();
    updateAnymal();
}

const updateLoop = () => {
    if (movementContainer.hasAnyMovement()) {
        if (animationControl.isChecked()) {
            globalTimer.start();
        } else {
            if (globalTimer.isRunning) {
                globalTimer.pause();
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
    createRobotControls(0);
    globalTimer.setTimerD3UpdateFunc(timerD3Update);
    // viewer.addEventListener('urdf-processed', (e) => updateAngles());
    updateLoop();
    viewer.camera.position.set(-5.5, 3.5, 5.5);
});
