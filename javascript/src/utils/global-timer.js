import * as d3 from 'd3';
import globalVariables from './global-variables.js';

const interval = 30;

class GlobalTimer {

    constructor() {
        this.isRunning = false;
        this.startTime = null;
        this.timerD3 = null;
        this.current = 0;
        this.ignoreFirst = 0;
        this.timerD3UpdateFunc = null;

        this.freq = 0.03;
    }

    setTimerD3UpdateFunc(timerD3UpdateFunc) {
        this.timerD3UpdateFunc = timerD3UpdateFunc;
    }

    start() {
        if (this.timerD3UpdateFunc === null) {
            throw new Error('timerD3UpdateFunc is not set');
        }
        this.isRunning = true;
        if (this.startTime === null) {
            this.startTime = Date.now();
            this.timerD3 = d3.interval(this.timerD3UpdateFunc, interval);
        }
    }

    stop() {
        this.isRunning = false;
        if (this.startTime !== null) {
            this.timerD3.stop();
            this.startTime = null;
        }
    }

    pause() {
        if (this.isRunning) {
            this.setIgnoreFirst(this.getCurrent());
            this.stop();
        }
    }

    getCurrent() {
        if (!this.isRunning) {
            this.current = Math.floor(this.ignoreFirst);
            return this.current;
        }
        const time = Date.now() - this.startTime;
        this.current = Math.floor(time / 1000 / this.freq + this.ignoreFirst);
        if (this.current >= globalVariables.movementMinLen) {
            this.stop();
            this.ignoreFirst = globalVariables.movementMinLen - 1;
            this.current = globalVariables.movementMinLen - 1;
        }
        return this.current;
    }

    setIgnoreFirst(ignoreFirst) {
        this.ignoreFirst = ignoreFirst;
    }

}

const globalTimer = new GlobalTimer();
export default globalTimer;
