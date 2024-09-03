class Game {
    state;
    canvas;
    /** @type {CanvasRenderingContext2D} */
    ctx;
    lastRender = 0;
    accumulatedFrameTime = 0;
    frameDuration = 1000 / 60;
    lastKeyPressed = null;
    lastAction = {key: null, sequence: 0};
    actions = [];
    handlingKey = null;
    isMoving = false;
    pixelsToWalk = 32;
    socket = null;
    stateBuffer = [];
    applyingStateBuffer = null;
    constructor() {
    }

    start(initialState) {
        this.canvas = document.querySelector('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.state = {...initialState};
        window.requestAnimationFrame(this.loop.bind(this));
        console.log('player pos initail ', this.state.players[0].x);
    }

    update(delta) {
        if (this.applyingStateBuffer) {
            this.applyMovementFromReconciliation(this.applyingStateBuffer, delta);
            return;
        }
        if (this.isMoving) {
            // continueMoving
            this.applyMovement(delta);
            return;
        }
        if (this.stateBuffer.length) {
            // apply stateBuffer
            this.isMoving = true;
            const newState = this.stateBuffer.pop();
            this.applyingStateBuffer = newState;
            this.pixelsToWalk = Math.abs(newState.players[0].x - this.state.players[0].x) * 32;
            console.log('pixels to walk', this.pixelsToWalk);
            if (!this.pixelsToWalk) {
                this.isMoving = false;
                this.applyingStateBuffer = null;
                this.pixelsToWalk = 32;
                console.log('No action returning');
                return;
            }
            this.actions[newState.players[0].lastProcessedSequence - 1] = {
                sequence: newState.players[0].lastProcessedSequence,
                oldPosition: this.state.players[0].x,
                newPosition: newState.players[0].x,
            }
            this.applyMovementFromReconciliation(this.actions[newState.players[0].lastProcessedSequence - 1], delta);
            
            return;
        }
        if (this.lastKeyPressed) {

            // new sequence
            this.lastAction.key = this.lastKeyPressed;
            this.lastAction.sequence++;
            
            const _action = {...this.lastAction};
            setTimeout(() => {
                this.socket.emit('INPUT', _action);
            }, 50); // FAKE LAG 50ms
            this.actions.push({
                sequence: this.lastAction.sequence,
                oldPosition: this.state.players[0].x,
                newPosition: this.predictNewPosition(this.state.players[0].x, _action.key),
            });

            if (this.lastKeyPressed !== 'none') {
                this.movePlayer(delta);
            }


            this.lastKeyPressed = null;

        }
        // if (this.handlingKey?.key !== this.lastAction.key){
        //     this.socket.emit('INPUT', {key: this.lastAction.key, sequence: this.lastAction.sequence});
        //     this.handlingKey = this.lastAction;
        //     // apply input
        //     this.movePlayer(delta);
        // }
    }

    predictNewPosition(oldPosition, key) {
        const speed = key === 'right' ? 1 : key === 'left' ? -1 : 0;
        const newPosition = oldPosition + speed;
       return newPosition;
    }

    movePlayer(delta) {
        console.log('handling move player ',this.lastAction);
        this.isMoving = true;
        this.applyMovement(delta);
    }

    lerp(x, y, t) {
        return x*t + y*(1-t);
    }

    applyMovementFromReconciliation(action, delta) {
        // Smooth movement
        const {oldPosition, newPosition} = action;


        const movementSpeed = 0.15;
        const deltaTime = delta / 1000;

        // we need to lerp between these two values
        // considering delta time as well and pixels to walk
        // TODO:
        let currentPosition = this.lerp(oldPosition, newPosition, )



        const unitsToTravel = newState.players[0].x >= this.state.players[0].x ? 1 : - 1;
        this.state.players[0].x += unitsToTravel / 32;
        console.log('applying movement from reoc', this.state.players[0].x);
        this.pixelsToWalk--;
        if (this.pixelsToWalk === 0) {
            this.isMoving = false;
            this.pixelsToWalk = 32;
            this.applyingStateBuffer = null;
        }

    }

    applyMovement(delta) {
        const speed = this.lastAction.key === 'right' ? 1 : this.lastAction.key === 'left' ? -1 : 0
        this.state.players[0].x += speed / 32;
        console.log('applying movement', this.state.players[0].x);
        this.pixelsToWalk--;
        if (this.pixelsToWalk === 0) {
            this.isMoving = false;
            this.actions[this.lastAction.sequence - 1].newPosition = this.state.players[0].x;
            this.lastAction.key === 'none';
            this.pixelsToWalk = 32;
        }

        // console.log('player pos: ',this.state.players[0].x);
    }

    updateState(newState) {
        console.log('update state');
        if (this.actions[newState.players[0].lastProcessedSequence - 1].newPosition !== newState.players[0].x) {
            // Do Reconciliation
            console.log('reco');
            this.stateBuffer.unshift(newState);
        }
    }

    draw() {
        this.ctx.clearRect(0,0, 600, 600);
        this.state.players.forEach(player => {
            this.ctx.fillStyle = player.color;
            this.ctx.beginPath();
            this.ctx.arc(
                player.x * 32,
                player.y * 32,
                32,
                0,
                2 * Math.PI
            );
            this.ctx.fill();
        });
    }

    loop(timestamp) {
        const delta = timestamp - this.lastRender;
        this.lastRender = timestamp;
        this.accumulatedFrameTime += delta;
        let noOfUpdates = 0;
        
        while (this.accumulatedFrameTime >= this.frameDuration) {
            this.update(this.frameDuration);
            this.draw();
            this.accumulatedFrameTime -= this.frameDuration;
            if (noOfUpdates++ >= 200) {
              this.accumulatedFrameTime = 0;
              break;
            }
          }

    
        window.requestAnimationFrame(this.loop.bind(this));
    }
}

export {
    Game
}