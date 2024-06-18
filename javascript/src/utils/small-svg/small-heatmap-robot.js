import { SmallHeatMapSVG } from './small-svg.js';
import movementContainer from '../movement-container.js';
import globalTimer from '../global-timer.js';
import * as d3 from 'd3';

export default class SmallHeatmapRobot extends SmallHeatMapSVG {

    constructor(robotNum, gridNum, offsetWidth) {
        super(gridNum, offsetWidth);

        this.data = movementContainer.getMovement(robotNum);
        this.dataLength = this.data.length;
        this.id = 'small-heatmap-robot' + robotNum;

        this.createHeatmap();
    }

    processData(start) {
        const eachGridDataLength = Math.floor(this.windowSize / this.gridNum);
        const processedData = [];
        start = Math.floor(start);

        this.yLabels.forEach((measurement, i) => {
            for (let j = 0; j < this.gridNum; j++) {
                let sum = 0;
                for (let k = 0; k < eachGridDataLength; k++) {
                    sum += parseFloat(
                        this.data[start + j * eachGridDataLength + k][
                            measurement
                        ],
                    );
                }
                processedData.push({
                    x: j,
                    y: i,
                    value: sum / eachGridDataLength,
                });
            }
        });

        this.all_xLabels = Array.from(
            { length: this.gridNum },
            (_, i) => i * eachGridDataLength,
        );

        return processedData;
    }

    createHeatmap() {
        this.svg = d3
            .create('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('viewBox', [0, 0, this.width, this.height])
            .attr(
                'style',
                'max-width: 100%; height: auto; overflow: visible; font: 10px sans-serif; margin-left: 50px;',
            );

        const yLabels = this.yLabels;

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

        const legends = [-3, -2, -1, 0, 1, 2, 3];
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

        // bind events
        this.svg
            .on('click', (event) => this.singleclicked(event))
            .on('pointermove', (event) => this.pointermoved(event))
            .on('pointerleave', (event) => this.pointerleft(event));
    }

    updatePlotOnTime() {
        const current = globalTimer.getCurrent();

        let xStart = current - this.windowSize / 2;
        let xEnd = current + this.windowSize / 2;
        if (xStart < 0) {
            xStart = 0;
            xEnd = this.windowSize;
        }
        if (xEnd > this.dataLength) {
            xEnd = this.dataLength;
            xStart = xEnd - this.windowSize;
        }
        this.xScale = d3
            .scaleLinear()
            .domain([xStart, xEnd])
            .range([0, this.width]);

        this.svg.selectAll('.xaxis').remove();
        this.svg.selectAll('.card').remove();

        // update the x axis
        this.svg
            .append('g')
            .attr('transform', `translate(0, -1)`)
            .attr('class', 'xaxis')
            .call(
                d3
                    .axisTop(this.xScale)
                    .ticks(this.width / 80)
                    .tickSizeOuter(0),
            )
            .call((g) =>
                g
                    .selectAll('.tick line')
                    .attr('stroke', 'black')
                    .attr('stroke-width', 0.5),
            )
            .call((g) => g.select('.domain').remove())
            .call((g) => g.selectAll('.tick text').attr('fill', 'black'));

        // update the cards
        const data = this.processData(xStart);
        const cards = this.svg
            .selectAll('.card')
            .data(data, (d) => `${ d.y }:${ d.x }`);

        cards
            .enter()
            .append('rect')
            .attr('x', (d) => d.x * this.gridWidth)
            .attr('y', (d) => d.y * this.gridHeight)
            .attr('class', 'hour bordered')
            .attr('width', this.gridWidth)
            .attr('height', this.gridHeight)
            .merge(cards)
            .transition()
            .duration(0)
            .style('fill', (d) => this.colorScale(d.value));

        cards.exit().remove();

        this.drawLineX(current);
    }

}
