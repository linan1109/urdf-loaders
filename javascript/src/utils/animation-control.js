class AnimationControl {

    constructor(animToggle) {
        this.animToggle = animToggle;
        this.animToggle.addEventListener('click', () => {
            this.toggle();
        });
    }

    uncheck() {
        this.animToggle.classList.remove('checked');
    }

    isChecked() {
        return this.animToggle.classList.contains('checked');
    }

    toggle() {
        this.animToggle.classList.toggle('checked');
    }

    check() {
        this.animToggle.classList.add('checked');
    }

}

const animToggle = document.getElementById('do-animate');
const animationControl = new AnimationControl(animToggle);
export default animationControl;
