export default class SnapShotDiv {

    constructor(offsetWidth, offsetHeight) {
        this.offsetWidth = offsetWidth;
        this.offsetHeight = offsetHeight;

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');

        this.canvas.width = this.offsetWidth * 0.95;
        this.maxWidth = this.canvas.width;
        this.maxHeight = this.maxWidth * 0.6;
        this.images = [];
        this.IMAGE = null;
        this.div = document.createElement('div');
        this.div.className = 'snapshot-div';
        this.imageDiv = document.createElement('div');
        this.buttonDiv = document.createElement('div');

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

        this.div.appendChild(this.imageDiv);
        this.div.appendChild(this.buttonDiv);

        this.fullImage = null;
        this.fullCanvas = document.createElement('canvas');
        this.fullCtx = this.fullCanvas.getContext('2d');
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
    }

    addImage(image) {
        this.images.push(image);
        this.update();
    }

    clear() {
        this.images = [];
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
