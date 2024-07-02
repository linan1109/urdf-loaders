import * as d3 from 'd3';
// import movementContainer from '../movement-container.js';
import globalTimer from '../global-timer.js';
import animationControl from '../animation-control.js';
import globalVariables from '../global-variables.js';

class smallSVG {

    constructor(offsetWidth) {
        this.offsetWidth = offsetWidth;

        this.width = (95 / 100) * offsetWidth;
        this.height = this.width * 0.5;
        this.marginTop = 20;
        this.marginRight = 20;
        this.marginBottom = 30;
        this.marginLeft = 30;
        this.windowSize = globalVariables.rightSvgWindowSize;
        this.voronoi = false;

        this.svg = null;
        this.dot = null;
        this.lineX = null;
        this.path = null;
        this.groups = null;
        this.points = [];
        this.brush = null;

        this.all_x = null;
        this.all_y = {};
        this.yScale = null;
        this.xScale = null;
        this.current = globalTimer.current;
    }

    // functions to be implemented by child classes
    setup() {}
    updatePlotOnTime() {}
    pointermoved() {}
    pointerentered() {}
    pointerleft() {}
    initMovement() {}

    // functions to be inherited

    updateWindowSize(windowSize) {
        this.windowSize = windowSize;
    }

    singleclicked(event) {
        if (animationControl.isChecked()) {
            animationControl.uncheck();
            globalTimer.pause();
        } else {
            animationControl.check();
            // get the click position
            const [xm] = d3.pointer(event);
            const ignoreFirst = Math.floor(
                this.xScale.invert(xm) - globalVariables.movementIndexStart,
            );
            globalTimer.setIgnoreFirst(ignoreFirst);
            globalTimer.start();
            animationControl.check();
        }
    }

}
class SmallLineChartSVG extends smallSVG {

    // constructor(offsetWidth) {
    //     super(offsetWidth);

    // }

    // functions to be inherited
    pointerentered() {
        // this.path.style('mix-blend-mode', null).style('stroke', '#ddd');
        this.dot.attr('display', null);
    }

    pointerleft() {
        // this.path.style('mix-blend-mode', 'multiply').style('stroke', null);
        this.dot.attr('display', 'none');
        this.svg.node().value = null;
        this.svg.dispatch('input', { bubbles: true });
        this.currentMov = null;
        this.currentObs = null;
        if (!globalTimer.isRunning) {
            this.updatePlotOnTime();
        }
    }

}

class SmallHeatMapSVG extends smallSVG {

    constructor(gridNum, offsetWidth) {
        super(offsetWidth);
        this.width = (85 / 100) * offsetWidth;
        this.height = this.width * 0.4;
        this.gridNum = gridNum;
        this.gridWidth = this.width / gridNum;

        this.colorScale = globalVariables.HeatmapColorScale;
    }

    createHeatmap() {
        this.svg = d3
            .create('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('viewBox', [0, 0, this.width, this.height])
            .attr(
                'style',
                'max-width: 100%; height: auto; overflow: visible; font: 10px sans-serif; margin-left: 50px; margin-bottom:25px;',
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

        // const legends = [-3, -2, -1, 0, 1, 2, 3];
        // const legend = this.svg.selectAll('.legend').data(legends);

        // const legendEnter = legend.enter().append('g').attr('class', 'legend');
        // const legendMargin = 20;
        // const heatmapWidth = this.width;
        // legendEnter
        //     .append('rect')
        //     .attr('x', heatmapWidth + legendMargin)
        //     .attr('y', (d, i) => this.gridHeight * i)
        //     .attr('width', this.gridWidth * 1.5)
        //     .attr('height', this.gridHeight / 2)
        //     .style('fill', (d, i) => this.colorScale(legends[i]));

        // legendEnter
        //     .append('text')
        //     .attr('class', 'mono')
        //     .text((d) => ` ${ d }`)
        //     .attr('x', heatmapWidth + legendMargin + this.gridWidth * 2)
        //     .attr('y', (d, i) => this.gridHeight * i + this.gridHeight / 2);
        // legend.exit().remove();

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

    // functions to be inherited
    pointermoved(event) {
        if (!globalTimer.isRunning) {
            const [xm, ym] = d3.pointer(event);
            this.svg.selectAll('.vertical-line').remove();
            this.lineX = this.svg
                .append('g')
                .append('line')
                .attr('class', 'vertical-line')
                .attr('y1', this.height)
                .attr('y2', 0)
                .attr('transform', `translate(${ xm },0)`)
                .attr('stroke', 'black');
            this.lineX.raise();
        }
    }

    pointerleft() {
        if (!globalTimer.isRunning) {
            this.updatePlotOnTime();
        }
    }

    drawLineX(x) {
        // add the vertical line
        const a = this.xScale(x);
        this.svg.selectAll('.vertical-line').remove();
        this.lineX = this.svg
            .append('g')
            .append('line')
            .attr('class', 'vertical-line')
            .attr('y1', this.height)
            .attr('y2', 0)
            .attr('transform', `translate(${ a },0)`)
            .attr('stroke', 'black');
        this.lineX.raise();
    }

    initMovement() {
        this.updatePlotOnTime();
    }

}

export { SmallLineChartSVG, SmallHeatMapSVG };
