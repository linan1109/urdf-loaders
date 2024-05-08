/* globals */
import * as THREE from 'three';
import * as d3 from 'd3';
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

const inputContainer = document.getElementById('input-container');
const loadButton = document.getElementById('load-movement');
const svgContainer = document.getElementById('svg-container');

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 1 / DEG2RAD;
let sliders = {};
let timer = null;
let movement = null;

// Global Functions
const setColor = color => {

    document.body.style.backgroundColor = color;
    viewer.highlightColor = '#' + (new THREE.Color(0xffffff)).lerp(new THREE.Color(color), 0.35).getHexString();

};

// Events
// toggle checkbox
limitsToggle.addEventListener('click', () => {
    limitsToggle.classList.toggle('checked');
    viewer.ignoreLimits = limitsToggle.classList.contains('checked');
});

radiansToggle.addEventListener('click', () => {
    radiansToggle.classList.toggle('checked');
    Object
        .values(sliders)
        .forEach(sl => sl.update());
});

collisionToggle.addEventListener('click', () => {
    collisionToggle.classList.toggle('checked');
    viewer.showCollision = collisionToggle.classList.contains('checked');
});

autocenterToggle.addEventListener('click', () => {
    autocenterToggle.classList.toggle('checked');
    viewer.noAutoRecenter = !autocenterToggle.classList.contains('checked');
});

// NEW ADD
loadButton.addEventListener('change', e => {
    const fileInput = document.querySelector('input[type="file"]');
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = function (e) {
        const data = e.target.result;
        movement = Papa.parse(data, { header: true }).data;
        console.log('Loaded movement data');
        console.log('Length:' + movement.length);

        const svg = getSvg();
        while (svgContainer.firstChild) {
            svgContainer.removeChild(svgContainer.firstChild);
        }
        svgContainer.appendChild(svg);
    };
    reader.readAsText(file);
});

