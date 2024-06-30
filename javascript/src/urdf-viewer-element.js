import * as THREE from 'three';
import { MeshPhongMaterial } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import URDFLoader from './URDFLoader.js';
import globalVariables from './utils/global-variables.js';
// import { index, timeout } from 'd3';

const tempVec2 = new THREE.Vector2();
const emptyRaycast = () => {};

// urdf-viewer element
// Loads and displays a 3D view of a URDF-formatted robot

// Events
// urdf-change: Fires when the URDF has finished loading and getting processed
// urdf-processed: Fires when the URDF has finished loading and getting processed
// geometry-loaded: Fires when all the geometry has been fully loaded
// ignore-limits-change: Fires when the 'ignore-limits' attribute changes
// angle-change: Fires when an angle changes
// position-change: Fires when an position changes
// rotation-change: Fires when an rotation changes
// init-position-change: Fires when an initial position changes
export default class URDFViewer extends HTMLElement {

    static get observedAttributes() {
        return [
            'package',
            'urdf',
            'up',
            'display-shadow',
            'ambient-color',
            'ignore-limits',
            'show-collision',
            'show-grid',
            'use-wireframe',
        ];
    }

    get package() {
        return this.getAttribute('package') || '';
    }
    set package(val) {
        this.setAttribute('package', val);
    }

    get urdf() {
        return this.getAttribute('urdf') || '';
    }
    set urdf(val) {
        this.setAttribute('urdf', val);
    }

    get ignoreLimits() {
        return this.hasAttribute('ignore-limits') || false;
    }
    set ignoreLimits(val) {
        val
            ? this.setAttribute('ignore-limits', val)
            : this.removeAttribute('ignore-limits');
    }

    get up() {
        return this.getAttribute('up') || '+Z';
    }
    set up(val) {
        this.setAttribute('up', val);
    }

    get displayShadow() {
        return this.hasAttribute('display-shadow') || false;
    }
    set displayShadow(val) {
        val
            ? this.setAttribute('display-shadow', '')
            : this.removeAttribute('display-shadow');
    }

    get ambientColor() {
        return this.getAttribute('ambient-color') || '#8ea0a8';
    }
    set ambientColor(val) {
        val
            ? this.setAttribute('ambient-color', val)
            : this.removeAttribute('ambient-color');
    }

    get autoRedraw() {
        return this.hasAttribute('auto-redraw') || false;
    }
    set autoRedraw(val) {
        val
            ? this.setAttribute('auto-redraw', true)
            : this.removeAttribute('auto-redraw');
    }

    get noAutoRecenter() {
        return this.hasAttribute('no-auto-recenter') || false;
    }
    set noAutoRecenter(val) {
        val
            ? this.setAttribute('no-auto-recenter', true)
            : this.removeAttribute('no-auto-recenter');
    }

    get showCollision() {
        return this.hasAttribute('show-collision') || false;
    }
    set showCollision(val) {
        val
            ? this.setAttribute('show-collision', true)
            : this.removeAttribute('show-collision');
    }

    get showGrid() {
        // default to false
        return this.hasAttribute('show-grid') || false;
    }
    set showGrid(val) {
        val
            ? this.setAttribute('show-grid', true)
            : this.removeAttribute('show-grid');
    }

    get useWireframe() {
        return this.hasAttribute('use-wireframe') || false;
    }
    set useWireframe(val) {
        val
            ? this.setAttribute('use-wireframe', true)
            : this.removeAttribute('use-wireframe');
    }

    // get jointValues() {

    //     const values = {};
    //     if (this.robot) {

    //         for (const name in this.robot.joints) {

    //             const joint = this.robot.joints[name];
    //             values[name] = joint.jointValue.length === 1 ? joint.angle : [...joint.jointValue];

    //         }

    //     }

    //     return values;

    // }
    // set jointValues(val) { this.setJointValues(val); }

    // get angles() {

    //     return this.jointValues;

    // }
    // set angles(v) {

