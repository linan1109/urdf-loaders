import { globalHeatMapSVG } from './global-svg.js';
import movementContainer from '../movement-container.js';
import globalVariables from '../global-variables.js';
export default class GlobalHeatmapObs extends globalHeatMapSVG {

    constructor(obsName, gridNum, offsetWidth, offsetHeight) {
        super(gridNum, offsetWidth, offsetHeight);
        this.obsName = obsName;
        this.dataLength = globalVariables.movementMinLen;
        this.yLabels = movementContainer.robotNums.map(
            (robotNum) => 'Robot ' + robotNum,
        );
        this.gridHeight = Math.min(this.height / Math.max(this.yLabels.length, 12), this.maxGridHeight);
        this.height = this.gridHeight * this.yLabels.length;

        this.initSvg();
        // use max value of data[update] as gridNum
        // this.gridNum = Math.max(...this.data.map((d) => d.update));
        this.id = 'global-heatmap-obs' + obsName;
        this.createHeatmap();
    }

    processData() {
        const eachGridDataLength = Math.floor(this.dataLength / this.gridNum);
        const processedData = [];
        const yLabelOrder = {};

        for (let i = 0; i < this.yLabels.length; i++) {
            const robotNum = parseInt(this.yLabels[i].split(' ')[1]);
            const data = movementContainer.getMovement(robotNum);
            for (let j = 0; j < this.gridNum; j++) {
                let sum = 0;
                for (let k = 0; k < eachGridDataLength; k++) {
                    sum += parseFloat(
                        data[j * eachGridDataLength + k][this.obsName],
                    );
                }
                processedData.push({
                    x: j,
                    y: i,
                    value: sum / eachGridDataLength,
                });
            }
            yLabelOrder[this.yLabels[i]] = i;
        }

        this.all_xLabels = Array.from(
            { length: this.gridNum },
            (_, i) => i * eachGridDataLength,
        );
        this.yLabelOrder = yLabelOrder;
        this.sendChangeEvent();
        return processedData;
    }

}
