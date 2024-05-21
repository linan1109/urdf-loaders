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
const sliderList = document.querySelector('#controls ul');
const controlsel = document.getElementById('controls');
const controlsToggle = document.getElementById('toggle-controls');
const animToggle = document.getElementById('do-animate');

// const inputContainer = document.getElementById('input-container');
const loadButton = document.getElementById('load-movement');
const svgContainer = document.getElementById('svg-container');
const plotsControls = document.getElementById('plots-controls');
const togglePlotsControls = document.getElementById('toggle-plots-controls');
const plotsControlsContainer = document.getElementById(
    'plots-controls-container',
);

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 1 / DEG2RAD;
let sliders = {};
let timer = null;
const svgList = {};
let timerD3 = null;

let movement = null;
let movementIndexStart = 0;
// let movementStepEachUpdate = 400;
let movementLength = 0;

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

togglePlotsControls.addEventListener('click', () =>
    plotsControls.classList.toggle('hidden'),
);

loadButton.addEventListener('change', (e) => {
    const fileInput = document.querySelector('input[type="file"]');
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = e.target.result;
        movement = Papa.parse(data, { header: true }).data;
        // max of movement['step']
        // movementStepEachUpdate = d3.max(movement, d => parseInt(d.step)) + 1;
        movementLength = movement.length;
        // first update and step
        // movementIndexStart = parseInt(movement[0].update) * movementStepEachUpdate + parseInt(movement[0].step);
        movementIndexStart = 0;

        console.log('Loaded movement data');
        console.log('Length:' + movementLength);
        // console.log('Step each update:' + movementStepEachUpdate);
        console.log('Start index:' + movementIndexStart);

        // create toggle buttons
        while (plotsControlsContainer.firstChild) {
            plotsControlsContainer.removeChild(
                plotsControlsContainer.firstChild,
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
                    const svg = document.getElementById('plot-' + key);
                    svg.remove();
                    delete svgList[key];
                } else {
                    toggle.classList.add('checked');
                    const svg = new SvgPlotter(key);
                    const svgNode = svg.svg.node();
                    svgNode.id = 'plot-' + key;
                    svgContainer.appendChild(svgNode);
                    svg.updatePlotOnTime();
                    svgList[key] = svg;
                }
            });
            plotsControlsContainer.appendChild(toggle);
        }

        while (svgContainer.firstChild) {
            svgContainer.removeChild(svgContainer.firstChild);
        }
    };
    reader.readAsText(file);
});

class SvgPlotter {

    constructor(realName) {
        this.realName = realName;
        this.obsName = nameObsMap[realName];
        this.width = 600;
        this.height = 300;
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
        this.points = null;
        this.brush = null;

        this.all_x = null;
        this.all_y = null;
        this.yScale = null;
        this.xScale = null;
        this.current = null;

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
                        // const smallMovement = movement.filter(d => parseInt(d.update) * movementStepEachUpdate + parseInt(d.step) >= x0 && parseInt(d.update) * movementStepEachUpdate + parseInt(d.step) <= x1);
                        const x = d3.range(x0, x1);
                        // const y = smallMovement.map(d => parseFloat(d[[this.obsName]]));
                        this.xScale = d3
                            .scaleLinear()
                            .domain(d3.extent(x))
                            .range([
                                this.marginLeft,
                                this.width - this.marginRight,
                            ]);
                        // this.points = smallMovement.map(d => [this.xScale(parseInt(d.update) * movementStepEachUpdate + parseInt(d.step)), this.yScale(parseFloat(d[[this.obsName]]), 0)]);
                        this.points = x.map((d, i) => [
                            this.xScale(d),
                            this.yScale(parseFloat(movement[d][this.obsName])),
                            0,
                        ]);
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
        if (timer === null) {
            const [xm, ym] = d3.pointer(event);
            const i = d3.leastIndex(this.points, ([x, y]) =>
                Math.hypot(x - xm, y - ym),
            );
            const [x, y, k] = this.points[i];
            const textY = this.yScale.invert(y);
            this.path.style('stroke', '#ddd');
            this.dot.attr('transform', `translate(${ x },${ y })`);
            this.dot.select('text').text(textY);
            this.lineX.attr('transform', `translate(${ x },0)`);

            this.svg
                .property('value', movement[i])
                .dispatch('input', { bubbles: true });
        }
    }

