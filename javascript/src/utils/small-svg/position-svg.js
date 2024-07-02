import * as d3 from 'd3';
import globalTimer from '../global-timer.js';
import globalVariables from '../global-variables.js';
import { SmallLineChartSVG } from './small-svg.js';

export default class PositionSVG extends SmallLineChartSVG {

    constructor(offsetWidth) {
        super(offsetWidth);
        this.positions = {};
        this.currentObs = null;
        this.lastTime = null;
        this.svg = null;

        this.all_time = [];

        this.yMax = 1;
        this.yMin = -1;

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

        this.svg
            .on('pointerenter', (event) => this.pointerentered(event))
            .on('pointermove', (event) => this.pointermoved(event))
            .on('pointerleave', (event) => this.pointerleft(event))
            .on('touchstart', (event) => event.preventDefault())
            .on('click', (event) => this.singleclicked(event));
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
                    z === this.currentObs
                        ? globalVariables.lineColors.mouseOver
                        : globalVariables.lineColors.noSelection,
                )
                .filter(({ z }) => z === k)
                .raise();
            this.dot.attr('transform', `translate(${ x },${ y })`);
            this.dot.select('text').text(textY);

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

    updateYScale() {
        // remove the old y axis
        this.svg.select('.yaxis').remove();

        this.yScale = d3
            .scaleLinear()
            .domain([this.yMin, this.yMax])
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
            .call((g) =>
                g
                    .selectAll('.tick line')
                    .clone()
                    .attr('x2', this.width - this.marginLeft - this.marginRight)
                    .attr('stroke-opacity', 0.1),
            )
            .call((g) =>
                g
                    .append('text')
                    .attr('x', -this.marginLeft)
                    .attr('y', 10)
                    .attr('fill', 'black')
                    .attr('text-anchor', 'start')
                    .text('Position'),
            )
            .call((g) => g.selectAll('.tick text').attr('fill', 'black'));
    }

    updatePlotOnTime() {
        if (this.all_time.length > 0) {
            this.current = globalTimer.getCurrent();

            this.updateYScale();

            // slice the window for the current time
            const xMax = Math.max(0, this.current - this.windowSize / 2);
            const xMin = Math.min(
                globalVariables.movementMinLen,
                this.current + this.windowSize / 2,
            );
            const x = this.all_time.filter(
                (time) => time >= xMax && time <= xMin,
            );

            this.xScale = d3
                .scaleLinear()
                .domain([xMax, xMin])
                .range([this.marginLeft, this.width - this.marginRight]);

            // Compute the points in pixel space as [time, value, name], where name is x, y, or z.
            this.points = [];
            for (const time of x) {
                const value = this.positions[time];
                if (value) {
                    this.points.push([
                        this.xScale(time),
                        this.yScale(value.x),
                        'x',
                    ]);
                    this.points.push([
                        this.xScale(time),
                        this.yScale(value.y),
                        'y',
                    ]);
                    this.points.push([
                        this.xScale(time),
                        this.yScale(value.z),
                        'z',
                    ]);
                }
            }
            // update the x axis
            this.svg.select('.xaxis').remove();
            this.svg
                .append('g')
                .attr(
                    'transform',
                    `translate(0,${ this.height - this.marginBottom })`,
                )
                .attr('class', 'xaxis')
                .call(d3.axisBottom(this.xScale).ticks(5))
                .call((g) => g.select('.domain').remove())
                .call((g) =>
                    g
                        .selectAll('.tick line')
                        .attr('stroke', 'black')
                        .attr('stroke-width', 0.5),
                )
                .call((g) =>
                    g
                        .selectAll('.tick line')
                        .clone()
                        .attr(
                            'y2',
                            -this.height + this.marginTop + this.marginBottom,
                        )
                        .attr('stroke-opacity', 0.1),
                )
                .call((g) =>
                    g
                        .append('text')
                        .attr('x', this.width - this.marginRight)
                        .attr('y', 10)
                        .attr('fill', 'black')
                        .attr('text-anchor', 'end')
                        .text('Time'),
                )
                .call((g) => g.selectAll('.tick text').attr('fill', 'black'));

            // Update the line path.
            this.groups = d3.rollup(
                this.points,
                (v) => Object.assign(v, { z: v[0][2] }),
                (d) => d[2],
            );

            this.svg.selectAll('.plotline').remove();
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
            this.path
                .style('stroke', ({ z }) =>
                    z === this.currentObs
                        ? globalVariables.lineColors.mouseOver
                        : globalVariables.lineColors.selection,
                )
                .filter(({ z }) => z === this.currentObs)
                .raise();

            // Update the dots.
            if (this.currentObs) {
                // nearest point before the current time
                const nearestTime = this.lastTime;
                const x = this.xScale(nearestTime);
                const y = this.positions[nearestTime][this.currentObs];
                const scaledY = this.yScale(y);
                this.dot.attr('transform', `translate(${ x },${ scaledY })`);
                this.dot.select('text').text(y);
            }
        }
    }

    addPosition(time, value) {
        if (value) {
            // value will be {x: x, y: y, z: z}
            this.positions[time] = value;
            this.all_time.push(time);
            this.lastTime = time;
            this.yMax = Math.max(this.yMax, value.x);
            this.yMax = Math.max(this.yMax, value.y);
            this.yMax = Math.max(this.yMax, value.z);

            this.yMin = Math.min(this.yMin, value.x);
            this.yMin = Math.min(this.yMin, value.y);
            this.yMin = Math.min(this.yMin, value.z);
        }
    }

    clear() {
        this.positions = {};
        this.all_time = [];
        this.lastTime = null;
        this.yMax = 1;
        this.yMin = -1;
    }

    resize(offsetWidth) {
        console.log('resize', offsetWidth);
        this.offsetWidth = offsetWidth;
        this.width = (95 / 100) * offsetWidth;
        this.height = this.width * 0.5;

        this.svg
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('viewBox', [0, 0, this.width, this.height]);

        this.updatePlotOnTime();
    }

}
