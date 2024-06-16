import * as d3 from 'd3';
import movementContainer from './movement-container.js';
import globalTimer from './global-timer.js';
import animationControl from './animation-control.js';
import globalVariables from './global-variables.js';
export default class SvgPlotterRobot {

    constructor(robotNum, offsetWidth) {
        this.movement = movementContainer.getMovement(robotNum);
        this.robotNum = robotNum;
        this.width = (95 / 100) * offsetWidth;
        this.height = this.width * 0.5;
        this.marginTop = 20;
        this.marginRight = 20;
        this.marginBottom = 30;
        this.marginLeft = 30;
        this.windowSize = 400;
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
        this.current = null;
        this.currentObs = null;

        this.setup();
    }

    setup() {
        this.svg = d3
            .create('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('viewBox', [0, 0, this.width, this.height])
            .attr(
                'style',
                'max-width: 100%; height: auto; overflow: visible; font: 10px sans-serif;',
            );

        // Add an invisible layer for the interactive tip.
        this.dot = this.svg.append('g').attr('display', 'none');

        this.dot.append('circle').attr('r', 2.5);

        this.dot.append('text').attr('text-anchor', 'middle').attr('y', -8);

        this.lineX = this.svg
            .append('g')
            .append('line')
            .attr('y1', this.height * 0.9)
            .attr('y2', this.height * 0.1)
            .attr('stroke', 'black');

        this.brush = d3
            .brushX()
            .extent([
                [this.marginLeft, this.marginTop],
                [
                    this.width - this.marginRight,
                    this.height - this.marginBottom,
                ],
            ])
            .on('end', (event) => {
                if (event.selection) {
                    let [x0, x1] = event.selection.map(this.xScale.invert);
                    x0 = Math.floor(x0);
                    x1 = Math.ceil(x1);
                    console.log(x0, x1);
                    if (x1 - x0 > 1) {
                        const x = d3.range(x0, x1);
                        this.xScale = d3
                            .scaleLinear()
                            .domain(d3.extent(x))
                            .range([
                                this.marginLeft,
                                this.width - this.marginRight,
                            ]);
                        this.points = [];
                        for (const key in globalVariables.nameObsMap) {
                            this.points = this.points.concat(
                                x.map((d, i) => [
                                    this.xScale(d),
                                    this.yScale(
                                        parseFloat(
                                            this.movement[d][globalVariables.nameObsMap[key]],
                                        ),
                                    ),
                                    key,
                                ]),
                            );
                        }
                        this.drawByX();
                    }
                }
            });

        this.svg.append('g').attr('class', 'brush').call(this.brush);

        this.svg
            .on('pointerenter', (event) => this.pointerentered(event))
            .on('pointermove', (event) => this.pointermoved(event))
            .on('pointerleave', (event) => this.pointerleft(event))
            .on('touchstart', (event) => event.preventDefault())
            .on('dblclick', (event) => this.dblclicked(event))
            .on('click', (event) => this.singleclicked(event));
    }

    pointerentered() {
        // this.path.style('mix-blend-mode', null).style('stroke', '#ddd');
        this.dot.attr('display', null);
    }

    pointermoved(event) {
        if (!globalTimer.isRunning) {
            const [xm, ym] = d3.pointer(event);
            const i = d3.leastIndex(this.points, ([x, y]) =>
                Math.hypot(x - xm, y - ym),
            );
            const [x, y, k] = this.points[i];
            this.currentObs = k;
            const textY = this.yScale.invert(y);
            this.path
                .style('stroke', ({ z }) =>
                    z === k
                        ? globalVariables.lineColors.selection
                        : globalVariables.checkedObs.includes(z)
                            ? globalVariables.lineColors.checked
                            : z === globalVariables.mouseOverObs
                                ? globalVariables.lineColors.mouseOver
                                : globalVariables.lineColors.noSelection,
                )
                .filter(({ z }) => z === k)
                .raise();
            this.dot.attr('transform', `translate(${ x },${ y })`);
            this.dot.select('text').text(textY);
            this.lineX.attr('transform', `translate(${ x },0)`);

            const value = this.yScale.invert(ym);
            this.svg
                .property('value', value)
                .dispatch('input', { bubbles: true });
        } else {
            const [xm, ym] = d3.pointer(event);
            const i = d3.leastIndex(this.points, ([x, y]) =>
                Math.hypot(x - xm, y - ym),
            );
            const [, , k] = this.points[i];
            this.currentObs = k;
        }
    }

    pointerleft() {
        // this.path.style('mix-blend-mode', 'multiply').style('stroke', null);
        this.dot.attr('display', 'none');
        this.svg.node().value = null;
        this.svg.dispatch('input', { bubbles: true });
        this.currentObs = null;
        if (!globalTimer.isRunning) {
            this.updatePlotOnTime();
        }
    }

    dblclicked() {
        if (animationControl.isChecked()) {
            animationControl.uncheck();
            globalTimer.pause();
        }
        this.current = globalTimer.getCurrent();
        this.xScale = d3
            .scaleLinear()
            .domain(d3.extent(this.all_x))
            .range([this.marginLeft, this.width - this.marginRight]);
        this.points = [];
        for (const key in globalVariables.nameObsMap) {
            this.points = this.points.concat(
                this.all_x.map((d, i) => [
                    this.xScale(d),
                    this.yScale(parseFloat(this.movement[d][globalVariables.nameObsMap[key]])),
                    key,
                ]),
            );
        }

        this.drawByX();
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

    initMovement() {
        this.all_x = d3.range(this.movement.length - 1);

        // y min and max

        for (const key in globalVariables.nameObsMap) {
            this.all_y[key] = this.movement.map((d) =>
                parseFloat(d[globalVariables.nameObsMap[key]]),
            );
        }
        const yMin = d3.min(Object.values(this.all_y).flat());
        const yMax = d3.max(Object.values(this.all_y).flat());

        this.yScale = d3
            .scaleLinear()
            .domain([yMin, yMax])
            .range([this.height - this.marginBottom, this.marginTop]);
        // Add the vertical axis.
        this.svg
            .append('g')
            .attr('transform', `translate(${ this.marginLeft },0)`)
            .attr('class', 'yaxis')
            .call(d3.axisLeft(this.yScale))
            .call((g) => g.select('.domain').remove())
            .call((g) =>
                g
                    .selectAll('.tick line')
                    .attr('stroke', 'black')
                    .attr('stroke-width', 0.5),
            )
            .call(
                this.voronoi
                    ? () => {}
                    : (g) =>
                        g
                            .selectAll('.tick line')
                            .clone()
                            .attr(
                                'x2',
                                this.width -
                                      this.marginLeft -
                                      this.marginRight,
                            )
                            .attr('stroke-opacity', 0.1),
            )
            .call((g) =>
                g
                    .append('text')
                    .attr('x', -this.marginLeft)
                    .attr('y', 10)
                    .attr('fill', 'black')
                    .attr('text-anchor', 'start')
                    .text('Robot ' + this.robotNum),
            )
            .call((g) => g.selectAll('.tick text').attr('fill', 'black'));
    }

    updatePlotOnTime() {
        if (this.movement !== null) {
            this.current = globalTimer.getCurrent();
            if (this.current >= this.movement.length) {
                globalTimer.stop();
            }
            if (this.current >= 0 && this.current < this.movement.length) {
                if (this.all_x === null) {
                    this.initMovement();
                }

                // slice the window for the current time
                const x = this.all_x.slice(
                    Math.max(0, this.current - this.windowSize / 2),
                    Math.min(
                        this.movement.length,
                        this.current + this.windowSize / 2,
                    ),
                );

                this.xScale = d3
                    .scaleLinear()
                    .domain(d3.extent(x))
                    .range([this.marginLeft, this.width - this.marginRight]);

                // Compute the points in pixel space as [x, y, z], where z is the name of the series.
                this.points = [];
                for (const key in globalVariables.nameObsMap) {
                    this.points = this.points.concat(
                        x.map((d, i) => [
                            this.xScale(d),
                            this.yScale(
                                parseFloat(this.movement[d][globalVariables.nameObsMap[key]]),
                            ),
                            key,
                        ]),
                    );
                }
                this.drawByX();
            }
        }
    }

    drawByX() {
        // remove
        this.svg.selectAll('.plotline').remove();
        this.svg.selectAll('.xaxis').remove();

        // Add the horizontal axis.
        this.svg
            .append('g')
            .attr(
                'transform',
                `translate(0,${ this.height - this.marginBottom })`,
            )
            .attr('class', 'xaxis')
            .call(
                d3
                    .axisBottom(this.xScale)
                    .ticks(this.width / 80)
                    .tickSizeOuter(0),
            )
            .call((g) =>
                g
                    .selectAll('.tick line')
                    .attr('stroke', 'black')
                    .attr('stroke-width', 0.5),
            )
            .call((g) =>
                g
                    .select('.domain')
                    .attr('stroke', 'black')
                    .attr('stroke-width', 0.5),
            )
            .call((g) => g.selectAll('.tick text').attr('fill', 'black'));

        this.groups = d3.rollup(
            this.points,
            (v) => Object.assign(v, { z: v[0][2] }),
            (d) => d[2],
        );

        // Add the lines.
        this.path = this.svg
            .append('g')
            .attr('class', 'plotline')
            .attr('fill', 'none')
            .attr('stroke-width', 1.5)
            .selectAll('path')
            .data(this.groups.values())
            .join('path')
            .style('mix-blend-mode', 'multiply')
            .attr(
                'd',
                d3
                    .line()
                    .x((d) => d[0])
                    .y((d) => d[1]),
            );
        // keys in checkedObs are blue, others are grey
        this.path
            .style('stroke', ({ z }) =>
                globalVariables.checkedObs.includes(z)
                    ? globalVariables.lineColors.checked
                    : z === this.currentObs
                        ? globalVariables.lineColors.selection
                        : z === globalVariables.mouseOverObs
                            ? globalVariables.lineColors.mouseOver
                            : globalVariables.lineColors.noSelection,
            )
            .filter(({ z }) => globalVariables.checkedObs.includes(z))
            .raise();

        // update the vertical line and the dot
        const a = this.xScale(this.current);
        this.lineX
            .attr('transform', `translate(${ a },0)`)
            // .attr('stroke', '#ddd');
            .attr('stroke', 'black');

        if (this.currentObs !== null) {
            const textY = parseFloat(
                this.movement[this.current][this.currentObs],
            );
            const y = this.yScale(textY);
            this.dot.attr('transform', `translate(${ a },${ y })`);
            this.dot.select('text').text(textY);
        }

        // remove the brush after drawing
        this.svg.select('.brush').call(this.brush.move, null);
    }

}