/**
 * Created by Andrew on 16/3/18.
 */

function Event(sender) {
    this._sender = sender;
    this._listeners = [];
}

Event.prototype = {
    attach: function(listener) {
        this._listeners.push(listener);
    },

    notify: function() {
        var i, len, args = [];

        args.push(this._sender);
        for (i = 0, len = arguments.length; i < len; i++) {
            args.push(arguments[i]);
        }

        for (i = 0; i < this._listeners.length; i++) {
            this._listeners[i].apply(this, args);
        }
    }
}

function Game2048Model(row, col) {
    this._row = row;
    this._col = col;
    this._currScore = 0;
    this._maxScore = 0;
    this._cells = [];
    this._shift = [];
    this._empty = [];
    this._isLocked = false; // lock for data in case of frequent operation

    this.cellsMovedUp = new Event(this);
    this.cellsMovedDown = new Event(this);
    this.cellsMovedLeft = new Event(this);
    this.cellsMovedRight = new Event(this);
    this.cellCreated = new Event(this);
    this.scoreUpdated = new Event(this);
    this.gameOver = new Event(this);
    this.gameRestarted = new Event(this);

    this.init();
}

Game2048Model.prototype = {
    init: function() {
        var i, j;

        this._currScore = 0;
        this._maxScore = 0;
        for (i = 0; i < this._row; i++) {
            this._cells[i] = [];
            this._shift[i] = [];
        }
    },

    getInfo: function() {
        return {row: this._row, col: this._col}
    },

    restart: function() {
        var i, j;

        this._currScore = 0;
        this._empty = [];

        for (i = 0; i < this._row; i++) {
            for (j = 0; j < this._col; j++) {
                this._cells[i][j] = 0;
                this._shift[i][j] = 0;
                this._empty.push(i + ',' + j);
            }
        }
        this.gameRestarted.notify(this._cells);

        this.createRandomCell();
        this.createRandomCell();
    },

    moveUp: function() {
        var i, j, tmpArray, mergeResult, isMerged;

        if (this._isLocked) return false;
        this._isLocked = true;

        isMerged = false;
        for (j = 0; j < this._col; j++) {
            tmpArray = [];
            for (i = 0; i < this._row; i++) {
                tmpArray.push(this._cells[i][j]);
            }
            mergeResult = this.mergeCells(tmpArray);
            for (i = this._row - 1; i >= 0; i--) {
                this._cells[i][j] = mergeResult.result.pop();
                this._shift[i][j] = mergeResult.shift.pop();

                isMerged = this.updateEmpty(i, j, this._cells[i][j]) || isMerged;
            }
        }

        if (isMerged) {
            this.cellsMovedUp.notify(this._cells, this._shift);

            this.updateScore();
            this.createRandomCell();
        }

        this._isLocked = false;
    },

    moveDown: function() {
        var i, j, tmpArray, mergeResult, isMerged;

        if (this._isLocked) return false;
        this._isLocked = true;

        isMerged = false;
        for (j = 0; j < this._col; j++) {
            tmpArray = [];
            for (i = this._row - 1; i >= 0; i--) {
                tmpArray.push(this._cells[i][j]);
            }
            mergeResult = this.mergeCells(tmpArray);
            for (i = 0; i < this._row; i++) {
                this._cells[i][j] = mergeResult.result.pop();
                this._shift[i][j] = mergeResult.shift.pop();

                isMerged = this.updateEmpty(i, j, this._cells[i][j]) || isMerged;
            }
        }

        if (isMerged) {
            this.cellsMovedDown.notify(this._cells, this._shift);

            this.updateScore();
            this.createRandomCell();
        }

        this._isLocked = false;
    },

    moveLeft: function() {
        var i, j, mergeResult, isMerged;

        if (this._isLocked) return false;
        this._isLocked = true;

        isMerged = false;
        for (i = 0; i < this._row; i++) {
            // the default direction of merging is to the left,
            // so tmpArray is not needed here.
            mergeResult = this.mergeCells(this._cells[i]);
            for (j = this._col - 1; j >= 0; j--) {
                this._cells[i][j] = mergeResult.result.pop();
                this._shift[i][j] = mergeResult.shift.pop();

                isMerged = this.updateEmpty(i, j, this._cells[i][j]) || isMerged;
            }
        }

        if (isMerged) {
            this.cellsMovedLeft.notify(this._cells, this._shift);

            this.updateScore();
            this.createRandomCell();
        }

        this._isLocked = false;
    },

    moveRight: function() {
        var i, j, tmpArray, mergeResult, isMerged;

        if (this._isLocked) return false;
        this._isLocked = true;

        isMerged = false;
        for (i = 0; i < this._row; i++) {
            tmpArray = [];
            for (j = this._col - 1; j >= 0; j--) {
                tmpArray.push(this._cells[i][j]);
            }
            mergeResult = this.mergeCells(tmpArray);
            for (j = 0; j < this._col; j++) {
                this._cells[i][j] = mergeResult.result.pop();
                this._shift[i][j] = mergeResult.shift.pop();

                isMerged = this.updateEmpty(i, j, this._cells[i][j]) || isMerged;
            }
        }

        if (isMerged) {
            this.cellsMovedRight.notify(this._cells, this._shift);

            this.updateScore();
            this.createRandomCell();
        }

        this._isLocked = false;
    },

    updateEmpty: function(row, col, val) {
        var index;

        index = this._empty.indexOf(row + ',' + col);
        if (!val && index === -1) {             // if new empty cell shows,
            this._empty.push(row + ',' + col);  // then cells must have merged!
            return true;
        } else if (val && index !== -1) {
            this._empty.splice(index, 1);
        }

        return false;
    },

    updateScore: function() {
        if (this._currScore > this._maxScore) {
            this._maxScore = this._currScore;
            this.scoreUpdated.notify(this._currScore, this._maxScore);
        } else {
            this.scoreUpdated.notify(this._currScore);
        }
    },

    mergeCells: function(array) {   // merge cells from left to right
        var i, len, lastNum, result = [], shift = [];

        len = array.length;
        for (i = 0, lastNum = -1; i < len; i++) {
            if (array[i] === lastNum) { // merge cells
                result.pop();
                result.push(2 * array[i]);
                lastNum = -1;
                shift[i] = i + 1 - result.length;
                this._currScore += 2 * array[i];
            } else if (array[i]) {
                result.push(array[i]);
                lastNum = array[i];
                shift[i] = i + 1 - result.length;
            } else {
                shift[i] = 0;
            }
        }
        for (i = 0; i < len; i++) {
            result[i] = result[i] || 0;
        }

        return {result: result, shift: shift};
    },

    createRandomCell: function() {
        var len, cellPos, cellRow, cellCol, cellVal;

        len = this._empty.length;
        cellPos = this._empty[~~(Math.random() * len)];
        this._empty.splice(this._empty.indexOf(cellPos), 1);
        cellPos = cellPos.split(',');
        cellRow = +cellPos[0];
        cellCol = +cellPos[1];
        cellVal = Math.random() > 0.1 ? 2 : 4;
        this._cells[cellRow][cellCol] = cellVal;

        this.cellCreated.notify({row: cellRow, col: cellCol}, cellVal);

        if (!this._empty.length) this.isGameOver();
    },

    isGameOver: function() {
        var i, j, cur;

        for (i = 0; i < this._row; i++) {
            for (j = 0; j < this._col; j++) {
                cur = this._cells[i][j];
                if ((cur === this._cells[i][j - 1]) ||
                    (cur === this._cells[i][j + 1]) ||
                    (cur === (this._cells[i - 1] && this._cells[i - 1][j])) ||
                    (cur === (this._cells[i + 1] && this._cells[i + 1][j]))) {
                    return false;
                }
            }
        }

        this.gameOver.notify();
    },
};