    pointerleft() {
        // this.path.style('mix-blend-mode', 'multiply').style('stroke', null);
        this.dot.attr('display', 'none');
        this.svg.node().value = null;
        this.svg.dispatch('input', { bubbles: true });
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
        // this.points = movement.map(d => [this.xScale(parseInt(d.update) * movementStepEachUpdate + parseInt(d.step)), this.yScale(parseFloat(d[[this.obsName]]), 0)]);
        this.points = this.all_x.map((d, i) => [
            this.xScale(d),
            this.yScale(parseFloat(movement[d][this.obsName])),
            0,
        ]);

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
            ignoreFirst = Math.floor(
                this.xScale.invert(xm) - movementIndexStart,
            );
            startAnimation();
        }
    }

    updatePlotOnTime() {
        if (movement !== null) {
            this.current = getCurrentMovementTime();
            if (this.current >= movement.length) {
                timerD3.stop();
            }
            if (this.current >= 0 && this.current < movement.length) {
                if (this.all_x === null) {
                    // movement filter NaN
                    movement = movement.filter(
                        (d) => !isNaN(parseFloat(d[this.obsName])),
                    );
                    // this.all_x = movement.map(d => parseInt(d.update) * movementStepEachUpdate + parseInt(d.step));
                    this.all_x = movement.map((d, i) => i);
                    this.all_y = movement.map((d) =>
                        parseFloat(d[[this.obsName]]),
                    );

                    this.yScale = d3
                        .scaleLinear()
                        .domain(d3.extent(this.all_y))
                        .range([
                            this.height - this.marginBottom,
                            this.marginTop,
                        ]);
                    // Add the vertical axis.
                    this.svg
                        .append('g')
                        .attr('transform', `translate(${ this.marginLeft },0)`)
                        .attr('class', 'yaxis')
                        .call(d3.axisLeft(this.yScale))
                        .call((g) => g.select('.domain').remove())
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
                                .attr('fill', 'currentColor')
                                .attr('text-anchor', 'start')
                                .text(this.realName),
                        );
                }

                // slice the window for the current time
                const x = this.all_x.slice(
                    Math.max(0, this.current - this.windowSize / 2),
                    Math.min(
                        movement.length,
                        this.current + this.windowSize / 2,
                    ),
                );

                this.xScale = d3
                    .scaleLinear()
                    .domain(d3.extent(x))
                    .range([this.marginLeft, this.width - this.marginRight]);
                // this.points = movement
                //     .slice(Math.max(0, this.current - this.windowSize / 2), Math.min(movement.length, this.current + this.windowSize / 2))
                //     // .map(d => [this.xScale(parseInt(d.update) * movementStepEachUpdate + parseInt(d.step)), this.yScale(parseFloat(d[[this.obsName]])), 0]);
                //     .map((d, i) => [this.xScale(i), this.yScale(parseFloat(d[[this.obsName]])), 0]);
                this.points = x.map((d, i) => [
                    this.xScale(d),
                    this.yScale(parseFloat(movement[d][this.obsName])),
                    0,
                ]);
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
            );

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
            .data(Array.from(this.groups, ([k, v]) => v))
            .join('path')
            .attr('stroke', '#555')
            .style('mix-blend-mode', 'multiply')
            .attr(
                'd',
                d3
                    .line()
                    .x((d) => d[0])
                    .y((d) => d[1]),
            );

        // update the vertical line and the dot
        const curMov = movement[this.current];
        // const a = this.xScale(parseInt(cur_mov.update) * movementStepEachUpdate + parseInt(cur_mov.step));
        const a = this.xScale(this.current);
        const b = this.yScale(parseFloat(curMov[[this.obsName]]));
        const textB = parseFloat(curMov[[this.obsName]]);

        this.dot.attr('transform', `translate(${ a },${ b })`);
        this.dot.select('text').text(textB);
        this.lineX
            .attr('transform', `translate(${ a },0)`)
            .attr('stroke', '#ddd');

        // remove the brush after drawing
        this.svg.select('.brush').call(this.brush.move, null);
    }

}

upSelect.addEventListener('change', () => (viewer.up = upSelect.value));

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

