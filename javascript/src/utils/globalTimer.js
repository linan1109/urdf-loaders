import * as d3 from 'd3';

class GlobalTimer {

    constructor() {
        this.isRunning = false;
        this.startTime = null;
        this.timerD3 = null;
        this.current = 0;
        this.ignoreFirst = 0;

        this.freq = 0.03;
    }

    start(timerD3Update, interval) {
        this.isRunning = true;
        if (this.startTime === null) {
            this.startTime = Date.now();
            this.timerD3 = d3.interval(timerD3Update, interval);
        }
    }

    stop() {
        this.isRunning = false;
        if (this.startTime !== null) {
            this.timerD3.stop();
            this.startTime = null;
        }
    }

    getCurrent() {
        if (!this.isRunning) {
            this.current = Math.floor(this.ignoreFirst);
            return this.current;
        }
        const time = Date.now() - this.startTime;
        this.current = Math.floor(time / 1000 / this.freq + this.ignoreFirst);
        return this.current;
    }

    setIgnoreFirst(ignoreFirst) {
        this.ignoreFirst = ignoreFirst;
    }

}

const globalTimer = new GlobalTimer();
export default globalTimer;
