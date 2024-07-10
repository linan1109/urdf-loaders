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

        this.points = {};
    }

    clearTrajectory() {
        for (const key in this.trajectory) {
            this.scene.remove(this.trajectoryLine[key]);
            this.trajectoryLine[key].geometry.dispose();
            this.trajectoryLine[key].material.dispose();
            delete this.trajectoryLine[key];
            delete this.trajectory[key];
            this.scene.remove(this.points[key]);
            this.points[key].geometry.dispose();
            this.points[key].material.dispose();
            delete this.points[key];
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
            this.trajectoryLine[key].geometry.setFromPoints(
                this.trajectory[key],
            );
            pointWorldPosList[key] = pointWorldPos;
            this.points[key].position.copy(pointWorldPos);
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
                new THREE.BufferGeometry().setFromPoints(this.trajectory[key]),
                new THREE.LineBasicMaterial({
                    color: globalVariables.colorForPointTrajectory[key],
                    transparent: true,
                    opacity: 1,
                }),
            );

            const pointGeometry = new THREE.SphereGeometry(0.005, 32, 32);
            this.points[key] = new THREE.Mesh(
                pointGeometry,
                new THREE.MeshBasicMaterial({
                    color: globalVariables.colorForPointTrajectoryPoint,
                }),
            );
            // find the joint for this robot
            robot.traverse((child) => {
                if (child.name === this.jointName) {
                    this.joints[key] = child;
                }
            });
            this.scene.add(this.trajectoryLine[key]);
            this.scene.add(this.points[key]);
        }
        this.updateTrajectory();
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
            this.points[key].visible = false;
        }
    }

    show() {
        for (const key in this.trajectory) {
            this.trajectoryLine[key].visible = true;
            this.points[key].visible = true;
        }
    }

}