// create the sliders
viewer.addEventListener('urdf-processed', () => {
    const r = viewer.robot;
    Object.keys(r.joints)
        .sort((a, b) => {
            const da = a
                .split(/[^\d]+/g)
                .filter((v) => !!v)
                .pop();
            const db = b
                .split(/[^\d]+/g)
                .filter((v) => !!v)
                .pop();

            if (da !== undefined && db !== undefined) {
                const delta = parseFloat(da) - parseFloat(db);
                if (delta !== 0) return delta;
            }

            if (a > b) return 1;
            if (b > a) return -1;
            return 0;
        })
        .map((key) => r.joints[key])
        .forEach((joint) => {
            const li = document.createElement('li');
            li.innerHTML = `
            <span title='${ joint.name }'>${ joint.name }</span>
            <input type='range' value='0' step='0.0001'/>
            <input type='number' step='0.0001' />
            `;
            li.setAttribute('joint-type', joint.jointType);
            li.setAttribute('joint-name', joint.name);

            sliderList.appendChild(li);

            // update the joint display
            const slider = li.querySelector('input[type="range"]');
            const input = li.querySelector('input[type="number"]');
            li.update = () => {
                const degMultiplier = radiansToggle.classList.contains(
                    'checked',
                )
                    ? 1.0
                    : RAD2DEG;
                let angle = joint.angle;

                if (
                    joint.jointType === 'revolute' ||
                    joint.jointType === 'continuous'
                ) {
                    angle *= degMultiplier;
                }

                if (Math.abs(angle) > 1) {
                    angle = angle.toFixed(1);
                } else {
                    angle = angle.toPrecision(2);
                }

                input.value = parseFloat(angle);

                // directly input the value
                slider.value = joint.angle;

                if (viewer.ignoreLimits || joint.jointType === 'continuous') {
                    slider.min = -6.28;
                    slider.max = 6.28;

                    input.min = -6.28 * degMultiplier;
                    input.max = 6.28 * degMultiplier;
                } else {
                    slider.min = joint.limit.lower;
                    slider.max = joint.limit.upper;

                    input.min = joint.limit.lower * degMultiplier;
                    input.max = joint.limit.upper * degMultiplier;
                }
            };

            switch (joint.jointType) {

                case 'continuous':
                case 'prismatic':
                case 'revolute':
                    break;
                default:
                    li.update = () => {};
                    input.remove();
                    slider.remove();

            }

            slider.addEventListener('input', () => {
                viewer.setJointValue(joint.name, slider.value);
                li.update();
            });

            input.addEventListener('change', () => {
                const degMultiplier = radiansToggle.classList.contains(
                    'checked',
                )
                    ? 1.0
                    : RAD2DEG;
                viewer.setJointValue(joint.name, input.value * degMultiplier);
                li.update();
            });

            li.update();

            sliders[joint.name] = li;
        });
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
const updateAngles = () => {
    if (!viewer.setJointValue) return;

    // reset everything to 0 first
    const resetJointValues = viewer.angles;
    for (const name in resetJointValues) resetJointValues[name] = 0;
    viewer.setJointValues(resetJointValues);

    // animate the legs
    const time = Date.now() / 3e2;
    for (let i = 1; i <= 6; i++) {
        const offset = (i * Math.PI) / 3;
        const ratio = Math.max(0, Math.sin(time + offset));

        viewer.setJointValue(
            `HP${ i }`,
            THREE.MathUtils.lerp(30, 0, ratio) * DEG2RAD,
        );
        viewer.setJointValue(
            `KP${ i }`,
            THREE.MathUtils.lerp(90, 150, ratio) * DEG2RAD,
        );
        viewer.setJointValue(
            `AP${ i }`,
            THREE.MathUtils.lerp(-30, -60, ratio) * DEG2RAD,
        );

        viewer.setJointValue(`TC${ i }A`, THREE.MathUtils.lerp(0, 0.065, ratio));
        viewer.setJointValue(`TC${ i }B`, THREE.MathUtils.lerp(0, 0.065, ratio));

        viewer.setJointValue(`W${ i }`, window.performance.now() * 0.001);
    }
};

const updateAnglesAnymal = () => {
    if (!viewer.setJointValue) return;
    // reset everything to 0 first
    const resetJointValues = viewer.angles;
    for (const name in resetJointValues) resetJointValues[name] = 0;
    viewer.setJointValues(resetJointValues);

    const current = getCurrentMovementTime();

    // console.log(current)
    const names = [
        'LF_HAA',
        'LF_HFE',
        'LF_KFE',
        'RF_HAA',
        'RF_HFE',
        'RF_KFE',
        'LH_HAA',
        'LH_HFE',
        'LH_KFE',
        'RH_HAA',
        'RH_HFE',
        'RH_KFE',
    ];

    var mov = movement[current];
    if (mov === undefined) {
        timer = null;
        for (let i = 0; i < names.length; i++) {
            viewer.setJointValue(names[i], 0);
        }
        return;
    }
    for (let i = 0; i < names.length; i++) {
        viewer.setJointValue(names[i], parseFloat(mov[names[i]]));
    }
    viewer.robot.position.set(
        mov['pos_' + 0],
        mov['pos_' + 1],
        mov['pos_' + 2],
    );
    viewer.robot.rotation.set(
        mov['rot_' + 0],
        mov['rot_' + 1],
        mov['rot_' + 2],
    );
};

let ignoreFirst = 0;

const getCurrentMovementTime = () => {
    if (timer === null) return Math.floor(ignoreFirst);
    const time = Date.now() - timer;
    // freq = 0.01 sec
    const freq = 0.03;
    const current = Math.floor(time / 1000 / freq + ignoreFirst);
    return current;
};

function timerD3Update() {
    for (const key in svgList) {
        const svg = svgList[key];
        svg.updatePlotOnTime();
    }
    updateAnglesAnymal();
}

function pauseAnimation() {
    ignoreFirst = getCurrentMovementTime();
    timer = null;
    timerD3.stop();
}

function startAnimation() {
    if (timer === null) {
        timer = Date.now();
        timerD3 = d3.interval(timerD3Update, 30);
    }
}

const updateLoop = () => {
    if (movement !== null) {
        if (animToggle.classList.contains('checked')) {
            startAnimation();
        } else {
            if (timer !== null) {
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
        // change the text of the button
        // if (animToggle.classList.contains('checked')) {
        //     animToggle.textContent = 'Pause Animation';
        // } else {
        //     animToggle.textContent = 'Continue Animate Joints';
        // }
    });

    // stop the animation if user tried to manipulate the model
    viewer.addEventListener('manipulate-start', (e) =>
        animToggle.classList.remove('checked'),
    );
    viewer.addEventListener('urdf-processed', (e) => updateAngles());
    updateLoop();
    viewer.camera.position.set(-5.5, 3.5, 5.5);
});
