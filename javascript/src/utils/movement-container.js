class MovementContainer {

    constructor() {
        this.robotNums = [];
        this.movementDict = {};
        this.velocity = {};
    }

    fromMovementToVelocity(movement) {
        const velocity = [];
        let lastMov = movement[0];
        for (const key in movement) {
            const oneMov = movement[key];
            const oneVel = {};
            for (const joint in oneMov) {
                oneVel[joint] = (oneMov[joint] - lastMov[joint]);
            }
            oneVel.update = oneMov.update;
            oneVel.step = oneMov.step;
            velocity.push(oneVel);
            lastMov = oneMov;
        }
        return velocity;
    }

    addMovement(robotNum, movement) {
        robotNum = parseInt(robotNum);
        this.robotNums.push(robotNum);
        this.movementDict[robotNum] = movement;
        this.velocity[robotNum] = this.fromMovementToVelocity(movement);
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
