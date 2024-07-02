class AnimationControl {

    constructor(animToggle) {
        this.animToggle = animToggle;
        this.animToggle.addEventListener('click', () => {
            this.toggle();
        });
    }

    sendEvent() {
        const event = new CustomEvent('animationControl', {
            detail: {
                checked: this.isChecked(),
            },
        });
        document.dispatchEvent(event);
    }

    uncheck() {
        this.animToggle.classList.remove('checked');
        this.sendEvent();
    }

    isChecked() {
        return this.animToggle.classList.contains('checked');
    }

    toggle() {
        this.animToggle.classList.toggle('checked');
        this.sendEvent();
    }

    check() {
        this.animToggle.classList.add('checked');
        this.sendEvent();
    }

}

const animToggle = document.getElementById('do-animate');
const animationControl = new AnimationControl(animToggle);
export default animationControl;
