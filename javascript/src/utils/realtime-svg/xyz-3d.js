import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import globalTimer from '../global-timer';
import globalVariables from '../global-variables.js';

const lengthAllGrids = 10;
const numGrids = 10;

export default class XYZ3D {

    constructor(offsetWidth) {
        this.offsetWidth = offsetWidth;

        this.width = (80 / 100) * offsetWidth;
        this.height = this.width;

        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('aliceblue');
        // this.camera = new THREE.OrthographicCamera(
        //     this.width / -1.5,
        //     this.width / 1.5,
        //     this.height / 1.5,
        //     this.height / -1.5,
        //     1,
        //     1000,
        // );
        this.camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 1000);
        this.camera.position.set(18, 15, 22);
        this.camera.zoom = 0.6;
        this.camera.updateProjectionMatrix();

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.width, this.height);

        this.fontMaterial = new THREE.MeshPhongMaterial({
            color: 0xeea2ad,
            specular: 0xeea2ad,
            shininess: 0,
        });

        this.fontLoader = new FontLoader();

        this.positions = {};
        this.lastTime = null;
        this.all_time = [];
        this.trajectory = {};
        this.trajectoryLine = {};

        this.xMax = 1;
        this.yMax = 1;
        this.zMax = 1;
        this.xMeshs = [];
        this.yMeshs = [];
        this.zMeshs = [];

        this.initControls();
        this.addAxes();
        this.addGrids();
        this.addLabels();
        console.log('XYZ3D');

        this.renderer.domElement.addEventListener('mousemove', (event) => {
            this.onhover(event);
            if (!globalTimer.isRunning) {
                this.render();
            }
        });
        this.renderer.domElement.addEventListener(
            'click',
            this.onClick.bind(this),
        );

        this.updatePlotOnTime();
    }

    updateMousePosition(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    checkIntersection() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(
            this.scene.children,
            false,
        );
        return intersects;
    }

    distanceToAxis(point, lineStart, lineEnd) {
        const startToEnd = new THREE.Vector3().subVectors(lineEnd, lineStart);
        const startToPoint = new THREE.Vector3().subVectors(point, lineStart);
        const projection =
            startToPoint.dot(startToEnd) / startToEnd.dot(startToEnd);
        if (projection < 0) {
            return lineStart.distanceTo(point);
        } else if (projection > 1) {
            return lineEnd.distanceTo(point);
        } else {
            const projectedPoint = new THREE.Vector3().addVectors(
                lineStart,
                startToEnd.multiplyScalar(projection),
            );
            return projectedPoint.distanceTo(point);
        }
    }

    onhover(event) {
        this.updateMousePosition(event);
        const intersects = this.checkIntersection();
        if (intersects.length > 0) {
            for (const intersect of intersects) {
                this.hoveredAxis = intersect.object.name;
                // make the hovered axis thicker
                if (this.hoveredAxis === 'xAxis') {
                    this.xAxis.material.color = new THREE.Color('black');
                    this.yAxis.material.color = new THREE.Color(0x00ff00);
                    this.zAxis.material.color = new THREE.Color(0x0000ff);
                    return;
                }
                if (this.hoveredAxis === 'yAxis') {
                    this.yAxis.material.color = new THREE.Color('black');
                    this.xAxis.material.color = new THREE.Color(0xff0000);
                    this.zAxis.material.color = new THREE.Color(0x0000ff);
                    return;
                }
                if (this.hoveredAxis === 'zAxis') {
                    this.zAxis.material.color = new THREE.Color('black');
                    this.xAxis.material.color = new THREE.Color(0xff0000);
                    this.yAxis.material.color = new THREE.Color(0x00ff00);
                    return;
                }
            }
        }
        this.hoveredAxis = null;
        this.xAxis.material.color = new THREE.Color(0xff0000);
        this.yAxis.material.color = new THREE.Color(0x00ff00);
        this.zAxis.material.color = new THREE.Color(0x0000ff);
    }

    onClick(event) {
        if (this.hoveredAxis) {
            if (this.hoveredAxis === 'xAxis') {
                // set camera to x axis
                this.camera.position.set(20, 5, 5);
                this.camera.lookAt(0, 5, 5);
                this.camera.up.set(0, 1, 0);
                this.camera.zoom = 0.8;
                this.camera.updateProjectionMatrix();
                this.controls.target.set(0, 5, 5);
                this.controls.update();

                for (const mesh of this.xMeshs) {
                    mesh.visible = false;
                }
            } else if (this.hoveredAxis === 'yAxis') {
                // set camera to y axis
                this.camera.position.set(5, 20, 5);
                this.camera.lookAt(5, 0, 5);
                this.camera.up.set(0, 0, 1);
                this.camera.zoom = 0.8;
                this.camera.updateProjectionMatrix();
                this.controls.target.set(5, 0, 5);
                this.controls.update();

                for (const mesh of this.yMeshs) {
                    mesh.visible = false;
                }
            } else if (this.hoveredAxis === 'zAxis') {
                // set camera to z axis
                this.camera.position.set(5, 5, 20);
                this.camera.lookAt(5, 5, 0);
                this.camera.up.set(0, 1, 0);
                this.camera.zoom = 0.8;
                this.camera.updateProjectionMatrix();
                this.controls.target.set(5, 5, 0);
                this.controls.update();

                for (const mesh of this.zMeshs) {
                    mesh.visible = false;
                }
            }
        }
    }

    initControls() {
        this.controls = new OrbitControls(
            this.camera,
            this.renderer.domElement,
        );
        this.controls.rotateSpeed = 2.0;
        this.controls.zoomSpeed = 5;
        this.controls.panSpeed = 2;
        this.controls.enableZoom = true;
        this.controls.enableDamping = false;
        this.controls.maxDistance = 50;
        this.controls.minDistance = 0.25;

        this.controls.addEventListener('change', () => {
            // update the axes labels to face the camera
            this.xMeshs.forEach((mesh) => {
                mesh.quaternion.copy(this.camera.quaternion);
                mesh.visible = true;
            });
            this.yMeshs.forEach((mesh) => {
                mesh.quaternion.copy(this.camera.quaternion);
                mesh.visible = true;
            });
            this.zMeshs.forEach((mesh) => {
                mesh.quaternion.copy(this.camera.quaternion);
                mesh.visible = true;
            });
            console.log(this.camera)
            this.render();
        });
    }

    addAxes() {
        // X axis - Red
        const xAxisGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(lengthAllGrids * 1.1, 0, 0),
        ]);
        const xAxisMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
        const xAxis = new THREE.Line(xAxisGeometry, xAxisMaterial);
        xAxis.name = 'xAxis';

        // Y axis - Green
        const yAxisGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, lengthAllGrids * 1.1, 0),
        ]);
        const yAxisMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
        const yAxis = new THREE.Line(yAxisGeometry, yAxisMaterial);
        yAxis.name = 'yAxis';

        // Z axis - Blue
        const zAxisGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, lengthAllGrids * 1.1),
        ]);
        const zAxisMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
        const zAxis = new THREE.Line(zAxisGeometry, zAxisMaterial);
        zAxis.name = 'zAxis';

        this.scene.add(xAxis);
        this.scene.add(yAxis);
        this.scene.add(zAxis);

        this.xAxis = xAxis;
        this.yAxis = yAxis;
        this.zAxis = zAxis;
    }

    addGrids() {
        const yz = new THREE.GridHelper(lengthAllGrids, numGrids);
        const xzgrid = new THREE.GridHelper(lengthAllGrids, numGrids);
        const xy = new THREE.GridHelper(lengthAllGrids, numGrids);

        yz.rotation.z = Math.PI / 2;
        // xzgrid.rotation.y = Math.PI / 2;
        xy.rotation.x = Math.PI / 2;

        yz.position.set(0, lengthAllGrids / 2, lengthAllGrids / 2);
        xzgrid.position.set(lengthAllGrids / 2, 0, lengthAllGrids / 2);
        xy.position.set(lengthAllGrids / 2, lengthAllGrids / 2, 0);

        // // color
        // yz.material.color = new THREE.Color('red');
        // xzgrid.material.color = new THREE.Color('green');
        // xy.material.color = new THREE.Color('blue');
        yz.material.color = new THREE.Color('gray');
        xzgrid.material.color = new THREE.Color('gray');
        xy.material.color = new THREE.Color('gray');
        // dashed
        yz.material.opacity = 0.25;
        yz.material.transparent = true;
        yz.material.depthWrite = false;

        xzgrid.material.opacity = 0.25;
        xzgrid.material.transparent = true;
        xzgrid.material.depthWrite = false;

        xy.material.opacity = 0.25;
        xy.material.transparent = true;
        xy.material.depthWrite = false;

        this.scene.add(yz);
        this.scene.add(xzgrid);
        this.scene.add(xy);

        // add a point at the origin
        const geometry = new THREE.SphereGeometry(0.1, 32, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(0, 0, 0);
        this.scene.add(sphere);
    }

    addLabels() {
        this.fontLoader.load(
            'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json',
            (font) => {
                if (this.xMeshs.length > 0) {
                    this.xMeshs.forEach((mesh) => {
                        this.scene.remove(mesh);
                    });
                    this.xMeshs = [];
                    this.yMeshs.forEach((mesh) => {
                        this.scene.remove(mesh);
                    });
                    this.yMeshs = [];
                    this.zMeshs.forEach((mesh) => {
                        this.scene.remove(mesh);
                    });
                    this.zMeshs = [];
                }
                for (let i = 0; i <= 5; i++) {
                    const x = (i / 5) * (this.xMax * 2) - this.xMax;
                    const meshx = new THREE.Mesh(
                        new TextGeometry(`${ x.toFixed(2) }`, {
                            font: font,
                            size: 0.35,
                            height: 0.1,
                        }),
                        this.fontMaterial,
                    );
                    meshx.position.set(
                        ((x + this.xMax) * lengthAllGrids) / (this.xMax * 2),
                        (-0.5 * lengthAllGrids) / numGrids,
                        lengthAllGrids * 1.1,
                    );
                    meshx.quaternion.copy(this.camera.quaternion);
                    this.scene.add(meshx);

                    const y = (i / 5) * (this.yMax * 2) - this.yMax;
                    const meshy = new THREE.Mesh(
                        new TextGeometry(`${ y.toFixed(2) }`, {
                            font: font,
                            size: 0.35,
                            height: 0.05,
                        }),
                        this.fontMaterial,
                    );
                    meshy.position.set(
                        (-0.5 * lengthAllGrids) / numGrids,
                        ((y + this.yMax) * lengthAllGrids) / (this.yMax * 2),
                        lengthAllGrids * 1.1,
                    );
                    meshy.quaternion.copy(this.camera.quaternion);
                    this.scene.add(meshy);

                    const z = (i / 5) * (this.zMax * 2) - this.zMax;
                    const meshz = new THREE.Mesh(
                        new TextGeometry(`${ z.toFixed(2) }`, {
                            font: font,
                            size: 0.35,
                            height: 0.1,
                        }),
                        this.fontMaterial,
                    );
                    meshz.position.set(
                        lengthAllGrids * 1.1,
                        (-0.5 * lengthAllGrids) / numGrids,
                        ((z + this.zMax) * lengthAllGrids) / (this.zMax * 2),
                    );
                    meshz.quaternion.copy(this.camera.quaternion);
                    this.scene.add(meshz);

                    this.xMeshs.push(meshx);
                    this.yMeshs.push(meshy);
                    this.zMeshs.push(meshz);
                }

                const meshx = new THREE.Mesh(
                    new TextGeometry('X', {
                        font: font,
                        size: 0.35,
                        height: 0.1,
                    }),
                    this.fontMaterial,
                );
                meshx.position.set(
                    lengthAllGrids * 1.05,
                    (-0.5 * lengthAllGrids) / numGrids,
                    lengthAllGrids * 1.1,
                );
                this.scene.add(meshx);
                meshx.quaternion.copy(this.camera.quaternion);
                this.xMeshs.push(meshx);

                const meshy = new THREE.Mesh(
                    new TextGeometry('Y', {
                        font: font,
                        size: 0.35,
                        height: 0.1,
                    }),
                    this.fontMaterial,
                );
                meshy.position.set(
                    (-0.5 * lengthAllGrids) / numGrids,
                    lengthAllGrids * 1.05,
                    lengthAllGrids * 1.1,
                );
                this.scene.add(meshy);
                meshy.quaternion.copy(this.camera.quaternion);
                this.yMeshs.push(meshy);

                const meshz = new THREE.Mesh(
                    new TextGeometry('Z', {
                        font: font,
                        size: 0.35,
                        height: 0.1,
                    }),
                    this.fontMaterial,
                );
                meshz.position.set(
                    lengthAllGrids * 1.1,
                    (-0.5 * lengthAllGrids) / numGrids,
                    lengthAllGrids * 1.05,
                );
                this.scene.add(meshz);
                meshz.quaternion.copy(this.camera.quaternion);
                this.zMeshs.push(meshz);
            },
        );
    }

    removeAllLabels() {
        this.xMeshs.forEach((mesh) => {
            this.scene.remove(mesh);
        });
        this.yMeshs.forEach((mesh) => {
            this.scene.remove(mesh);
        });
        this.zMeshs.forEach((mesh) => {
            this.scene.remove(mesh);
        });
        this.xMeshs = [];
        this.yMeshs = [];
        this.zMeshs = [];
    }

    getDomElement() {
        return this.renderer.domElement;
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    resize(offsetWidth) {
        this.offsetWidth = offsetWidth;
        this.width = (80 / 100) * offsetWidth;
        this.height = this.width;
        this.renderer.setSize(this.width, this.height);
    }

    clear() {
        this.positions = {};
        this.all_time = [];
        this.lastTime = null;
        this.xMax = 1;
        this.yMax = 1;
        this.zMax = 1;

        for (const key in this.trajectory) {
            this.scene.remove(this.trajectoryLine[key]);
            this.trajectoryLine[key].geometry.dispose();
            this.trajectoryLine[key].material.dispose();
            delete this.trajectoryLine[key];
            delete this.trajectory[key];
        }
    }

    cancel() {
        this.PointForTrajectory = null;
        this.JointForTrajectory = null;
        this.clear();
    }

    addPosition(time, value) {
        if (value) {
            if (this.lastTime && time < this.lastTime) {
                this.clear();
            }

            // value will be {robot: {x: 1, y: 2, z: 3}, ...}
            this.positions[time] = value;
            this.all_time.push(time);
            this.lastTime = time;

            // This is for update the max value of x, y, z, not used for now
            // for (const key in value) {
            //     const x = value[key].x;
            //     const y = value[key].y;
            //     const z = value[key].z;
            //     let flag = false;

            //     if (x > this.xMax || x < -this.xMax) {
            //         this.xMax = Math.abs(x);
            //         flag = true;
            //     }
            //     if (y > this.yMax || y < -this.yMax) {
            //         this.yMax = Math.abs(y);
            //         flag = true;
            //     }
            //     if (z > this.zMax || z < -this.zMax) {
            //         this.zMax = Math.abs(z);
            //         flag = true;
            //     }
            //     if (flag) {
            //         this.removeAllLabels();
            //         this.addLabels();
            //     }
            // }

            if (this.PointForTrajectory === null) return;
            for (const key in value) {
                if (!this.trajectory[key]) {
                    this.trajectory[key] = [];
                    const line = new THREE.Line(
                        new THREE.BufferGeometry().setFromPoints(
                            this.trajectory[key],
                        ),
                        new THREE.LineBasicMaterial({
                            color: globalVariables.colorForPointTrajectory[key],
                            transparent: true,
                            opacity: 1,
                        }),
                    );
                    this.scene.add(line);
                    this.trajectoryLine[key] = line;
                }
                const position = new THREE.Vector3(
                    ((value[key].x + this.xMax) * lengthAllGrids) /
                        (this.xMax * 2),
                    ((value[key].y + this.yMax) * lengthAllGrids) /
                        (this.yMax * 2),
                    ((value[key].z + this.zMax) * lengthAllGrids) /
                        (this.zMax * 2),
                );
                this.trajectory[key].push(position);
                if (this.trajectory[key].length > 100) {
                    this.trajectory[key].shift();
                }
                this.trajectoryLine[key].geometry.setFromPoints(
                    this.trajectory[key],
                );
            }
        }
    }

    updatePlotOnTime() {
        this.render();
    }

}