function getSvg() {
    const width = 600;
    const height = 300;
    const marginTop = 20;
    const marginRight = 20;
    const marginBottom = 30;
    const marginLeft = 30;
    const windowSize = 400;

    const voronoi = false;

    const svg = d3.create('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [0, 0, width, height])
        .attr('style', 'max-width: 100%; height: auto; overflow: visible; font: 10px sans-serif;');


    // Add an invisible layer for the interactive tip.
    const dot = svg.append('g')
        .attr('display', 'none');

    dot.append('circle')
        .attr('r', 2.5);

    dot.append('text')
        .attr('text-anchor', 'middle')
        .attr('y', -8);

    const lineX = svg.append('g').append('line')
        .attr('y1', height * 0.9)
        .attr('y2', height * 0.1)
        .attr('stroke', 'black');

    let path = null;
    let groups = null;
    let points = null;
    let all_x = null;
    let all_y = null;
    let yScale = null;

    const timerD3 = d3.interval(() => {
        if (movement !== null) {
            const current = getCurrentMovementTime();
            if (current >= movement.length) {
                timerD3.stop();
            }
            if (current > 0 && current < movement.length) {
                svg.selectAll('.plotline').remove();
                svg.selectAll('.xaxis').remove();
                if (all_x === null) {
                    // movement filter NaN
                    movement = movement.filter(d => !isNaN(parseFloat(d.obs_4)));
                    all_x = movement.map(d => parseInt(d.update) * 400 + parseInt(d.step));
                    all_y = movement.map(d => parseFloat(d.obs_4));

                    yScale = d3.scaleLinear()
                        .domain(d3.extent(all_y))
                        .range([height - marginBottom, marginTop]);
                    // Add the vertical axis.
                    svg.append('g')
                        .attr('transform', `translate(${marginLeft},0)`)
                        .attr('class', 'yaxis')
                        .call(d3.axisLeft(yScale))
                        .call(g => g.select('.domain').remove())
                        .call(voronoi ? () => { } : g => g.selectAll('.tick line').clone()
                            .attr('x2', width - marginLeft - marginRight)
                            .attr('stroke-opacity', 0.1))
                        .call(g => g.append('text')
                            .attr('x', -marginLeft)
                            .attr('y', 10)
                            .attr('fill', 'currentColor')
                            .attr('text-anchor', 'start')
                            .text('movement'));
                }

                // slice the window for the current time
                const x = all_x.slice(Math.max(0, current - windowSize / 2), Math.min(movement.length, current + windowSize / 2));
                // console.log('window from ' + x[0] + ' to ' + x[x.length - 1])
                const xScale = d3.scaleLinear()
                    .domain(d3.extent(x))
                    .range([marginLeft, width - marginRight]);

                // Add the horizontal axis.
                svg.append('g')
                    .attr('transform', `translate(0,${height - marginBottom})`)
                    .attr('class', 'xaxis')
                    .call(d3.axisBottom(xScale).ticks(width / 80).tickSizeOuter(0));

                // Compute the points in pixel space as [x, y, z], where z is the name of the series.
                points = movement
                    .slice(Math.max(0, current - windowSize / 2), Math.min(movement.length, current + windowSize / 2))
                    .map(d => [xScale(parseInt(d.update) * 400 + parseInt(d.step)), yScale(parseFloat(d.obs_4)), 0]);


                groups = d3.rollup(points, v => Object.assign(v, { z: v[0][2] }), d => d[2]);

                // Add the lines.
                path = svg.append('g')
                    .attr('class', 'plotline')
                    .attr('fill', 'none')
                    .attr('stroke-width', 1.5)
                    .selectAll('path')
                    .data(Array.from(groups, ([k, v]) => v))
                    .join('path')
                    .attr('stroke', '#555')
                    .style('mix-blend-mode', 'multiply')
                    .attr('d', d3.line()
                        .x(d => d[0])
                        .y(d => d[1]));


                // update the vertical line and the dot
                const cur_mov = movement[current];
                const a = xScale(parseInt(cur_mov.update) * 400 + parseInt(cur_mov.step));
                const b = yScale(parseFloat(cur_mov.obs_4));
                const k = 0;
                // path.style('stroke', ({ z }) => z === k ? null : '#ddd').filter(({ z }) => z === k).raise();
                dot.attr('transform', `translate(${a},${b})`);
                dot.select('text').text(b);
                lineX.attr('transform', `translate(${a},0)`)
                    .attr('stroke', '#ddd');

            }
        }
    }, 10, d3.now());

    svg
        .on('pointerenter', pointerentered)
        .on('pointermove', pointermoved)
        .on('pointerleave', pointerleft)
        .on('touchstart', event => event.preventDefault());
    return svg.node();

    // When the pointer moves, find the closest point, update the interactive tip, and highlight
    // the corresponding line. Note: we don't actually use Voronoi here, since an exhaustive search
    // is fast enough.

    function pointermoved(event) {
        const [xm, ym] = d3.pointer(event);
        const i = d3.leastIndex(points, ([x, y]) => Math.hypot(x - xm, y - ym));
        const [x, y, k] = points[i];
        path.style('stroke', ({ z }) => z === y ? null : '#ddd').filter(({ z }) => z === y).raise();
        dot.attr('transform', `translate(${x},${y})`);
        dot.select('text').text(y);
        lineX.attr('transform', `translate(${x},0)`);

        svg.property('value', movement[i]).dispatch('input', { bubbles: true });
    }

    function pointerentered() {
        path.style('mix-blend-mode', null).style('stroke', '#ddd');
        dot.attr('display', null);
    }

    function pointerleft() {
        path.style('mix-blend-mode', 'multiply').style('stroke', null);
        dot.attr('display', 'none');
        svg.node().value = null;
        svg.dispatch('input', { bubbles: true });
    }

};

upSelect.addEventListener('change', () => viewer.up = upSelect.value);

controlsToggle.addEventListener('click', () => controlsel.classList.toggle('hidden'));

// watch for urdf changes
viewer.addEventListener('urdf-change', () => {

    Object
        .values(sliders)
        .forEach(sl => sl.remove());
    sliders = {};

});

viewer.addEventListener('ignore-limits-change', () => {

    Object
        .values(sliders)
        .forEach(sl => sl.update());

});

viewer.addEventListener('angle-change', e => {

    if (sliders[e.detail]) sliders[e.detail].update();

});

viewer.addEventListener('joint-mouseover', e => {

    const j = document.querySelector(`li[joint-name='${e.detail}']`);
    if (j) j.setAttribute('robot-hovered', true);

});

viewer.addEventListener('joint-mouseout', e => {

    const j = document.querySelector(`li[joint-name='${e.detail}']`);
    if (j) j.removeAttribute('robot-hovered');

});

let originalNoAutoRecenter;
viewer.addEventListener('manipulate-start', e => {

    const j = document.querySelector(`li[joint-name='${e.detail}']`);
    if (j) {
        j.scrollIntoView({ block: 'nearest' });
        window.scrollTo(0, 0);
    }

    originalNoAutoRecenter = viewer.noAutoRecenter;
    viewer.noAutoRecenter = true;

});

viewer.addEventListener('manipulate-end', e => {

    viewer.noAutoRecenter = originalNoAutoRecenter;

});

// create the sliders
viewer.addEventListener('urdf-processed', () => {

    const r = viewer.robot;
    Object
        .keys(r.joints)
        .sort((a, b) => {

            const da = a.split(/[^\d]+/g).filter(v => !!v).pop();
            const db = b.split(/[^\d]+/g).filter(v => !!v).pop();

            if (da !== undefined && db !== undefined) {
                const delta = parseFloat(da) - parseFloat(db);
                if (delta !== 0) return delta;
            }

            if (a > b) return 1;
            if (b > a) return -1;
            return 0;

        })
        .map(key => r.joints[key])
        .forEach(joint => {

            const li = document.createElement('li');
            li.innerHTML =
                `
            <span title='${joint.name}'>${joint.name}</span>
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
                const degMultiplier = radiansToggle.classList.contains('checked') ? 1.0 : RAD2DEG;
                let angle = joint.angle;

                if (joint.jointType === 'revolute' || joint.jointType === 'continuous') {
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
                    li.update = () => { };
                    input.remove();
                    slider.remove();

            }

            slider.addEventListener('input', () => {
                viewer.setJointValue(joint.name, slider.value);
                li.update();
            });

            input.addEventListener('change', () => {
                const degMultiplier = radiansToggle.classList.contains('checked') ? 1.0 : RAD2DEG;
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
                    result => done(result.scene),
                    null,
                    err => done(null, err),
                );
                break;
            case 'obj':
                new OBJLoader(manager).load(
                    path,
                    result => done(result),
                    null,
                    err => done(null, err),
                );
                break;
            case 'dae':
                new ColladaLoader(manager).load(
                    path,
                    result => done(result.scene),
                    null,
                    err => done(null, err),
                );
                break;
            case 'stl':
                new STLLoader(manager).load(
                    path,
                    result => {
                        const material = new THREE.MeshPhongMaterial();
                        const mesh = new THREE.Mesh(result, material);
                        done(mesh);
                    },
                    null,
                    err => done(null, err),
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

        const offset = i * Math.PI / 3;
        const ratio = Math.max(0, Math.sin(time + offset));

        viewer.setJointValue(`HP${i}`, THREE.MathUtils.lerp(30, 0, ratio) * DEG2RAD);
        viewer.setJointValue(`KP${i}`, THREE.MathUtils.lerp(90, 150, ratio) * DEG2RAD);
        viewer.setJointValue(`AP${i}`, THREE.MathUtils.lerp(-30, -60, ratio) * DEG2RAD);

        viewer.setJointValue(`TC${i}A`, THREE.MathUtils.lerp(0, 0.065, ratio));
        viewer.setJointValue(`TC${i}B`, THREE.MathUtils.lerp(0, 0.065, ratio));

        viewer.setJointValue(`W${i}`, window.performance.now() * 0.001);

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
    const names = ['LF_HAA', 'LF_HFE', 'LF_KFE',
        'RF_HAA', 'RF_HFE', 'RF_KFE',
        'LH_HAA', 'LH_HFE', 'LH_KFE',
        'RH_HAA', 'RH_HFE', 'RH_KFE'];

    var mov = movement[current];
    if (mov === undefined) {
        timer = null;
        for (let i = 0; i < names.length; i++) {
            viewer.setJointValue(names[i], 0);
        }
        return;
    }
    for (let i = 0; i < names.length; i++) {
        // console.log(parseFloat(mov['obs_' + (i + 4)]) * DEG2RAD);
        // console.log(parseFloat(mov['obs_' + (i + 4)]));
        viewer.setJointValue(names[i], parseFloat(mov['obs_' + (i + 4)]));
    }

};

const getCurrentMovementTime = () => {
    const time = Date.now() - timer;
    // const ignoreFirst = 400 * 200;
    const ignoreFirst = 0;
    // freq = 0.01 sec
    const freq = 0.1;
    const current = Math.floor(time / 1000 / freq + ignoreFirst);
    return current;
};

const updateLoop = () => {

    if (animToggle.classList.contains('checked') && movement !== null) {
        if (timer === null) {
            timer = Date.now();
        }
        updateAnglesAnymal();
        // updateAngles();
    } else {
        timer = null;
    }
    requestAnimationFrame(updateLoop);

};

const updateList = () => {

    document.querySelectorAll('#urdf-options li[urdf]').forEach(el => {

        el.addEventListener('click', e => {

            const urdf = e.target.getAttribute('urdf');
            const color = e.target.getAttribute('color');

            viewer.up = '+Z';
            document.getElementById('up-select').value = viewer.up;
            viewer.urdf = urdf;
            animToggle.classList.add('checked');
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
    viewer.addEventListener('manipulate-start', e => animToggle.classList.remove('checked'));
    viewer.addEventListener('urdf-processed', e => updateAngles());
    updateLoop();
    viewer.camera.position.set(-5.5, 3.5, 5.5);
});
