import globalVariables from '../global-variables.js';
import globalTimer from '../global-timer.js';
import animationControl from '../animation-control.js';
import * as d3 from 'd3';

class globalPlotSVG {

    constructor(offsetWidth, offsetHeight) {
        this.offsetWidth = offsetWidth;
        this.offsetHeight = offsetHeight;
        this.margin = { top: 10, right: 10, bottom: 40, left: 10 };
        this.maxWidth =
            0.9 * (offsetWidth - this.margin.left - this.margin.right);
        this.maxHeight = Math.max(
            120,
            0.35 * (offsetHeight - this.margin.top - this.margin.bottom),
        );
        // this.maxHeight = 120;

        this.width = this.maxWidth;
        this.height = this.maxHeight;

        this.brushedWidth = globalVariables.rightSvgWindowSize;
        this.brushLocked = globalVariables.lockBrush;
        this.brushStart = globalVariables.brushStart;
        this.svg = null;
    }

    // functions inherite
    sendChangeEvent() {
        const event = new CustomEvent('global-map-changed', {
            detail: {
                width: this.width,
                dataLength: this.dataLength,
            },
        });
        document.dispatchEvent(event);
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

    brushed(event) {
        if (event.selection) {
            if (event.mode) {
                let [x0, x1] = event.selection;
                x0 = (x0 / this.width) * this.dataLength;
                x1 = (x1 / this.width) * this.dataLength;
                if (x1 - x0 < 3) {
                    // as sigal click
                    this.singleclicked(event);
                    return;
                }
                console.log('brushed', x0, x1);
                this.brushedWidth = x1 - x0;
                this.brushStart = x0;
                globalVariables.brushStart = x0;
                if (!globalTimer.isRunning) {
                    globalTimer.setIgnoreFirst(x0 + this.brushedWidth / 2);
                }
                this.brushLocked = globalVariables.lockBrush;
                if (globalVariables.lockBrush) {
                    globalTimer.setRestartFrom(x0);
                    globalTimer.setEndAt(x1);
                } else {
                    globalTimer.setRestartFrom(0);
                    globalTimer.setEndAt(-1);
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

    setByLockBrush() {
        this.brushLocked = globalVariables.lockBrush;
        if (this.brushLocked === false) {
            globalTimer.setRestartFrom(0);
            globalTimer.setEndAt(-1);
            return;
        }
        if (globalTimer.isRunning) {
            const current = globalTimer.getCurrent();
            const x0 = current - this.brushedWidth / 2;
            const x1 = current + this.brushedWidth / 2;
            globalTimer.setRestartFrom(x0);
            globalTimer.setEndAt(x1);
        } else {
            const x0 = this.brushStart;
            const x1 = this.brushStart + this.brushedWidth;
            globalTimer.setRestartFrom(x0);
            globalTimer.setEndAt(x1);
        }
    }
    // functions to set in child class
    updatePlotOnTime() {}

}

class globalHeatMapSVG extends globalPlotSVG {

    constructor(gridNum, offsetWidth, offsetHeight) {
        super(offsetWidth, offsetHeight);
        this.gridNum = gridNum;

        this.gridWidth = this.maxWidth / this.gridNum;
        this.maxGridHeight = this.gridWidth * 2;
        this.gridHeight = Math.min(this.maxGridHeight, this.maxHeight / 12);
        // this.width = this.gridSize * this.gridNum;
        // this.height = this.gridSize * 12;
        this.width = this.maxWidth;
        this.height = this.gridHeight * 12;
        this.yLabels = Object.values(globalVariables.nameObsMap);

        // variables to set in child class
        this.dataLength = 0;

        this.colorScale = globalVariables.HeatmapColorScale;

        this.initSvg();
    }

    addArcLegend() {
        const arcLegend = d3.range(-3.1, 3.14, 0.1);
        const arclegentWidth = this.maxWidth / arcLegend.length;
        for (let i = 0; i < arcLegend.length; i++) {
            const legend = arcLegend[i];
            const arc = d3.arc().innerRadius(5).outerRadius(10).startAngle(0);

            // add background full circle
            this.svg
                .append('path')
                .datum({ endAngle: 2 * Math.PI })
                .attr('d', arc)
                .attr(
                    'transform',
                    `translate(${ i * arclegentWidth + 15 }, ${ this.height + 15 })`,
                )
                .style('fill', 'lightgray');

            this.svg
                .append('path')
                .datum({ endAngle: legend })
                .attr('d', arc)
                .attr(
                    'transform',
                    `translate(${ i * arclegentWidth + 15 }, ${ this.height + 15 })`,
                )
                .style('fill', this.colorScale(legend));

            this.svg
                .append('text')
                .text(`${ legend.toFixed(1) }`)
                .attr('x', i * arclegentWidth + 15)
                .attr('y', this.height + 35)
                .style('text-anchor', 'middle');
        }
    }

    addRectLegend() {
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
    }

    // functions inherite
    createHeatmap() {
        this.data = this.processData();
        // const numXLables = Math.floor(this.gridNum / 10);

        // const xLabels = Array.from({ length: numXLables }, (_, i) => i).map(
        //     (d) => Math.floor((d * this.dataLength) / numXLables),
        // );

        // this.svg
        //     .selectAll('.xLabel')
        //     .data(xLabels)
        //     .enter()
        //     .append('text')
        //     .text((d) => d)
        //     .attr('x', (d, i) => i * this.gridWidth * 10)
        //     .attr('y', 0)
        //     .style('text-anchor', 'middle')
        //     .attr('transform', `translate(${ this.gridWidth / 2 }, -6)`)
        //     .attr('class', 'xLabel mono axis');

        this.labelContainer = this.svg
            .append('g')
            .attr('class', 'label-container');
        this.yLabelGroups = this.labelContainer
            .selectAll('.yLabelGroup')
            .data(this.yLabels.map((label, index) => ({ label, index })))
            .enter()
            .append('g')
            .attr('class', 'yLabelGroup')
            .attr(
                'transform',
                (d) => `translate(0, ${ d.index * this.gridHeight })`,
            )
            .call(
                d3
                    .drag()
                    .on('drag', (event, d) => {
                        const newY = Math.min(
                            Math.max(0, d3.pointer(event, this.svg.node())[1]),
                            (this.yLabels.length - 1) * this.gridHeight,
                        );
                        d3.select(event.sourceEvent.target.parentNode).attr(
                            'transform',
                            `translate(0, ${ newY })`,
                        );
                    })
                    .on('end', (event, d) => {
                        const newY = Math.min(
                            Math.max(0, d3.pointer(event, this.svg.node())[1]),
                            (this.yLabels.length - 1) * this.gridHeight,
                        );

                        const newYIndex = Math.floor(newY / this.gridHeight);
                        const selectedLabel = this.yLabels[d.index];
                        // remove the yLabel from the YLabels
                        this.yLabels.splice(d.index, 1);
                        // insert the yLabel to the newYIndex
                        this.yLabels.splice(newYIndex, 0, selectedLabel);
                        this.updateHeatmap();
                    }),
            );

        this.yLabelGroups
            .append('text')
            .text((d) => d.label)
            .attr('x', 0)
            .attr('y', this.gridHeight / 2)
            .style('text-anchor', 'end')
            .attr('transform', `translate(-6, ${ this.gridHeight / 2 })`)
            .attr('class', 'yLabel mono axis');

        this.yLabelGroups.each((d, i, nodes) => {
            const smallHeatmap = this.createSmallHeatmap(d.label, this.data, i);
            d3.select(nodes[i]).node().appendChild(smallHeatmap);
        });

        // this.addArcLegend();
        this.addRectLegend();

        // add brush
        this.brush = d3
            .brushX()
            .extent([
                [0, 0],
                [this.width, this.height],
            ])
            .on('end', (event) => this.brushed(event));
        this.svg.append('g').attr('class', 'brush').call(this.brush);
        if (this.brushedWidth > 0) {
            const x0 = this.brushStart;
            const x1 = this.brushStart + this.brushedWidth;
            this.svg
                .selectAll('.brush')
                .call(this.brush.move, [
                    (x0 / this.dataLength) * this.width,
                    (x1 / this.dataLength) * this.width,
                ]);
        }

        // bind events
        this.svg
            .on('click', (event) => this.singleclicked(event))
            .on('pointermove', (event) => this.pointermoved(event))
            .on('pointerleave', (event) => this.pointerleft(event));
    }

    createSmallHeatmap(ylabel, allData, orderNow) {
        const data = allData.filter((d) => d.y === this.yLabelOrder[ylabel]);

        const svg = d3
            .create('svg')
            .attr('width', this.gridWidth)
            .attr('height', this.gridHeight)
            .attr('viewBox', [0, 0, this.gridWidth, this.gridHeight])
            .attr(
                'style',
                'max-width: 100%; height: auto; overflow: visible; font: 10px sans-serif;',
            );

        const cards = svg
            .selectAll('.cards')
            .data(data, (d) => `${ d.y }:${ d.x }`);

        cards
            .enter()
            .append('rect')
            .attr('x', (d) => d.x * this.gridWidth)
            .attr('y', 0)
            .attr('class', 'card bordered')
            .attr('width', this.gridWidth)
            .attr('height', this.gridHeight)
            .style('fill', (d) => this.colorScale(d.value));

        cards.exit().remove();
        return svg.node();
    }

    updateHeatmap() {
        // update yLabel
        this.yLabelGroups = this.labelContainer
            .selectAll('.yLabelGroup')
            .data(this.yLabels.map((label, index) => ({ label, index })));
        this.yLabelGroups
            .transition()
            .duration(500)
            .attr(
                'transform',
                (d) => `translate(0, ${ d.index * this.gridHeight })`,
            );

        this.yLabelGroups
            .select('text')
            .text((d) => d.label)
            .attr('y', this.gridHeight / 2);

        this.yLabelGroups.each((d, i, nodes) => {
            const smallHeatmap = this.createSmallHeatmap(d.label, this.data, i);
            d3.select(nodes[i]).node().appendChild(smallHeatmap);
        });
    }
    updatePlotOnTime() {
        // add the vertical line for current time
        const current = globalTimer.getCurrent();
        const x = current / this.dataLength;
        this.drawlinebyx(x);

        if (this.brushedWidth) {
            if (!this.brushLocked) {
                const x0 = current - this.brushedWidth / 2;
                const x1 = current + this.brushedWidth / 2;
                this.brushStart = x0;
                globalVariables.brushStart = x0;
                this.svg
                    .selectAll('.brush')
                    .call(this.brush.move, [
                        (x0 / this.dataLength) * this.width,
                        (x1 / this.dataLength) * this.width,
                    ]);
            }
        }
    }

}

class GlobalLineChartSVG extends globalPlotSVG {

    constructor(offsetWidth, offsetHeight) {
        super(offsetWidth, offsetHeight);

        this.all_x = null;
        this.all_y = {};
        this.yScale = null;
        this.xScale = null;
        this.current = globalTimer.current;

        // this.width = this.maxWidth;
        // this.height = this.maxHeight;
        this.initSvg();
    }

}

export { globalHeatMapSVG, GlobalLineChartSVG, globalPlotSVG };
