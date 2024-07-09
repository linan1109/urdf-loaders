import * as d3 from 'd3';
import globalVariables from './global-variables';
import globalTimer from './global-timer';
export default class SnapShotDiv {

    constructor(offsetWidth, offsetHeight) {
        this.offsetWidth = offsetWidth;
        this.offsetHeight = offsetHeight;

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');

        this.windowSize = globalVariables.rightSvgWindowSize;

        this.canvas.width = this.offsetWidth * 0.95;
        this.maxWidth = this.canvas.width;
        this.maxHeight = this.maxWidth * 0.6;
        this.images = [];
        this.IMAGE = null;
        this.div = document.createElement('div');
        this.div.className = 'snapshot-div';
        this.imageDiv = document.createElement('div');
        this.buttonDiv = document.createElement('div');

        this.timestampDiv = document.createElement('div');
        this.timestampDiv.className = 'timestamp-div';
        this.timestamps = [];

        const a = document.createElement('button');
        a.className = 'beautful-button';
        a.innerHTML = 'Download';
        a.onclick = () => {
            const link = document.createElement('a');
            link.href = this.fullImage.src;
            link.download = 'snapshot.png';
            link.click();
        };
        a.style.marginRight = '10px';
        this.buttonDiv.appendChild(a);

        const closeButton = document.createElement('button');
        closeButton.innerHTML = 'Close';
        closeButton.className = 'beautful-button';
        closeButton.onclick = () => {
            this.clear();
        };
        this.buttonDiv.appendChild(closeButton);

        this.div.appendChild(this.timestampDiv);
        this.div.appendChild(this.imageDiv);
        this.div.appendChild(this.buttonDiv);

        this.fullImage = null;
        this.fullCanvas = document.createElement('canvas');
        this.fullCtx = this.fullCanvas.getContext('2d');

        this.timeSVG = d3.select(this.timestampDiv).append('svg');
        this.timeSVG.attr('width', this.maxWidth);
        this.timeSVG.attr('height', 35);
    }

    updatePlotOnTime() {
        if (this.timestamps.length === 0) {
            return;
        }
        this.current = globalTimer.getCurrent();
        let x0 = Math.max(0, this.current - this.windowSize / 2);
        let x1 = this.current + this.windowSize / 2;
        if (globalVariables.lockBrush) {
            x0 = Math.floor(globalVariables.brushStart);
            x1 = Math.floor(
                globalVariables.brushStart + globalVariables.rightSvgWindowSize,
            );
        }
        this.xScale = d3
            .scaleLinear()
            .domain([x0, x1])
            .range([0, this.maxWidth]);
        this.timeSVG.selectAll('.x-axis').remove();
        this.timeSVG
            .append('g')
            .attr('class', 'x-axis')
            .attr('transform', 'translate(0, 10)')
            .call(d3.axisBottom(this.xScale).ticks(5).tickSizeOuter(0))
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

        // add timestamp above the x-axis
        this.timeSVG.selectAll('.timestamp').remove();
        console.log(this.timestamps);
        this.timeSVG
            .selectAll('.timestamp')
            .data(this.timestamps)
            .enter()
            .append('text')
            .attr('class', 'timestamp')
            .attr('x', (d) => this.xScale(d))
            .attr('y', 8)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .text((d) => d);

        // and a tick for the timestamps
        this.timeSVG.selectAll('.timestamp-tick').remove();
        this.timeSVG
            .selectAll('.timestamp-tick')
            .data(this.timestamps)
            .enter()
            .append('line')
            .attr('class', 'timestamp-tick')
            .attr('x1', (d) => this.xScale(d))
            .attr('x2', (d) => this.xScale(d))
            .attr('y1', 10)
            .attr('y2', 15)
            .attr('stroke', 'black')
            .attr('stroke-width', 0.5);
    }

    updateWindowSize(windowSize) {
        this.windowSize = windowSize;
    }

    update() {
        if (this.images.length === 0) {
            this.div.hidden = true;
            return;
        }
        this.div.hidden = false;
        const totalWidth = this.images.reduce((sum, img) => sum + img.width, 0);
        const maxHeight = Math.max(...this.images.map((img) => img.height));
        this.fullCanvas.width = totalWidth;
        this.fullCanvas.height = maxHeight;
        let x = 0;
        this.images.forEach((img) => {
            this.fullCtx.drawImage(img, x, 0, img.width, img.height);
            x += img.width;
        });
        this.fullImage = new Image();
        this.fullImage.src = this.fullCanvas.toDataURL();

        const newimg = new Image();
        newimg.src = this.fullImage.src;
        // make image fit the canvas
        const ratio = this.canvas.width / totalWidth;
        newimg.width = this.canvas.width;
        newimg.height = maxHeight * ratio;
        if (newimg.height >= this.maxHeight) {
            newimg.width = (this.maxHeight / newimg.height) * newimg.width;
            newimg.height = this.maxHeight;
        }
        this.canvas.height = newimg.height;

        newimg.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(newimg, 0, 0, newimg.width, newimg.height);
            this.IMAGE = newimg;
            this.imageDiv.innerHTML = '';
            this.imageDiv.appendChild(this.canvas);
        };

        this.updatePlotOnTime();
    }

    addImage(image, timestamp) {
        this.images.push(image);
        this.timestamps.push(timestamp);
        this.update();
    }

    clear() {
        this.images = [];
        this.timestamps = [];
        this.update();
    }

    resize(offsetWidth, offsetHeight) {
        this.offsetWidth = offsetWidth;
        this.offsetHeight = offsetHeight;
        this.canvas.width = this.offsetWidth * 0.95;
        this.maxWidth = this.canvas.width;
        this.maxHeight = this.maxWidth * 0.7;
        this.update();
    }

}
