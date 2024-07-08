import * as THREE from 'three';
import globalVariables from '../utils/global-variables.js';
export class PointTrajectory {

    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.PointForTrajectory = null;
        this.JointForTrajectory = null;

        this.robots = {};
        this.joints = {};
        this.jointName = null;
        this.trajectory = {};
        this.trajectoryLine = {};
    }

    clearTrajectory() {
        for (const key in this.trajectory) {
            this.scene.remove(this.trajectoryLine[key]);
            this.trajectoryLine[key].geometry.dispose();
            this.trajectoryLine[key].material.dispose();
            delete this.trajectoryLine[key];
            delete this.trajectory[key];
        }
    }

    cancelTrajectory() {
        this.PointForTrajectory = null;
        this.JointForTrajectory = null;
        this.clearTrajectory();
    }

    updateTrajectory() {
        if (this.PointForTrajectory === null) return;
        const point = this.PointForTrajectory;
        const pointWorldPosList = {};
        for (const key in this.trajectory) {
            const joint = this.joints[key];
            const pointWorldPos = point.clone().applyMatrix4(joint.matrixWorld);
            this.trajectory[key].push(pointWorldPos);
            if (this.trajectory[key].length > 100) {
                this.trajectory[key].shift();
            }
            this.trajectoryLine[key].geometry.setFromPoints(this.trajectory[key]);
            pointWorldPosList[key] = pointWorldPos;
        }
        return pointWorldPosList;
    }

    updateRobots(Robots) {
        // clear all old trajectory
        this.clearTrajectory();
        this.robots = Robots;
        for (const key in Robots) {
            const robot = Robots[key];
            this.trajectory[key] = [];
            this.trajectoryLine[key] = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(
                    this.trajectory[key],
                ),
                new THREE.LineBasicMaterial({
                    color: globalVariables.colorForPointTrajectory[key],
                    transparent: true,
                    opacity: 1,
                }),
            );

            // find the joint for this robot
            robot.traverse((child) => {
                if (child.name === this.jointName) {
                    this.joints[key] = child;
                }
            });
            this.scene.add(this.trajectoryLine[key]);
        }
    }

    updateSelectedPoint(joint, robot, point) {
        this.PointForTrajectory = point;
        this.clearTrajectory();

        this.jointName = joint.name;
        this.updateRobots(this.robots);
    }

    hasPointSelected() {
        return this.PointForTrajectory !== null;
    }

    hide() {
        for (const key in this.trajectory) {
            this.trajectoryLine[key].visible = false;
        }
    }

    show() {
        for (const key in this.trajectory) {
            this.trajectoryLine[key].visible = true;
        }
    }

}
