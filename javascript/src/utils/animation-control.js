import globalTimer from './global-timer';

class AnimationControl {

    constructor(
        playButton,
        // pauseButton,
        stopButton,
        speedButton,
        playText,
        playIcon,
    ) {
        this.playButton = playButton;
        // this.pauseButton = pauseButton;
        this.stopButton = stopButton;
        this.speedButton = speedButton;
        this.playText = playText;
        this.playIcon = playIcon;

        this.playing = false;

        this.playButton.addEventListener('click', () => {
            this.toggle();
        });
        this.stopButton.addEventListener('click', () => {
            console.log('stop');
            globalTimer.backToStart();
            this.uncheck();
        });
        this.speedButton.addEventListener('click', () => {
            console.log('speed');
        });
    }

    sendEvent() {
        if (this.playing) {
            this.showPauseButton();
        } else {
            this.showPlayButton();
        }
        const event = new CustomEvent('animationControl', {
            detail: {
                checked: this.isChecked(),
            },
        });
        document.dispatchEvent(event);
    }

    showPlayButton() {
        this.playIcon.classList.remove('fa-pause');
        this.playIcon.classList.add('fa-play');

        playText.innerText = 'Play';
    }

    showPauseButton() {
        this.playIcon.classList.remove('fa-play');
        this.playIcon.classList.add('fa-pause');

        playText.innerText = 'Pause';
    }

    uncheck() {
        // this.animToggle.classList.remove('checked');
        this.playing = false;
        this.sendEvent();
    }

    isChecked() {
        return this.playing;
    }

    toggle() {
        // this.animToggle.classList.toggle('checked');
        this.playing = !this.playing;
        this.sendEvent();
    }

    check() {
        // this.animToggle.classList.add('checked');
        this.playing = true;
        this.sendEvent();
    }

}

// const animToggle = document.getElementById('do-animate');
const playButton = document.getElementById('simulation-contorls-button-play');
// const pauseButton = document.getElementById('simulation-contorls-button-pause');
const stopButton = document.getElementById('simulation-contorls-button-stop');
const speedButton = document.getElementById('simulation-contorls-button-speed');
const playIcon = document.getElementById('simulation-contorls-button-play-i');
const playText = document.getElementById(
    'simulation-contorls-button-play-tooltip-text',
);
const animationControl = new AnimationControl(
    playButton,
    // pauseButton,
    stopButton,
    speedButton,
    playText,
    playIcon,
);
export default animationControl;
