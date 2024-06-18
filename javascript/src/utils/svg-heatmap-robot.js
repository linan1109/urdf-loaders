import * as d3 from 'd3';
import movementContainer from './movement-container.js';
import globalVariables from './global-variables.js';
import globalTimer from './global-timer.js';
import animationControl from './animation-control.js';

export default class SVGHeatmapRobot {

    constructor(robotNum, gridNum, offsetWidth, offsetHeight) {
        this.data = movementContainer.getMovement(robotNum);
        this.dataLength = this.data.length;
        this.gridNum = gridNum;
        // use max value of data[update] as gridNum
        // this.gridNum = Math.max(...this.data.map((d) => d.update));
        this.id = 'heatmap-robot' + robotNum;
        this.margin = { top: 20, right: 20, bottom: 0, left: 30 };
        this.maxWidth =
            0.85 * (offsetWidth - this.margin.left - this.margin.right);
        this.maxHeight =
            0.85 * (offsetHeight - this.margin.top - this.margin.bottom);
        this.gridWidth = this.maxWidth / this.gridNum;
        this.gridHeight = this.maxHeight / 12;
        // this.width = this.gridSize * this.gridNum;
        // this.height = this.gridSize * 12;
        this.width = this.maxWidth;
        this.height = this.maxHeight;
        this.yLabels = Object.values(globalVariables.nameObsMap);
        this.brushedWidth = 0;

        this.svg = null;
        this.initSvg();
        this.createHeatmap();
    }

    initSvg() {
        this.svg = d3
            .create('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('viewBox', [0, 0, this.width, this.height])
            .attr(
                'style',
                'max-width: 100%; height: auto; overflow: visible; font: 10px sans-serif;',
            );
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
        const colorScale = d3
            // .scaleSequential(d3.interpolateViridis)
            .scaleSequential(d3.interpolateRdBu)
            .domain([
                // d3.min(data, (d) => d.value),
                // d3.max(data, (d) => d.value),
                -3.14, 3.14,
            ]);

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
            .attr('rx', 4)
            .attr('ry', 4)
            .attr('class', 'hour bordered')
            .attr('width', this.gridWidth)
            .attr('height', this.gridHeight)
            .merge(cards)
            .transition()
            .duration(1000)
            .style('fill', (d) => colorScale(d.value));

        cards.exit().remove();
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
            .style('fill', (d, i) => colorScale(legends[i]));

        legendEnter
            .append('text')
            .attr('class', 'mono')
            .text((d) => ` ${ d }`)
            .attr('x', heatmapWidth + legendMargin + this.gridWidth * 2) // Adjust x to align with the rect's right side
            .attr('y', (d, i) => this.gridHeight * i + this.gridHeight / 2); // Center text vertically within the rect
        legend.exit().remove();

        // add brush
        this.addBrush();
        this.svg
            .on('click', (event) => this.singleclicked(event))
            .on('pointermove', (event) => this.pointermoved(event))
            .on('pointerleave', (event) => this.pointerleft(event));
    }

    addBrush() {
        this.brush = d3
            .brushX()
            .extent([
                [0, 0],
                [this.width, this.height],
            ])
            .on('end', (event) => this.brushed(event));
        this.svg.append('g').attr('class', 'brush').call(this.brush);
    }

    brushed(event) {
        if (event.selection) {
            if (event.mode) {
                let [x0, x1] = event.selection;
                x0 = (x0 / this.width) * this.dataLength;
                x1 = (x1 / this.width) * this.dataLength;
                console.log('brushed', x0, x1);
                this.brushedWidth = x1 - x0;

                if (!globalTimer.isRunning) {
                    globalTimer.setIgnoreFirst(x0 + this.brushedWidth / 2);
                }
                globalVariables.rightSvgWindowSize = Math.floor(x1 - x0);
                // send event to update right svg
                const brushedevent = new CustomEvent('global-map-brushed', {
                    detail: { x0, x1 },
                });
                document.dispatchEvent(brushedevent);
            }
        } else {
            this.brushedWidth = null;
        }
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

    drawlinebyx(x) {
        this.svg.selectAll('.vertical-line').remove();
        this.svg
            .append('line')
            .attr('class', 'vertical-line')
            .attr('x1', x * this.width)
            .attr('y1', 0)
            .attr('x2', x * this.width)
            .attr('y2', this.height)
            .style('stroke', 'black')
            .style('stroke-width', 1);
    }

    singleclicked(event) {
        if (globalTimer.isRunning) {
            animationControl.uncheck();
        } else {
            console.log('singleclicked', event);
            const [xw, y] = d3.pointer(event);
            const x = xw / this.width;
            const current = x * this.dataLength;
            globalTimer.setIgnoreFirst(current);
            animationControl.check();
            globalTimer.start();
            this.drawlinebyx(x);
        }
    }

    pointerleft(event) {
        // if amimation is running, do nothing
        if (globalTimer.isRunning) {
            return;
        }
        const current = globalTimer.getCurrent();
        this.drawlinebyx(current / this.dataLength);
    }

    pointermoved(event) {
        // if amimation is running, do nothing
        if (globalTimer.isRunning) {
            return;
        }
        const [x, y] = d3.pointer(event);
        if (x < 0 || x > this.width) {
            return;
        }
        this.drawlinebyx((1.5 + x) / this.width);
    }

}
