class SmallImageDiv {

    constructor(image, timestamp, height) {
        this.image = image;
        this.timestamp = timestamp;

        this.div = document.createElement('div');
        this.div.className = 'small-image-div';
        this.div.style.width = height + 'px';
        this.div.style.height = height + 'px';

        this.imageDiv = document.createElement('div');
        this.imageDiv.className = 'small-image-image-div';
        // this.imageDiv.appendChild(this.image);
        this.checkAndAppendImage(this.image, height, height);
        this.div.appendChild(this.imageDiv);

        // Add title to the image div
        const titleLabel = document.createElement('span');
        titleLabel.innerHTML = this.timestamp;
        titleLabel.className = 'title-label';
        this.imageDiv.appendChild(titleLabel);

        // add close button to the image div
        const closeButton = document.createElement('button');
        closeButton.innerHTML = 'X';
        closeButton.className = 'close-button';
        closeButton.onclick = () => {
            this.div.remove();
            const event = new CustomEvent('a-snapshot-closed', {
                detail: {
                    timestamp: timestamp,
                },
            });
            document.dispatchEvent(event);
        };
        this.imageDiv.appendChild(closeButton);

        this.closeButton = closeButton;
        this.titleLabel = titleLabel;

        // add border to the image div when mouse hover
        this.imageDiv.onmouseover = () => {
            this.hover();
            const event = new CustomEvent('a-snapshot-hover', {
                detail: {
                    timestamp: timestamp,
                },
            });
            document.dispatchEvent(event);
        };
        this.imageDiv.onmouseout = () => {
            this.unhover();
            const event = new CustomEvent('a-snapshot-out', {
                detail: {
                    timestamp: timestamp,
                },
            });
            document.dispatchEvent(event);
        };
    }

    hover() {
        this.imageDiv.style.border = '1px dashed black';
        this.closeButton.style.display = 'block';
        this.titleLabel.style.display = 'block';
    }

    unhover() {
        this.imageDiv.style.border = '';
        this.closeButton.style.display = '';
        this.titleLabel.style.display = '';
    }

    checkAndAppendImage(image, minWidth, minHeight) {
        if (image.width < minWidth || image.height < minHeight) {
            const scaleFactor = Math.max(
                minWidth / image.width,
                minHeight / image.height,
            );
            image.width = image.width * scaleFactor;
            image.height = image.height * scaleFactor;
        }
        image.style.maxWidth = minWidth + 'px';
        image.style.maxHeight = minHeight + 'px';
        image.style.margin = 'auto';
        this.imageDiv.appendChild(image);
    }

}

export default class SnapShotDiv {

    constructor(offsetWidth, offsetHeight) {
        this.offsetWidth = offsetWidth;
        this.offsetHeight = offsetHeight;
        this.maxWidth = this.offsetWidth * 0.95;
        this.maxHeight = this.offsetHeight * 0.5;
        this.images = {};
        this.imageDIVs = {};

        this.div = document.createElement('div');
        this.div.className = 'snapshot-div';
    }

    update() {
        if (this.images.length === 0) {
            this.div.hidden = true;
            return;
        }
        this.div.hidden = false;
        while (this.div.firstChild) {
            this.div.removeChild(this.div.firstChild);
        }
        const sortedKeys = Object.keys(this.images)
            .map(Number)
            .sort((a, b) => a - b);
        const width = Math.min(
            Math.floor(this.maxWidth / sortedKeys.length) - 30,
            this.maxHeight,
        );
        sortedKeys.forEach((time) => {
            const imagediv = new SmallImageDiv(this.images[time], time, width);
            this.div.appendChild(imagediv.div);
            this.imageDIVs[time] = imagediv;
        });
    }

    addImage(image, timestamp) {
        this.images[timestamp] = image;
        this.update();
    }

    clear() {
        this.images = {};
        this.update();
    }

    resize(offsetWidth, offsetHeight) {
        this.offsetWidth = offsetWidth;
        this.offsetHeight = offsetHeight;
        this.maxWidth = this.offsetWidth * 0.95;
        this.maxHeight = this.offsetHeight * 0.5;
        this.update();
    }

    removeOne(timestamp) {
        // console.log(timestamp);
        delete this.images[timestamp];
        delete this.imageDIVs[timestamp];
        this.update();
    }

    hoverOnImage(timestamp) {
        this.imageDIVs[timestamp].hover();
    }

    hoverOutImage(timestamp) {
        this.imageDIVs[timestamp].unhover();
    }

}
