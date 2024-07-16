import * as d3 from 'd3';
import globalVariables from '../global-variables.js';

export default class GlobalXAxis {

    constructor(offsetWidth, offsetHeight) {
        this.offsetWidth = offsetWidth;
        this.offsetHeight = offsetHeight;
        this.margin = { top: 0, right: 10, bottom: 0, left: 10 };
        this.maxWidth =
            0.9 * (offsetWidth - this.margin.left - this.margin.right);
        this.maxHeight =
            0.85 * (offsetHeight - this.margin.top - this.margin.bottom);
        this.width = this.maxWidth;
        this.height = this.maxHeight;
        this.dataLength = globalVariables.movementMinLen;
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

        this.xScale = d3
            .scaleLinear()
            .domain([0, this.dataLength])
            .range([0, this.width]);
        this.svg
            .append('g')
            .attr('transform', `translate(0,${ this.height })`)
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
            .call((g) =>
                g
                    .select('.domain')
                    .attr('stroke', 'black')
                    .attr('stroke-width', 0.5),
            )
            .call((g) => g.selectAll('.tick text').attr('fill', 'black'));
    }

    updateSetup(width, length) {
        console.log('Setting width to: ', width);
        if (!width) {
            width = this.maxWidth;
        }
        if (!length) {
            length = globalVariables.movementMinLen;
        }
        this.width = width;
        this.dataLength = length;
        this.svg
            .attr('width', this.width)
            .attr('viewBox', [0, 0, this.width, this.height]);
        this.xScale = d3
            .scaleLinear()
            .domain([0, this.dataLength])
            .range([0, this.width]);
        this.svg.select('.xaxis').call(
            d3
                .axisTop(this.xScale)
                .ticks(this.width / 80)
                .tickSizeOuter(0),
        );
    }

    addOneSnapshot(timestamp) {
        const xPosition = this.xScale(timestamp);
        const triangle = d3.symbol().type(d3.symbolTriangle).size(64);

        this.svg
            .append('path')
            .attr('d', triangle)
            .attr(
                'transform',
                `translate(${ xPosition },${ this.height - 5 }) rotate(180)`,
            )
            .attr('fill', 'black')
            .attr('class', `snapshot-${ timestamp }`)
            .on('mouseover', function() {
                d3.select(this).attr('fill', 'white');
                const event = new CustomEvent('snapshot-triangle-hover', {
                    detail: {
                        timestamp: timestamp,
                    },
                });
                document.dispatchEvent(event);
            })
            .on('mouseout', function() {
                d3.select(this).attr('fill', 'black');
                const event = new CustomEvent('snapshot-triangle-out', {
                    detail: {
                        timestamp: timestamp,
                    },
                });
                document.dispatchEvent(event);
            });
    }

    removeOneSnapshot(timestamp) {
        this.svg.select(`.snapshot-${ timestamp }`).remove();
    }

    highlightOneSnapshot(timestamp) {
        this.svg.select(`.snapshot-${ timestamp }`).attr('fill', 'white');
    }

    unhighlightOneSnapshot(timestamp) {
        this.svg.select(`.snapshot-${ timestamp }`).attr('fill', 'black');
    }

}