function Game2048View(gameModel, ctrlEle) {
    this._gameModel = gameModel;
    this._ctrlEle = ctrlEle;
    this._$cellDiv = [];
    this._row = 0;
    this._col = 0;
    this._animDur = 200;    // the animation duration (ms)
    this._cellSize = 100;  // the size/width of cells (px)
    this._cellGap = 20;     // the gap between cells (px)

    this.restartButtonClicked = new Event(this);
    this.upKeyPressed = new Event(this);
    this.downKeyPressed = new Event(this);
    this.leftKeyPressed = new Event(this);
    this.rightKeyPressed = new Event(this);


    var _this = this;

    // bind model events
    this._gameModel.gameRestarted.attach(function(sender, cells) {
        _this._ctrlEle.$gameOverLayer.hide();
        _this.rebuildCells(cells);
    });
    this._gameModel.cellsMovedUp.attach(function(sender, cells, shift) {
        _this.moveUp(cells, shift);
    });
    this._gameModel.cellsMovedDown.attach(function(sender, cells, shift) {
        _this.moveDown(cells, shift);
    });
    this._gameModel.cellsMovedLeft.attach(function(sender, cells, shift) {
        _this.moveLeft(cells, shift);
    });
    this._gameModel.cellsMovedRight.attach(function(sender, cells, shift) {
        _this.moveRight(cells, shift);
    });
    this._gameModel.cellCreated.attach(function(sender, index, val) {
        _this.createCell(index, val);
    });
    this._gameModel.scoreUpdated.attach(function(sender, currScore, maxScore) {
        _this.updateScore(currScore, maxScore);
    });
    this._gameModel.gameOver.attach(function() {
        _this._ctrlEle.$gameOverLayer.show();
    });

    // bind UI events
    this._ctrlEle.$restartButton.on('click touchstart', function(e) {
        e.stopPropagation();
        e.preventDefault();
        console.log(e);
        _this.restartButtonClicked.notify();
    });
    $('body').on('keydown', function(e) {
        switch (e.keyCode) {
            case 87:    // key 'W'
            case 38:    // key 'UP'
                _this.upKeyPressed.notify();
                break;
            case 83:    // key 'S'
            case 40:    // key 'DOWN'
                _this.downKeyPressed.notify();
                break;
            case 65:    // key 'A'
            case 37:    // key 'LEFT'
                _this.leftKeyPressed.notify();
                break;
            case 68:    // key 'D'
            case 39:    // key 'RIGHT'
                _this.rightKeyPressed.notify();
                break;
            default:
                return true;    // release for default trigger
                break;
        }
        return false;   // prevent default and stop propagation
    });

    // touch and move events for mobile devices
    var lastX, lastY;
    this._ctrlEle.$container.on('touchstart', function(e) {
        e.preventDefault();
        lastX = e.originalEvent.changedTouches[0].pageX;
        lastY = e.originalEvent.changedTouches[0].pageY;
    });
    this._ctrlEle.$container.on('touchend', function(e) {
        var deltaX, deltaY;

        deltaX = e.originalEvent.changedTouches[0].pageX - lastX;
        deltaY = e.originalEvent.changedTouches[0].pageY - lastY;

        if (Math.abs(deltaX) > Math.abs(deltaY)) {          // move horizontally
            if (deltaX > 0) _this.rightKeyPressed.notify(); // move right
            else _this.leftKeyPressed.notify();             // move left
        } else {                                            // move vertically
            if (deltaY > 0) _this.downKeyPressed.notify();  // move down
            else _this.upKeyPressed.notify();               // move up
        }
    });
    this._ctrlEle.$container.on('touchmove', function(e) {
        e.preventDefault();
        e.stopPropagation();
    });

    this.init();
}

