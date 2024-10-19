"use strict";
/**
 * Color is a set of constants which you can use to set the color of dots.
 *
 * Use it from both TypeScript and JavaScript with:
 *
 * ```javascript
 * game.setDot(x, y, EasyColor.Red)
 * ```
 */
var EasyColor;
(function (EasyColor) {
    EasyColor["Gray"] = "gainsboro";
    EasyColor["Black"] = "black";
    EasyColor["Red"] = "red";
    EasyColor["Orange"] = "orange";
    EasyColor["Yellow"] = "gold";
    EasyColor["Green"] = "green";
    EasyColor["Blue"] = "blue";
    EasyColor["Indigo"] = "indigo";
    EasyColor["Violet"] = "violet";
})(EasyColor || (EasyColor = {}));
var Direction;
(function (Direction) {
    Direction["Left"] = "LEFT";
    Direction["Right"] = "RIGHT";
    Direction["Up"] = "UP";
    Direction["Down"] = "DOWN";
})(Direction || (Direction = {}));
/**
 * Game is the object that controls the actual running of the game. You
 * create a new one by passing in a {@Link GameConfig}. Calling `game.run()`
 * will start the game.
 *
 * ```javascript
 * let config = {
 *    create: create, // A function you've defined
 *    update: update, // A function you've defined
 * }
 *
 * let game = new Game(config)
 * game.run()
 * ```
 */
class Game {
    constructor(config) {
        this._text = "";
        this._ended = false;
        this._frameCount = 0;
        this._gridHeight = 24;
        this._gridWidth = 24;
        this._clear = true;
        this._config = config;
        // Retain support for the deprecated _gridHeight and _gridWidth config
        // options
        if (config._gridHeight && config._gridHeight > 0) {
            console.warn("The config option _gridHeight is deprecated, please use gridHeight instead");
            this._gridHeight = config._gridHeight;
        }
        if (config._gridWidth && config._gridWidth > 0) {
            console.warn("The config option _gridWidth is deprecated, please use gridWidth instead");
            this._gridWidth = config._gridWidth;
        }
        if (config.gridHeight && config.gridHeight > 0) {
            this._gridHeight = config.gridHeight;
        }
        if (config.gridWidth && config.gridWidth > 0) {
            this._gridWidth = config.gridWidth;
        }
        if (config.clearGrid === false) {
            this._clear = false;
        }
        this._dots = new Array(this._gridHeight);
        for (let y = 0; y < this._dots.length; y++) {
            let row = new Array(this._gridWidth);
            for (let i = 0; i < row.length; i++) {
                row[i] = this._config.defaultDotColor || EasyColor.Gray;
            }
            this._dots[y] = row;
        }
    }
    /**
     * 24a2 games have a line of text below the grid which can be set to show
     * information to the player. This is commonly used to show instructions or
     * the player's score. Use this function to set that text.
     */
    setText(text) {
        this._text = text;
    }
    /**
     * Returns the number of frames that have passed since the game started. The
     * speed at which this increases is dependent on the frame rate. The higher
     * the frame rate is, the faster this number will increment, and vice versa.
     * You can set the frame rate with {@Link GameConfig.frameRate}.
     *
     * You can use this function to do things like increase difficulty as time
     * goes on.
     */
    getFrameCount() {
        return this._frameCount;
    }
    /**
     * Calling `end` stops the game loop. You should call it when the game is
     * finished. After you call it, the game is rendered one final time. Because
     * of this, you often want to `return` just after you call `game.end()` to
     * make sure any code after it is executed.
     */
    end() {
        this._ended = true;
    }
    /**
     * Returns the color of a dot.
     */
    getDot(x, y) {
        if (y < 0 || y >= this._dots.length) {
            throw new Error(`Error trying to get dot (${x}, ${y}): y is out of bounds`);
        }
        if (x < 0 || x >= this._dots[y].length) {
            throw new Error(`Error trying to get dot (${x}, ${y}): x is out of bounds`);
        }
        return this._dots[y][x];
    }
    /**
     * Sets the color of a dot.
     */
    setDot(x, y, val) {
        if (y < 0 || y >= this._dots.length) {
            throw new Error(`Error trying to set dot (${x}, ${y}): y is out of bounds`);
        }
        if (x < 0 || x >= this._dots[y].length) {
            throw new Error(`Error trying to set dot (${x}, ${y}): x is out of bounds`);
        }
        this._dots[y][x] = val;
    }
    /**
     * Calling `run` starts the game.
     */
    run() {
        if (!this._renderer) {
            // We interact with the DOM when creating the canvas, so let's wait till
            // the document has fully loaded
            if (document.readyState !== "complete") {
                window.addEventListener("load", this.run.bind(this));
                return;
            }
            this._renderer = new CanvasIOManager(this._gridHeight, this._gridWidth, this._config.containerId);
            if (this._config.onDotClicked) {
                this._renderer.registerDotClicked(this._config.onDotClicked);
            }
            if (this._config.onKeyPress) {
                this._renderer.registerKeyPressed(this._config.onKeyPress);
            }
        }
        if (this._config.create) {
            this._config.create(this);
            this._render();
        }
        // Initialise a `setInterval` to call a render func every X milliseconds
        // Delay is in milliseconds
        const delay = 1000 / (this._config.frameRate || 24);
        this._interval = window.setInterval(this._update.bind(this), delay);
    }
    /**
     * The internal function that's called on every frame.
     */
    _update() {
        if (this._ended) {
            window.clearInterval(this._interval);
            return;
        }
        this._frameCount++;
        if (this._clear) {
            this._clearGrid();
        }
        if (this._config.update) {
            this._config.update(this);
        }
        this._render();
    }
    _clearGrid() {
        this._dots.forEach((row, y) => {
            for (let x = 0; x < row.length; x++) {
                this.setDot(x, y, this._config.defaultDotColor || EasyColor.Gray);
            }
        });
    }
    _render() {
        if (!this._renderer) {
            console.error("renderer undefined");
            return;
        }
        for (let y = 0; y < this._dots.length; y++) {
            const row = this._dots[y];
            for (let x = 0; x < row.length; x++) {
                const colour = row[x];
                this._renderer.setDot(x, y, colour);
            }
        }
        this._renderer.setText(this._text);
    }
}
/**
 * @ignore
 * CanvasIOManager is the object that manages 24a2's input (capturing keyboard
 * and mouse events) and output (rendering the game to a HTML Canvas). It's the
 * only bit of 24a2 which is aware we're running in a browser.
 * CanvasIOManager does not form part of 24a2's public API, and can change
 * without warning
 */
