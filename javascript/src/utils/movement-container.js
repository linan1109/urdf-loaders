class MovementContainer {

    constructor() {
        this.robotNums = [];
        this.movementDict = {};
    }

    addMovement(robotNum, movement) {
        robotNum = parseInt(robotNum);
        this.robotNums.push(robotNum);
        this.movementDict[robotNum] = movement;
    }

    getMovement(robotNum) {
        robotNum = parseInt(robotNum);
        if (!this.hasMovement(robotNum)) {
            console.error('No movement found for robotNum', robotNum);
            return null;
        }
        return this.movementDict[robotNum];
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
    }

}

const movementContainer = new MovementContainer();
export default movementContainer;
