import * as d3 from 'd3';
import movementContainer from '../movement-container.js';
import globalTimer from '../global-timer.js';
import animationControl from '../animation-control.js';
import globalVariables from '../global-variables.js';

export default class smallLineChartSVG {

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

        this.setup();
    }

    // functions to be implemented by child classes
    setup() {}
    updatePlotOnTime() {}
    pointermoved() {}

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
        if (!globalTimer.isRunning) {
            this.updatePlotOnTime();
        }
    }

    singleclicked(event) {
        if (animationControl.isChecked()) {
            animationControl.uncheck();
            globalTimer.pause();
        } else {
            animationControl.check();
            // get the click position
            const [xm] = d3.pointer(event);
            console.log(this.xScale.invert(xm));
            const ignoreFirst = Math.floor(
                this.xScale.invert(xm) - globalVariables.movementIndexStart,
            );
            globalTimer.setIgnoreFirst(ignoreFirst);
            globalTimer.start();
            animationControl.check();
        }
    }

    updateWindowSize(windowSize) {
        this.windowSize = windowSize;
    }

}
