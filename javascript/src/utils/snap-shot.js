export default class SnapShotDiv {

    constructor(imgSrc, current) {
        this.snapShotDiv = document.createElement('div');
        this.snapShotDiv.classList.add('snap-shot');
        const height = window.innerHeight * 0.2;
        this.snapShotDiv.style.height = height + 'px';
        this.snapShotDiv.style.position = 'fixed';
        this.snapShotDiv.style.left = '0';
        this.snapShotDiv.style.border = '1px solid black';

        this.topText = document.createElement('div');
        this.topText.innerHTML = 'Snap Shot ' + current;
        this.topText.style.position = 'absolute';
        this.topText.style.top = '0';
        this.topText.style.left = '0';
        this.topText.style.width = '100%';
        this.topText.style.borderBottom = '1px solid black';

        this.img = document.createElement('img');
        this.img.src = imgSrc;
        this.img.style.height = '100%';
        this.img.style.objectFit = 'cover';

        this.closeButton = document.createElement('div');
        this.closeButton.innerHTML = 'X';
        // this.closeButton.classList.add('beautful-button');
        this.closeButton.addEventListener('click', () => {
            this.snapShotDiv.remove();
        });
        this.closeButton.style.position = 'absolute';
        this.closeButton.style.top = '0';
        this.closeButton.style.right = '0';
        this.closeButton.style.cursor = 'pointer';
        this.closeButton.style.paddingRight = '5px';

        this.topText.appendChild(this.closeButton);
        this.snapShotDiv.appendChild(this.topText);
        this.snapShotDiv.appendChild(this.img);

        this.isDragging = false;
        this.offsetX = 0;
        this.offsetY = 0;

        this.topText.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.offsetX = e.offsetX;
            this.offsetY = e.offsetY;
        });

        this.topText.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        this.snapShotDiv.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.snapShotDiv.style.left = e.clientX - this.offsetX + 'px';
                this.snapShotDiv.style.top = e.clientY - this.offsetY + 'px';
            }
        });
    }

}
