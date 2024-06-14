class MovementContainer {

    constructor() {
        this.robotNums = [];
        this.movementDict = {};
    }

    addMovement(robotNum, movement) {
        this.robotNums.push(robotNum);
        this.movementDict[robotNum] = movement;
    }

    getMovement(robotNum) {
        if (!this.hasMovement(robotNum)) {
            return null;
        }
        return this.movementDict[robotNum];
    }

    hasMovement(robotNum) {
        return this.robotNums.includes(robotNum);
    }

    hasAnyMovement() {
        return this.robotNums.length > 0;
    }

}

const movementContainer = new MovementContainer();
export default movementContainer;
