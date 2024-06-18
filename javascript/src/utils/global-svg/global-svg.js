import globalVariables from '../global-variables.js';
import globalTimer from '../global-timer.js';
import animationControl from '../animation-control.js';
import * as d3 from 'd3';

class globalPlotSVG {

    constructor(offsetWidth, offsetHeight) {
        this.offsetWidth = offsetWidth;
        this.offsetHeight = offsetHeight;
        this.margin = { top: 20, right: 20, bottom: 0, left: 30 };
        this.maxWidth =
            0.85 * (offsetWidth - this.margin.left - this.margin.right);
        this.maxHeight =
            0.85 * (offsetHeight - this.margin.top - this.margin.bottom);

        this.width = this.maxWidth;
        this.height = this.maxHeight;

        this.brushedWidth = 0;
        this.svg = null;
    }

    // functions inherite
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
    // functions to set in child class
    updatePlotOnTime() {}

}

class globalHeatMapSVG extends globalPlotSVG {

    constructor(gridNum, offsetWidth, offsetHeight) {
        super(offsetWidth, offsetHeight);
        this.gridNum = gridNum;

        this.gridWidth = this.maxWidth / this.gridNum;
        this.gridHeight = this.maxHeight / 12;
        // this.width = this.gridSize * this.gridNum;
        // this.height = this.gridSize * 12;
        this.width = this.maxWidth;
        this.height = this.maxHeight;
        this.yLabels = Object.values(globalVariables.nameObsMap);

        // variables to set in child class
        this.dataLength = 0;
        this.brushedWidth = null;

        this.initSvg();
    }

    // functions inherite

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

export { globalHeatMapSVG, GlobalLineChartSVG };
