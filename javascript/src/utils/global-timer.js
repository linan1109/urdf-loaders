import * as d3 from 'd3';
import globalVariables from './global-variables.js';

const interval = 30;
const OriginalFreq = 1 / interval;

class GlobalTimer {

    constructor() {
        this.isRunning = false;
        this.startTime = null;
        this.timerD3 = null;
        this.current = 0;
        this.ignoreFirst = 0;
        this.timerD3UpdateFunc = null;

        this.restartFrom = 0;
        this.endAt = 0;

        this.freq = OriginalFreq;
        this.interval = interval;
    }

    setTimerD3UpdateFunc(timerD3UpdateFunc) {
        this.timerD3UpdateFunc = timerD3UpdateFunc;
    }

    changeSpeed(speedRatio) {
        this.ignoreFirst = this.getCurrent();
        this.interval = interval / speedRatio;
        this.freq = OriginalFreq / speedRatio;
        if (this.isRunning) {
            this.stop();
            this.start();
        }
    }

    start() {
        if (this.timerD3UpdateFunc === null) {
            throw new Error('timerD3UpdateFunc is not set');
        }
        this.isRunning = true;
        if (this.startTime === null) {
            this.startTime = Date.now();
            this.timerD3 = d3.interval(this.timerD3UpdateFunc, this.interval);
        }
    }

    stop() {
        this.isRunning = false;
        if (this.startTime !== null) {
            this.timerD3.stop();
            this.startTime = null;
        }
    }

    backToStart() {
        if (this.isRunning) {
            this.stop();
        }
        if (this.restartFrom <= 0) {
            this.current = 0;
            this.ignoreFirst = 0;
            return;
        }
        this.current = this.restartFrom;
        this.ignoreFirst = this.restartFrom;
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
        const stopAt =
            this.endAt <= 0
                ? globalVariables.movementMinLen
                : Math.min(this.endAt, globalVariables.movementMinLen);
        if (this.current >= stopAt) {
            // restart from the beginning
            this.backToStart(stopAt);
            this.start();
        }
        return this.current;
    }

    setIgnoreFirst(ignoreFirst) {
        this.ignoreFirst = ignoreFirst;
    }

    setRestartFrom(restartFrom) {
        this.restartFrom = restartFrom;
    }

    setEndAt(endAt) {
        this.endAt = endAt;
    }

}

const globalTimer = new GlobalTimer();
export default globalTimer;
