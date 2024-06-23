import { globalHeatMapSVG } from './global-svg.js';
import movementContainer from '../movement-container.js';

export default class GlobalHeatmapRobot extends globalHeatMapSVG {

    constructor(robotNum, gridNum, offsetWidth, offsetHeight) {
        super(gridNum, offsetWidth, offsetHeight);
        this.data = movementContainer.getMovement(robotNum);
        this.dataLength = this.data.length;
        // use max value of data[update] as gridNum
        // this.gridNum = Math.max(...this.data.map((d) => d.update));
        this.id = 'global-heatmap-robot' + robotNum;
        this.createHeatmap();
    }

    processData() {
        const dataLength = this.data.length;
        const eachGridDataLength = Math.floor(dataLength / this.gridNum);
        const processedData = [];
        const yLabelOrder = {};

        this.yLabels.forEach((measurement, i) => {
            for (let j = 0; j < this.gridNum; j++) {
                let sum = 0;
                for (let k = 0; k < eachGridDataLength; k++) {
                    sum += parseFloat(
                        this.data[j * eachGridDataLength + k][measurement],
                    );
                }
                processedData.push({
                    x: j,
                    y: i,
                    value: sum / eachGridDataLength,
                });
            }
            yLabelOrder[measurement] = i;
        });

        this.yLabelOrder = yLabelOrder;
        return processedData;
    }

}