    //     this.jointValues = v;

    // }

    /* Lifecycle Functions */
    constructor() {
        super();

        this._requestId = 0;
        this._dirty = false;
        this._loadScheduled = false;
        this.robots = {};
        this.loadMeshFunc = null;
        this.urlModifierFunc = null;

        // Init Robots
        this.robotNames = [0];
        this.initialPositions = [[0, 0, 0]];
        // colors for highlighting
        this.robotColors = this.robotNames.reduce((acc, name) => {
            acc[name] = {};
            return acc;
        }, {});

        // Scene setup
        const scene = new THREE.Scene();

        const ambientLight = new THREE.HemisphereLight(
            this.ambientColor,
            '#000',
        );
        ambientLight.groundColor.lerp(ambientLight.color, 0.5);
        ambientLight.intensity = 0.5;
        ambientLight.position.set(0, 1, 0);
        scene.add(ambientLight);

        // Light setup
        const dirLight = new THREE.DirectionalLight(0xffffff);
        dirLight.position.set(4, 10, 1);
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.normalBias = 0.001;
        dirLight.castShadow = true;
        dirLight.intensity = 0.0;
        scene.add(dirLight);
        scene.add(dirLight.target);

        // Renderer setup
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        });
        renderer.setClearColor(0xffffff);
        renderer.setClearAlpha(0);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        // Camera setup
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        camera.position.z = -10;

        // World setup
        const world = new THREE.Object3D();
        scene.add(world);

        // Add a stationary object
        const boxGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(boxGeometry, material);
        scene.add(cube);

        // Add the grid
        const imageCanvas = document.createElement('canvas');
        const context = imageCanvas.getContext('2d');

        imageCanvas.width = imageCanvas.height = 128;

        context.fillStyle = '#444';
        context.fillRect(0, 0, 128, 128);

        context.fillStyle = '#fff';
        context.fillRect(0, 0, 64, 64);
        context.fillRect(64, 64, 64, 64);

        const textureCanvas = new THREE.CanvasTexture(imageCanvas);
        textureCanvas.colorSpace = THREE.SRGBColorSpace;
        textureCanvas.repeat.set(200, 200);
        textureCanvas.wrapS = THREE.RepeatWrapping;
        textureCanvas.wrapT = THREE.RepeatWrapping;

        const materialCanvas = new THREE.MeshBasicMaterial({
            map: textureCanvas,
        });

        const geometry = new THREE.PlaneGeometry(40, 40);

        const meshCanvas = new THREE.Mesh(geometry, materialCanvas);
        meshCanvas.rotation.x = -Math.PI / 2;
        meshCanvas.scale.set(10, 10, 10);
        meshCanvas.receiveShadow = true;
        meshCanvas.position.y = -0.5;
        scene.add(meshCanvas);
        if (!this.showGrid) meshCanvas.visible = false;

        // Add a plane to catch shadows
        const shadowPlane = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(40, 40),
            new THREE.ShadowMaterial({
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.5,
            }),
        );
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.position.y = -0.5;
        shadowPlane.receiveShadow = true;
        shadowPlane.scale.set(10, 10, 10);
        scene.add(shadowPlane);

        // Controls setup
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.rotateSpeed = 2.0;
        controls.zoomSpeed = 5;
        controls.panSpeed = 2;
        controls.enableZoom = true;
        controls.enableDamping = false;
        controls.maxDistance = 50;
        controls.minDistance = 0.25;
        controls.addEventListener('change', () => this.recenter());

        this.scene = scene;
        this.world = world;
        this.renderer = renderer;
        this.camera = camera;
        this.controls = controls;
        this.plane = meshCanvas;
        this.shadowPlane = shadowPlane;
        this.meshCanvas = meshCanvas;
        this.directionalLight = dirLight;
        this.ambientLight = ambientLight;

        this.trajectoryList = [];
        this.PointForTrajectory = null;
        this.JointForTrajectory = null;
        const trajectoryGeometry = new THREE.BufferGeometry().setFromPoints(
            this.trajectoryList,
        );
        this.trajectoryMaterial = new THREE.LineBasicMaterial({
            color: globalVariables.colorForPointTrajectory,
            transparent: true,
            opacity: 1,
        });
        this.trajectoryLine = new THREE.Line(
            trajectoryGeometry,
            this.trajectoryMaterial,
        );
        scene.add(this.trajectoryLine);

        this._setUp(this.up);

        this._collisionMaterial = new MeshPhongMaterial({
            transparent: true,
            opacity: 0.35,
            shininess: 2.5,
            premultipliedAlpha: true,
            color: 0xffbe38,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1,
        });

        const _renderLoop = () => {
            if (this.parentNode) {
                this.updateSize();

                if (this._dirty || this.autoRedraw) {
                    if (!this.noAutoRecenter) {
                        this._updateEnvironment();
                    }

                    this.renderer.render(scene, camera);
                    this._dirty = false;
                }

                // update controls after the environment in
                // case the controls are retargeted
                this.controls.update();
            }
            this._renderLoopId = requestAnimationFrame(_renderLoop);
        };
        _renderLoop();
    }

    connectedCallback() {
        // Add our initialize styles for the element if they haven't
        // been added yet
        if (!this.constructor._styletag) {
            const styletag = document.createElement('style');
            styletag.innerHTML = `
                ${ this.tagName } { display: block; }
                ${ this.tagName } canvas {
                    width: 100%;
                    height: 100%;
                }
            `;
            document.head.appendChild(styletag);
            this.constructor._styletag = styletag;
        }

        // add the renderer
        if (this.childElementCount === 0) {
            this.appendChild(this.renderer.domElement);
        }

        this.updateSize();
        requestAnimationFrame(() => this.updateSize());
    }

    disconnectedCallback() {
        cancelAnimationFrame(this._renderLoopId);
    }

    attributeChangedCallback(attr, oldval, newval) {
        this._updateCollisionVisibility();
        if (!this.noAutoRecenter) {
            this.recenter();
        }

        switch (attr) {

            case 'package':
            case 'urdf': {
                this._scheduleLoad();
                break;
            }

            case 'up': {
                this._setUp(this.up);
                break;
            }

            case 'ambient-color': {
                this.ambientLight.color.set(this.ambientColor);
                this.ambientLight.groundColor
                    .set('#000')
                    .lerp(this.ambientLight.color, 0.5);
                break;
            }

            case 'ignore-limits': {
                this._setIgnoreLimits(this.ignoreLimits, true);
                break;
            }

        }
    }

    /* Public API */
    updateSize() {
        const r = this.renderer;
        const w = this.clientWidth;
        const h = this.clientHeight;
        const currSize = r.getSize(tempVec2);

        if (currSize.width !== w || currSize.height !== h) {
            this.recenter();
        }

        r.setPixelRatio(window.devicePixelRatio);
        r.setSize(w, h, false);

        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();

        this.updateTrajectory();
    }

    updateTrajectory() {
        if (this.PointForTrajectory === null) return;
        const point = this.PointForTrajectory;
        const joint = this.JointForTrajectory;
        const pointWorldPos = point.clone().applyMatrix4(joint.matrixWorld);
        this.trajectoryList.push(pointWorldPos);
        if (this.trajectoryList.length > 100) {
            this.trajectoryList.shift();
        }
        this.trajectoryLine.geometry.setFromPoints(this.trajectoryList);
        // this.trajectoryMaterial.opacity *= 0.99;
        // if (this.trajectoryMaterial.opacity < 0.01) {
        //     this.trajectoryMaterial.opacity = 1;
        // }
    }

    redraw() {
        this._dirty = true;
    }

    recenter() {
        this._updateEnvironment();
        this.redraw();
    }

    deleteOne(robotName) {
        if (!this.robots[robotName]) return;
        this.robots[robotName].traverse((c) => c.dispose && c.dispose());
        this.robots[robotName].parent.remove(this.robots[robotName]);
        delete this.robots[robotName];

        const index = this.robotNames.indexOf(robotName);
        this.robotNames.splice(index, 1);
        this.initialPositions.splice(index, 1);

        this.redraw();
    }

    addOneRobot(robotName, initialPosition) {
        this.robotNames.push(robotName);
        this.initialPositions.push(initialPosition);
        this.robotColors[robotName] = {};
        this._scheduleLoad();

        // this._loadUrdf(this.package, this.urdf, robotName, initialPosition);
        // this._loadScheduled = false;
        // this._updateCollisionVisibility();
        // this._storeRobotColors();
        // this.dispatchEvent(
        //     new CustomEvent('urdf-processed', {
        //         bubbles: true,
        //         cancelable: true,
        //         composed: true,
        //     }),
        // );
        // this.dispatchEvent(
        //     new CustomEvent('geometry-loaded', {
        //         bubbles: true,
        //         cancelable: true,
        //         composed: true,
        //     }),
        // );
        // this.recenter();
    }

    // Set the joint with jointName to
    // angle in degrees
    setJointValue(robot, jointName, ...values) {
        if (!this.robots[robot]) return;
        if (!this.robots[robot].joints[jointName]) return;
        if (this.robots[robot].joints[jointName].setJointValue(...values)) {
            this.redraw();
            this.dispatchEvent(
                new CustomEvent('angle-change', {
                    bubbles: true,
                    cancelable: true,
                    detail: jointName,
                }),
            );
        }
    }
    setJointValues(values) {
        for (const name in values) this.setJointValue(name, values[name]);
    }

    getRobotInitPosition(robot, index) {
        if (!this.robots[robot]) return;
        return this.robots[robot].initPosition[index];
    }

    setRobotInitPosition(robot, index, position) {
        if (!this.robots[robot]) return;
        const currentInitPosition = this.robots[robot].initPosition;
        const newInitPosition = [
            index === 0 ? position : currentInitPosition[0],
            index === 1 ? position : currentInitPosition[1],
            index === 2 ? position : currentInitPosition[2],
        ];
        const currentPos = this.robots[robot].position;
        if (
            this.robots[robot].position.set(
                newInitPosition[0] + currentPos.x - currentInitPosition[0],
                newInitPosition[1] + currentPos.y - currentInitPosition[1],
                newInitPosition[2] + currentPos.z - currentInitPosition[2],
            )
        ) {
            currentInitPosition[0] = newInitPosition[0];
            currentInitPosition[1] = newInitPosition[1];
            currentInitPosition[2] = newInitPosition[2];
            this.redraw();
            this.dispatchEvent(
                new CustomEvent('position-change', {
                    bubbles: true,
                    cancelable: true,
                    detail: { robot, position },
                }),
            );
        }
    }

    setRobotPosition(robot, positions) {
        if (!this.robots[robot]) return;
        if (this.robots[robot].standStill) return;
        const initPosition = this.robots[robot].initPosition;
        if (
            this.robots[robot].position.set(
                parseFloat(positions.x) + initPosition[0],
                parseFloat(positions.y) + initPosition[1],
                parseFloat(positions.z) + initPosition[2],
            )
        ) {
            this.redraw();
            this.dispatchEvent(
                new CustomEvent('position-change', {
                    bubbles: true,
                    cancelable: true,
                    detail: { robot, positions },
                }),
            );
        }
    }

    setRobotRotation(robot, rotations) {
        if (!this.robots[robot]) return;
        if (this.robots[robot].standStill) return;
        if (
            this.robots[robot].rotation.set(
                rotations.x,
                rotations.y,
                rotations.z,
            )
        ) {
            this.redraw();
            this.dispatchEvent(
                new CustomEvent('rotation-change', {
                    bubbles: true,
                    cancelable: true,
                    detail: { robot, rotations },
                }),
            );
        }
    }

    setRobotStandStill(robot, standStill) {
        if (!this.robots[robot]) return;
        this.robots[robot].standStill = standStill;
        const initPosition = this.robots[robot].initPosition;
        if (standStill) {
            if (
                this.robots[robot].position.set(
                    initPosition[0],
                    initPosition[1],
                    initPosition[2],
                ) &&
                this.robots[robot].rotation.set(0, 0, 0)
            ) {
                this.redraw();
            }
        }
    }

    setRobotVisibility(robot, visibility) {
        if (!this.robots[robot]) return;
        this.robots[robot].traverse((c) => {
            if (c.isMesh && !c.parent.isURDFCollider) {
                c.visible = visibility;
            }
        });
        this.redraw();
        this.dispatchEvent(
            new CustomEvent('visibility-change', {
                bubbles: true,
                cancelable: true,
            }),
        );
    }

    setRobotHighlight(robot, highlight) {
        if (!this.robots[robot]) return;
        if (highlight) {
            this.robots[robot].traverse((c) => {
                if (c.isMesh) {
                    if (c.material.color) {
                        c.material.color.setHex(0xff0000);
                    }
                }
            });
        } else {
            this.robots[robot].traverse((c) => {
                if (c.isMesh) {
                    if (c.material.color) {
                        c.material.color = new THREE.Color(
                            this.robotColors[robot][c.material.uuid],
                        );
                    }
                }
            });
        }
        this.redraw();
        this.dispatchEvent(
            new CustomEvent('highlight-change', {
                bubbles: true,
                cancelable: true,
            }),
        );
    }

    showMeshPlane(show) {
        this.showGrid = show;
        this.meshCanvas.visible = show;
        this.redraw();
    }

    changeWireframe(show) {
        this.useWireframe = show;
        for (const robot in this.robots) {
            if (this.robots[robot]) {
                this.robots[robot].traverse((c) => {
                    if (c.isMesh) {
                        c.material.wireframe = show;
                    }
                });
            }
        }
        this.redraw();
    }

    snapShot() {
        this.renderer.render(this.scene, this.camera);
        const imgDataURL = this.renderer.domElement.toDataURL('image/png');

        const img = new Image();
        img.src = imgDataURL;

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = img.width;
            canvas.height = img.height;

            ctx.drawImage(img, 0, 0);

            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;

            let top = canvas.height;
            let bottom = 0;
            let left = canvas.width;
            let right = 0;

            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const index = (y * canvas.width + x) * 4;
                    const alpha = data[index + 3];
                    if (alpha > 0) {
                        if (y < top) top = y;
                        if (y > bottom) bottom = y;
                        if (x < left) left = x;
                        if (x > right) right = x;
                    }
                }
            }

            const width = right - left + 1;
            const height = bottom - top + 1;

            const newCanvas = document.createElement('canvas');
            const newCtx = newCanvas.getContext('2d');

            newCanvas.width = width;
            newCanvas.height = height;

            newCtx.drawImage(
                canvas,
                left,
                top,
                width,
                height,
                0,
                0,
                width,
                height,
            );

            const newImg = new Image();
            newImg.src = newCanvas.toDataURL('image/png');
            newImg.onload = () => {
                this.dispatchEvent(
                    new CustomEvent('snapshot', {
                        bubbles: true,
                        cancelable: true,
                        composed: true,
                        detail: newImg,
                    }),
                );
            };
        };
    }

    findRobotByUUID(uuid) {
        let index = -1;
        for (const robot in this.robots) {
            index++;
            if (this.robots[robot].uuid === uuid) {
                break;
            }
        }
        return index;
    }

    /* Private Functions */
    // Updates the position of the plane to be at the
    // lowest point below the robot and focuses the
    // camera on the center of the scene
    _updateEnvironment() {
        // need to update to select one robot to focus on
        const bbox = new THREE.Box3();
        bbox.makeEmpty();
        // for (const robot of this.robots) {
        for (let index = 0; index < Object.keys(this.robots).length; index++) {
            const robot = this.robots[Object.keys(this.robots)[index]];
            if (!robot) return;

            this.world.updateMatrixWorld();

            robot.traverse((c) => {
                if (c.isURDFVisual) {
                    bbox.expandByObject(c);
                }
            });

            const center = bbox.getCenter(new THREE.Vector3());
            this.controls.target.y = center.y;
            this.plane.position.y = bbox.min.y - 1e-3;
            this.shadowPlane.position.y = this.plane.position.y;

            const dirLight = this.directionalLight;
            dirLight.castShadow = this.displayShadow;

            if (this.displayShadow) {
                // Update the shadow camera rendering bounds to encapsulate the
                // model. We use the bounding sphere of the bounding box for
                // simplicity -- this could be a tighter fit.
                const sphere = bbox.getBoundingSphere(new THREE.Sphere());
                const minmax = sphere.radius;
                const cam = dirLight.shadow.camera;
                cam.left = cam.bottom = -minmax;
                cam.right = cam.top = minmax;

                // Update the camera to focus on the center of the model so the
                // shadow can encapsulate it
                const offset = dirLight.position
                    .clone()
                    .sub(dirLight.target.position);
                dirLight.target.position.copy(center);
                dirLight.position.copy(center).add(offset);

                cam.updateProjectionMatrix();
            }
        }
    }

    _scheduleLoad() {
        // if (this._prevload === `${ this.package }|${ this.urdf }`) return;
        // this._prevload = `${ this.package }|${ this.urdf }`;

        // if no robots are defined, don't load anything
        if (this.robotNames.length === 0) {
            this.redraw();
            return;
        }

        if (this._loadScheduled) return;
        this._loadScheduled = true;

        for (const robot in this.robots) {
            if (this.robots[robot]) {
                this.robots[robot].traverse((c) => c.dispose && c.dispose());
                this.robots[robot].parent.remove(this.robots[robot]);
            }
        }
        this.robots = {};
        // console.log('schedule load');
        const initPromise = this._loadUrdf(
            this.package,
            this.urdf,
            this.robotNames[0],
            this.initialPositions[0],
        );

        this.initialPositions
            .slice(1)
            .reduce((currentPromise, position, index) => {
                return currentPromise.then(() =>
                    this._loadUrdf(
                        this.package,
                        this.urdf,
                        this.robotNames[index + 1],
                        position,
                    ),
                );
            }, initPromise)
            .then(() => {
                // console.log('load done');
                this._loadScheduled = false;
                this._updateCollisionVisibility();
                this._storeRobotColors();
                this.dispatchEvent(
                    new CustomEvent(`urdf-processed`, {
                        bubbles: true,
                        cancelable: true,
                        composed: true,
                    }),
                );
                this.dispatchEvent(
                    new CustomEvent('geometry-loaded', {
                        bubbles: true,
                        cancelable: true,
                        composed: true,
                    }),
                );
                this.recenter();
            });
    }

    _loadUrdf(pkg, urdf, robotName, pos) {
        return new Promise((resolve, reject) => {
            this.dispatchEvent(
                new CustomEvent('urdf-change', {
                    bubbles: true,
                    cancelable: true,
                    composed: true,
                }),
            );

            if (urdf) {
                this._requestId++;
                const requestId = this._requestId;

                const updateMaterials = (mesh) => {
                    mesh.traverse((c) => {
                        if (c.isMesh) {
                            c.castShadow = true;
                            c.receiveShadow = true;
                            if (c.material) {
                                const mats = (
                                    Array.isArray(c.material)
                                        ? c.material
                                        : [c.material]
                                ).map((m) => {
                                    if (m instanceof THREE.MeshBasicMaterial) {
                                        m = new THREE.MeshPhongMaterial();
                                    }
                                    if (m.map) {
                                        m.map.colorSpace = THREE.SRGBColorSpace;
                                    }
                                    m.wireframe = this.useWireframe;
                                    return m;
                                });
                                c.material = mats.length === 1 ? mats[0] : mats;
                            }
                        }
                    });
                };

                if (
                    pkg.includes(':') &&
                    pkg.split(':')[1].substring(0, 2) !== '//'
                ) {
                    pkg = pkg.split(',').reduce((map, value) => {
                        const split = value.split(/:/).filter((x) => !!x);
                        const pkgName = split.shift().trim();
                        const pkgPath = split.join(':').trim();
                        map[pkgName] = pkgPath;
                        return map;
                    }, {});
                }

                let robot = null;
                const manager = new THREE.LoadingManager();
                manager.onLoad = () => {
                    // If another request has come in to load a new
                    // robot, then ignore this one
                    if (this._requestId !== requestId) {
                        robot.traverse((c) => c.dispose && c.dispose());
                        return;
                    }
                    this.world.add(robot);
                    updateMaterials(robot);
                    robot.position.set(...pos);
                    this.robots[robotName] = robot;
                    this.robots[robotName].standStill = false;
                    this.robots[robotName].initPosition = pos;

                    this._setIgnoreLimits(this.ignoreLimits);
                    resolve();
                };

                if (this.urlModifierFunc) {
                    manager.setURLModifier(this.urlModifierFunc);
                }

                const loader = new URDFLoader(manager);
                loader.packages = pkg;
                loader.loadMeshCb = this.loadMeshFunc;
                loader.fetchOptions = {
                    mode: 'cors',
                    credentials: 'same-origin',
                };
                loader.parseCollision = true;
                loader.load(urdf, (model) => (robot = model));
            }
        });
    }

    _storeRobotColors() {
        for (const robot in this.robots) {
            this.robots[robot].traverse((c) => {
                if (c.isMesh) {
                    if (c.material.color) {
                        this.robotColors[robot][c.material.uuid] =
                            new THREE.Color(
                                c.material.color.r,
                                c.material.color.g,
                                c.material.color.b,
                            );
                    }
                }
            });
        }
    }

    _updateCollisionVisibility() {
        const showCollision = this.showCollision;
        const collisionMaterial = this._collisionMaterial;
        const colliders = [];

        for (const robot in this.robots) {
            if (this.robots[robot] === null) return;
            if (this.robots[robot]) {
                this.robots[robot].traverse((c) => {
                    if (c.isURDFCollider) {
                        c.visible = showCollision;
                        colliders.push(c);
                    }
                });
            }

            colliders.forEach((coll) => {
                coll.traverse((c) => {
                    if (c.isMesh) {
                        c.raycast = emptyRaycast;
                        c.material = collisionMaterial;
                        c.castShadow = false;
                    }
                });
            });
        }
    }

    // Watch the coordinate frame and update the
    // rotation of the scene to match
    _setUp(up) {
        if (!up) up = '+Z';
        up = up.toUpperCase();
        const sign = up.replace(/[^-+]/g, '')[0] || '+';
        const axis = up.replace(/[^XYZ]/gi, '')[0] || 'Z';

        const PI = Math.PI;
        const HALFPI = PI / 2;
        if (axis === 'X') {
            this.world.rotation.set(0, 0, sign === '+' ? HALFPI : -HALFPI);
        }
        if (axis === 'Z') {
            this.world.rotation.set(sign === '+' ? -HALFPI : HALFPI, 0, 0);
        }
        if (axis === 'Y') this.world.rotation.set(sign === '+' ? 0 : PI, 0, 0);
    }

    // Updates the current robot's angles to ignore
    // joint limits or not
    _setIgnoreLimits(ignore, dispatch = false) {
        for (const robot in this.robots) {
            if (robot) {
                Object.values(this.robots[robot].joints).forEach((joint) => {
                    joint.ignoreLimits = ignore;
                    joint.setJointValue(...joint.jointValue);
                });
            }
        }

        if (dispatch) {
            this.dispatchEvent(
                new CustomEvent('ignore-limits-change', {
                    bubbles: true,
                    cancelable: true,
                    composed: true,
                }),
            );
        }
    }

}