class CanvasIOManager {
    constructor(gridHeight, gridWidth, containerId) {
        // Variables used when rendering the grid
        this._dotSize = 16;
        this._gapSize = 8;
        this._gridHeight = gridHeight;
        this._gridWidth = gridWidth;
        const { canvas, ctx } = this._createCanvasContext(containerId);
        this._ctx = ctx;
        this._canvas = canvas;
        this._listenForMouseClick();
        this._listenForKeyPress();
    }
    registerDotClicked(dotClicked) {
        this._dotClicked = dotClicked;
    }
    registerKeyPressed(keyPressed) {
        this._keyPressed = keyPressed;
    }
    _listenForMouseClick() {
        function onMouseClick(event) {
            if (!this._dotClicked) {
                return;
            }
            const rect = this._canvas.getBoundingClientRect();
            // cx and cy are the x y coordinates of the mouse click relative to the
            // canvas
            const cx = event.clientX - rect.left;
            const cy = event.clientY - rect.top;
            const offset = this._dotSize + this._gapSize;
            // Iterate over all dot locations, and check whether the distance
            // between the click and the dot centre is less than the dot's
            // radius
            for (let y = 0; y < this._gridHeight; y++) {
                for (let x = 0; x < this._gridWidth; x++) {
                    const dx = this._dotSize / 2 + x * offset;
                    const dy = this._dotSize / 2 + y * offset;
                    const distance = Math.sqrt(Math.pow(cx - dx, 2) + Math.pow(cy - dy, 2));
                    if (distance < this._dotSize / 2) {
                        this._dotClicked(x, y);
                        // We've found the dot, so exit early
                        return;
                    }
                }
            }
        }
        this._canvas.addEventListener("click", onMouseClick.bind(this));
    }
    _listenForKeyPress() {
        function onKeyPress(event) {
            if (!this._keyPressed) {
                return;
            }
            // TODO: We currently ignore repeat keydown events. These are fired when
            // a key is held down. We do this because there's a pause between the
            // first (repeat: false) event and subsequent (repeat: true) events. This
            // causes jittery behaviour.
            // We should probably do something like call this._keyPressed at a
            // constant rate.
            // In the meantime, we just ignore repeated events. This is also how the
            // P5 implementation worked.
            if (event.repeat) {
                return;
            }
            switch (event.key) {
                case "w":
                case "ArrowUp":
                    event.preventDefault();
                    this._keyPressed(Direction.Up);
                    return;
                case "s":
                case "ArrowDown":
                    event.preventDefault();
                    this._keyPressed(Direction.Down);
                    return;
                case "a":
                case "ArrowLeft":
                    event.preventDefault();
                    this._keyPressed(Direction.Left);
                    return;
                case "d":
                case "ArrowRight":
                    event.preventDefault();
                    this._keyPressed(Direction.Right);
                    return;
            }
        }
        document.addEventListener("keydown", onKeyPress.bind(this));
    }
    _createCanvasContext(containerId) {
        const pixelRatio = window.devicePixelRatio || 1;
        const width = this._dotSize * this._gridWidth + this._gapSize * (this._gridWidth - 1);
        const height = this._dotSize * this._gridHeight +
            this._gapSize * (this._gridHeight - 1) +
            50;
        const canvas = document.createElement("canvas");
        // Set the DOM/CSS sizes to get good looking drawings on high DPI screens
        // https://stackoverflow.com/a/26047748
        // https://www.html5rocks.com/en/tutorials/canvas/hidpi/
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
        canvas.width = width * pixelRatio;
        canvas.height = height * pixelRatio;
        const parent = this._getCanvasParent(containerId);
        parent.appendChild(canvas);
        const ctx = canvas.getContext("2d");
        if (ctx == null) {
            throw new Error("CanvasIOManager: error getting canvas context");
        }
        ctx.scale(pixelRatio, pixelRatio);
        return { canvas, ctx };
    }
    /**
     * Returns the element that should be our canvas's parent.
     * - If a containerId is specified, it'll be the element with that ID
     * - If one isn't, the parent will be the <main> element
     * - If a <main> element doesn't exist, we'll append one to the <body>
     * - If multiple <main> elements exist, the first will be the parent
     */
    _getCanvasParent(containerId) {
        if (containerId) {
            const parent = document.getElementById(containerId);
            if (!parent) {
                throw new Error(`CanvasIOManager: could not find element with ID ${containerId}`);
            }
            return parent;
        }
        const mains = document.getElementsByTagName("main");
        if (mains.length > 0) {
            return mains[0];
        }
        // No main element exists - let's create one
        const main = document.createElement("main");
        document.body.appendChild(main);
        return main;
    }
    setDot(x, y, val) {
        // TODO: we can improve efficiency by keeping a cache of what the dot
        // previously was, and only writing it to the canvas if it's changed.
        // I'd like to have a benchmark test set up before coding this so we can
        // demonstrate the benefit
        const ctx = this._ctx;
        const offset = this._dotSize + this._gapSize;
        ctx.save();
        // Move coordinates, so plotting a dot a (0, 0) is fully visible
        ctx.translate(this._dotSize / 2, this._dotSize / 2);
        // Move coordinates again, to where the dot should be plotted
        ctx.translate(x * offset, y * offset);
        // Clear the space the dot occupies. This prevents minor outline issues
        // when changing the colour of a dot
        ctx.clearRect(-this._dotSize / 2, -this._dotSize / 2, this._dotSize, this._dotSize);
        ctx.fillStyle = val;
        ctx.beginPath();
        ctx.arc(0, 0, this._dotSize / 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
    }
    setText(text) {
        const ctx = this._ctx;
        const textSize = 20; // px
        ctx.save();
        const textX = 0;
        const textY = this._dotSize * this._gridHeight +
            this._gapSize * (this._gridHeight - 1) +
            32;
        ctx.clearRect(textX, textY - textSize, this._dotSize * this._gridWidth + this._gapSize * (this._gridWidth - 1), 100 // This is a bit arbitrary - we just want to clear the whole bottom of the canvas
        );
        ctx.font = `${textSize}px monospace`;
        ctx.fillText(text, textX, textY);
        ctx.restore();
    }
}
