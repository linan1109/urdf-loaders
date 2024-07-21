import globalVariables from './global-variables';

class MovementContainer {

    constructor() {
        this.robotNums = [];
        this.movementDict = {};
        this.velocity = {};
        this.jointForce = {};
        this.update_steps = {};
    }

    splitMovement(input) {
        const velocity = [];
        const movement = [];
        const force = [];
        const updates = [];
        for (const key in input) {
            const oneMov = {};
            const oneVel = {};
            const oneForce = {};
            const oneStep = {
                step: input[key].step,
                update: input[key].update,
            };
            for (const joint in globalVariables.nameObsMap) {
                oneMov[joint] = input[key][joint];
                oneVel[joint] = input[key][joint + '_angVel'];
                oneForce[joint] = input[key][joint + '_force'];
            }
            movement.push(oneMov);
            velocity.push(oneVel);
            force.push(oneForce);
            updates.push(oneStep);
        }
        console.log('movement', movement);
        console.log('velocity', velocity);
        console.log('force', force);
        return { movement, velocity, force, updates };
    }

    addMovement(robotNum, input) {
        robotNum = parseInt(robotNum);
        this.robotNums.push(robotNum);
        const { movement, velocity, force, updates } = this.splitMovement(input);
        this.movementDict[robotNum] = movement;
        this.velocity[robotNum] = velocity;
        this.jointForce[robotNum] = force;
        this.update_steps[robotNum] = updates;
    }

    getMovement(robotNum) {
        robotNum = parseInt(robotNum);
        if (!this.hasMovement(robotNum)) {
            console.error('No movement found for robotNum', robotNum);
            return null;
        }
        return this.movementDict[robotNum];
    }

    getVelocity(robotNum) {
        robotNum = parseInt(robotNum);
        if (!this.hasMovement(robotNum)) {
            console.error('No movement found for robotNum', robotNum);
            return null;
        }
        return this.velocity[robotNum];
    }

    getJointForce(robotNum) {
        robotNum = parseInt(robotNum);
        if (!this.hasMovement(robotNum)) {
            console.error('No movement found for robotNum', robotNum);
            return null;
        }
        return this.jointForce[robotNum];
    }

    hasMovement(robotNum) {
        robotNum = parseInt(robotNum);
        return this.robotNums.includes(robotNum);
    }

    hasAnyMovement() {
        return this.robotNums.length > 0;
    }

    removeMovement(robotNum) {
        robotNum = parseInt(robotNum);
        if (!this.hasMovement(robotNum)) {
            return;
        }
        const index = this.robotNums.indexOf(robotNum);
        this.robotNums.splice(index, 1);
        delete this.movementDict[robotNum];
        delete this.velocity[robotNum];
    }

}

const movementContainer = new MovementContainer();
export default movementContainer;