Game2048View.prototype = {
    init: function() {
        var i, j, pos, gridDiv, containerWidth;

        this._row = this._gameModel.getInfo().row;
        this._col = this._gameModel.getInfo().col;
        containerWidth = this._ctrlEle.$container.width();
        this._cellSize = containerWidth * 0.8 / this._row;
        this._cellGap = containerWidth * 0.2 / (this._row + 1);

        this._ctrlEle.$container.css('font-size', this._cellSize / 2 + 'px');
        this._ctrlEle.$gameOverLayer.css('font-size', containerWidth * 0.2 + 'px')
        for (i = 0; i < this._row; i++) {
            this._$cellDiv[i] = [];
            for (j = 0; j < this._col; j++) {
                pos = this.getPos(i, j);
                gridDiv = $('<div></div>').css({'top': pos.top,
                                                'left': pos.left,
                                                'width': this._cellSize + 'px',
                                                'height': this._cellSize + 'px'})
                                          .addClass('grid');
                this._$cellDiv[i][j] = $('<div></div>').css({
                        'top': pos.top,
                        'left': pos.left,
                        'line-height': this._cellSize + 'px'})
                    .addClass('cell-val0');
                this._ctrlEle.$container.append(gridDiv)
                    .append(this._$cellDiv[i][j]);
            }
        }
    },

    moveUp: function(cells, shift) {
        var i, j, pos, _this;

        _this = this;
        for (i = 0; i < this._row; i++) for (j = 0; j < this._col; j++) if (shift[i][j]) {
            pos = this.getPos(i - shift[i][j], j);
            this._$cellDiv[i][j].stop(true, true).animate({
                'top': pos.top,
                'left': pos.left
            }, this._animDur, function () {
                _this.rebuildCells(cells);
            });
        }
    },

    moveDown: function(cells, shift) {
        var i, j, pos, _this;

        _this = this;
        for (i = 0; i < this._row; i++) for (j = 0; j < this._col; j++) if (shift[i][j]) {
            pos = this.getPos(i + shift[i][j], j);
            this._$cellDiv[i][j].stop(true, true).animate({
                'top': pos.top,
                'left': pos.left
            }, this._animDur, function () {
                _this.rebuildCells(cells);
            });
        }
    },

    moveLeft: function(cells, shift) {
        var i, j, pos, _this;

        _this = this;
        for (i = 0; i < this._row; i++) for (j = 0; j < this._col; j++) if (shift[i][j]) {
            pos = this.getPos(i, j - shift[i][j]);
            this._$cellDiv[i][j].stop(true, true).animate({
                'top': pos.top,
                'left': pos.left
            }, this._animDur, function () {
                _this.rebuildCells(cells);
            });
        }
    },

    moveRight: function(cells, shift) {
        var i, j, pos, _this;

        _this = this;
        for (i = 0; i < this._row; i++) for (j = 0; j < this._col; j++) if (shift[i][j]) {
            pos = this.getPos(i, j + shift[i][j]);
            this._$cellDiv[i][j].stop(true, true).animate({
                'top': pos.top,
                'left': pos.left
            }, this._animDur, function () {
                _this.rebuildCells(cells);
            });
        }
    },

    updateScore: function(currScore, maxScore) {
        this._ctrlEle.$currScore.text(currScore);
        if (maxScore) this._ctrlEle.$maxScore.text(maxScore);
    },

    createCell: function(index, val) {
        var row, col, pos;

        row = index.row;
        col = index.col;
        pos = this.getPos(row, col);
        this._$cellDiv[row][col].removeClass().addClass('cell')
            .addClass('cell-val' + val).text(val)
            .animate({
                'top': pos.top,
                'left': pos.left,
                'width': this._cellSize + 'px',
                'height': this._cellSize + 'px'
            }, this._animDur);
    },

    rebuildCells: function(cells) {
        var i, j, pos;

        for (i = 0; i < this._row; i++) {
            for (j = 0; j < this._col; j++) {
                pos = this.getPos(i, j);
                this._$cellDiv[i][j].removeClass().addClass('cell');
                if (cells[i][j]) {
                    this._$cellDiv[i][j].text(cells[i][j])
                        .addClass('cell-val' + cells[i][j])
                        .css({
                            'top': pos.top,
                            'left': pos.left,
                            'width': this._cellSize + 'px',
                            'height': this._cellSize + 'px'
                        });
                }
                else {
                    this._$cellDiv[i][j].text('')
                        .css({
                            'top': parseInt(pos.top) + this._cellSize / 2 + 'px',
                            'left': parseInt(pos.left) + this._cellSize / 2 + 'px',
                            'width': '0',
                            'height': '0'
                        });
                }
            }
        }
    },

    getPos: function(row, col) {
        var top, left;

        top = row * (this._cellGap + this._cellSize) + this._cellGap + 'px';
        left = col * (this._cellGap + this._cellSize) + this._cellGap + 'px';

        return {top: top, left: left};
    }
};

function Game2048Controller(gameModel, gameView) {
    this._gameModel = gameModel;
    this._gameView = gameView;

    var _this = this;

    this._gameView.restartButtonClicked.attach(function() {
        _this.restartGame();
    });
    this._gameView.upKeyPressed.attach(function() {
        _this.moveUp();
    });
    this._gameView.downKeyPressed.attach(function() {
        _this.moveDown();
    });
    this._gameView.leftKeyPressed.attach(function() {
        _this.moveLeft();
    });
    this._gameView.rightKeyPressed.attach(function() {
        _this.moveRight();
    });
}

Game2048Controller.prototype = {
    restartGame: function() {
        this._gameModel.restart();
    },

    moveUp: function() {
        this._gameModel.moveUp();
    },

    moveDown: function() {
        this._gameModel.moveDown();
    },

    moveLeft: function() {
        this._gameModel.moveLeft();
    },

    moveRight: function() {
        this._gameModel.moveRight();
    }
};


