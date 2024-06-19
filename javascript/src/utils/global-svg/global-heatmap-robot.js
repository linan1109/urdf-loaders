import * as d3 from 'd3';
import {globalHeatMapSVG} from './global-svg.js';
import movementContainer from '../movement-container.js';
import globalTimer from '../global-timer.js';

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
        });

        return processedData;
    }

    createHeatmap() {
        const data = this.processData();
        const numXLables = Math.floor(this.gridNum / 10);

        const xLabels = Array.from({ length: numXLables }, (_, i) => i).map(
            (d) => (d * this.dataLength) / numXLables,
        );

        const yLabels = this.yLabels;

        this.svg
            .selectAll('.xLabel')
            .data(xLabels)
            .enter()
            .append('text')
            .text((d) => d)
            .attr('x', (d, i) => i * this.gridWidth * 10)
            .attr('y', 0)
            .style('text-anchor', 'middle')
            .attr('transform', `translate(${ this.gridWidth / 2 }, -6)`)
            .attr('class', 'xLabel mono axis');

        this.svg
            .selectAll('.yLabel')
            .data(yLabels)
            .enter()
            .append('text')
            .text((d) => d)
            .attr('x', 0)
            .attr('y', (d, i) => i * this.gridHeight)
            .style('text-anchor', 'end')
            .attr('transform', `translate(-6, ${ this.gridHeight / 1.5 })`)
            .attr('class', 'yLabel mono axis');

        const cards = this.svg
            .selectAll('.hour')
            .data(data, (d) => `${ d.y }:${ d.x }`);

        cards
            .enter()
            .append('rect')
            .attr('x', (d) => d.x * this.gridWidth)
            .attr('y', (d) => d.y * this.gridHeight)
            // .attr('rx', 4)
            // .attr('ry', 4)
            .attr('class', 'hour bordered')
            .attr('width', this.gridWidth)
            .attr('height', this.gridHeight)
            .merge(cards)
            .transition()
            .duration(1000)
            .style('fill', (d) => this.colorScale(d.value));

        cards.exit().remove();
        const legends = [3, 2, 1, 0, -1, -2, -3];
        const legend = this.svg.selectAll('.legend').data(legends);

        const legendEnter = legend.enter().append('g').attr('class', 'legend');
        const legendMargin = 20;
        const heatmapWidth = this.width;
        legendEnter
            .append('rect')
            .attr('x', heatmapWidth + legendMargin) // Position legend to the right of the heatmap
            .attr('y', (d, i) => this.gridHeight * i) // Adjust vertical position based on index
            .attr('width', this.gridWidth * 1.5)
            .attr('height', this.gridHeight / 2)
            .style('fill', (d, i) => this.colorScale(legends[i]));

        legendEnter
            .append('text')
            .attr('class', 'mono')
            .text((d) => ` ${ d }`)
            .attr('x', heatmapWidth + legendMargin + this.gridWidth * 2) // Adjust x to align with the rect's right side
            .attr('y', (d, i) => this.gridHeight * i + this.gridHeight / 2); // Center text vertically within the rect
        legend.exit().remove();

        // add brush
        this.brush = d3
            .brushX()
            .extent([
                [0, 0],
                [this.width, this.height],
            ])
            .on('end', (event) => this.brushed(event));
        this.svg.append('g').attr('class', 'brush').call(this.brush);

        // bind events
        this.svg
            .on('click', (event) => this.singleclicked(event))
            .on('pointermove', (event) => this.pointermoved(event))
            .on('pointerleave', (event) => this.pointerleft(event));
    }

    updatePlotOnTime() {
        // add the vertical line for current time
        const current = globalTimer.getCurrent();
        const x = current / this.dataLength;
        this.drawlinebyx(x);

        if (this.brushedWidth) {
            const x0 = current - this.brushedWidth / 2;
            const x1 = current + this.brushedWidth / 2;
            this.svg
                .selectAll('.brush')
                .call(this.brush.move, [
                    (x0 / this.dataLength) * this.width,
                    (x1 / this.dataLength) * this.width,
                ]);
        }
    }

}
