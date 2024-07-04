import * as THREE from 'three';
import globalVariables from '../utils/global-variables.js';
export class PointTrajectory {

    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;

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
    }

    clearTrajectory() {
        this.trajectoryList = [];
        this.trajectoryLine.geometry.setFromPoints(this.trajectoryList);
    }

    cancelTrajectory() {
        this.PointForTrajectory = null;
        this.JointForTrajectory = null;
        this.robotForTrajectory = null;
        this.clearTrajectory();
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
        return pointWorldPos;
    }

    hasTrajectory() {
        return this.trajectoryList.length > 0;
    }

    hasPointSelected() {
        return this.PointForTrajectory !== null;
    }

    hide() {
        this.trajectoryLine.visible = false;
    }

    show() {
        this.trajectoryLine.visible = true;
    }

}
