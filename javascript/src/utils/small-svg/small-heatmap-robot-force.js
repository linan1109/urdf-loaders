import { SmallHeatMapSVG } from './small-svg.js';
import movementContainer from '../movement-container.js';
import globalTimer from '../global-timer.js';
import globalVariables from '../global-variables.js';
import * as d3 from 'd3';

export default class SmallHeatmapRobotForce extends SmallHeatMapSVG {

    constructor(robotNum, gridNum, offsetWidth) {
        super(gridNum, offsetWidth);
        this.robotNum = robotNum;
        this.originalData = movementContainer.getJointForce(robotNum);
        this.dataLength = this.originalData.length;
        this.id = 'small-heatmap-robot' + robotNum;

        this.setup();
    }

    setup() {
        this.yLabels = Object.values(globalVariables.nameObsMap);
        this.gridHeight = this.height / this.yLabels.length;

        this.createHeatmap();

        this.svg.call((g) =>
            g
                .append('text')
                .attr('x', -22)
                .attr('y', -10)
                .attr('text-anchor', 'middle')
                .attr('font-size', 12)
                .text('Robot ' + this.robotNum),
        );
    }

    processData(start) {
        const eachGridDataLength = Math.floor(this.windowSize / this.gridNum);
        const processedData = [];
        start = Math.floor(start);
        let maxVelocity = 0;
        let minVelocity = 0;

        this.yLabels.forEach((measurement, i) => {
            for (let j = 0; j < this.gridNum; j++) {
                let sum = 0;
                for (let k = 0; k < eachGridDataLength; k++) {
                    sum += parseFloat(
                        this.originalData[start + j * eachGridDataLength + k][
                            measurement
                        ],
                    );
                }
                const value = sum / eachGridDataLength;
                processedData.push({
                    x: j,
                    y: i,
                    value: value,
                });
                maxVelocity = Math.max(maxVelocity, value);
                minVelocity = Math.min(minVelocity, value);
            }
        });
        this.maxVelocity = maxVelocity;
        this.minVelocity = minVelocity;
        this.colorScale = globalVariables.HeatmapColorScaleVelo.domain([
            minVelocity,
            maxVelocity,
        ]);

        this.all_xLabels = Array.from(
            { length: this.gridNum },
            (_, i) => i * eachGridDataLength,
        );

        return processedData;
    }

}
