import * as THREE from 'three';

export class AxesScene {

    constructor(renderer) {
        this.renderer = renderer;
        const axesScene = new THREE.Scene();
        // const axesHelper = new THREE.AxesHelper(1);
        // axesScene.add(axesHelper);
        const axesCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        axesCamera.position.z = 2;
        axesCamera.lookAt(new THREE.Vector3(0, 0, 0));

        this.scene = axesScene;
        this.camera = axesCamera;

        const axesLength = 1;
        // X axis - Red
        const xAxisGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(axesLength, 0, 0),
        ]);
        const xAxisMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
        const xAxis = new THREE.Line(xAxisGeometry, xAxisMaterial);
        xAxis.name = 'xAxis';

        // Y axis - Green
        const yAxisGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, axesLength, 0),
        ]);
        const yAxisMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
        const yAxis = new THREE.Line(yAxisGeometry, yAxisMaterial);
        yAxis.name = 'yAxis';

        // Z axis - Blue
        const zAxisGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, axesLength),
        ]);
        const zAxisMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
        const zAxis = new THREE.Line(zAxisGeometry, zAxisMaterial);
        zAxis.name = 'zAxis';

        axesScene.add(xAxis);
        axesScene.add(yAxis);
        axesScene.add(zAxis);

        this.xAxis = xAxis;
        this.yAxis = yAxis;
        this.zAxis = zAxis;

        // this.axesHelper = axesHelper;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.renderer.domElement.addEventListener(
            'mousemove',
            this.onhover.bind(this),
        );
        this.renderer.domElement.addEventListener(
            'click',
            this.onClick.bind(this),
        );
        this.width = 0;
        this.height = 0;
        this.sceneLength = 100;
        this.hoveredAxis = null;
    }

    render(camera) {
        this.camera.rotation.copy(camera.rotation);
        this.camera.position.copy(camera.position);

        // render the axes scene as an overlay
        this.renderer.autoClear = false;
        this.renderer.clearDepth();
        this.width = this.renderer.domElement.width;
        this.height = this.renderer.domElement.height;
        // Set the viewport for the axes for left top corner
        const startLeft = this.width * 0.15;
        const startTop = this.height * 0.65;
        this.renderer.setViewport(
            startLeft,
            startTop,
            this.sceneLength,
            this.sceneLength,
        );
        this.renderer.render(this.scene, this.camera);
        this.renderer.setViewport(0, 0, this.width, this.height);
        this.renderer.autoClear = true;
    }

    updateMousePosition(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const offsetLeft = rect.left + this.width * 0.15;
        const offsetTop = rect.top + this.height * 0.35 - this.sceneLength;
        this.mouse.x =
            ((event.clientX - offsetLeft) / this.sceneLength) * 2 - 1;
        this.mouse.y =
            -((event.clientY - offsetTop) / this.sceneLength) * 2 + 1 - 0.135;
    }

    checkIntersection() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(
            this.scene.children,
            false,
        );
        return intersects;
    }
    onhover(event) {
        this.updateMousePosition(event);
        const intersects = this.checkIntersection();
        if (intersects.length > 0) {
            const intersect = intersects[0];
            this.hoveredAxis = intersect.object.name;
            // make the hovered axis thicker
            if (this.hoveredAxis === 'xAxis') {
                this.xAxis.material.color = new THREE.Color(0xffffff);
                this.yAxis.material.color = new THREE.Color(0x00ff00);
                this.zAxis.material.color = new THREE.Color(0x0000ff);
            }
            if (this.hoveredAxis === 'yAxis') {
                this.yAxis.material.color = new THREE.Color(0xffffff);
                this.xAxis.material.color = new THREE.Color(0xff0000);
                this.zAxis.material.color = new THREE.Color(0x0000ff);
            }
            if (this.hoveredAxis === 'zAxis') {
                this.zAxis.material.color = new THREE.Color(0xffffff);
                this.xAxis.material.color = new THREE.Color(0xff0000);
                this.yAxis.material.color = new THREE.Color(0x00ff00);
            }
            const event = new CustomEvent('axis-hover', {
                detail: this.hoveredAxis,
            });
            this.renderer.domElement.dispatchEvent(event);
        } else if (this.hoveredAxis) {
            this.hoveredAxis = null;
            this.xAxis.material.color = new THREE.Color(0xff0000);
            this.yAxis.material.color = new THREE.Color(0x00ff00);
            this.zAxis.material.color = new THREE.Color(0x0000ff);

            const event = new CustomEvent('axis-hover', {
                detail: null,
            });
            this.renderer.domElement.dispatchEvent(event);
        }
    }

    onClick(event) {
        if (this.hoveredAxis) {
            const event = new CustomEvent('axis-click', {
                detail: this.hoveredAxis,
            });
            this.renderer.domElement.dispatchEvent(event);
        }
    }

}
