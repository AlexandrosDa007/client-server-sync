import { OtherPlayer } from "./OtherPlayer.js";

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
    fakeLag = 0;
    otherPlayers = [];
    constructor() {
    }

    getPlayer(state) {
        return state.players.find(p => p.id === this.socket.id);
    }

    start(initialState) {
        this.canvas = document.querySelector('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.state = {...initialState};
        this.state.players.forEach(p => {
            if (p.id !== this.socket.id) {
                this.otherPlayers.push(new OtherPlayer(p.id, {...p}))
            }
        })
        window.requestAnimationFrame(this.loop.bind(this));
        console.log('player pos initail ', this.getPlayer(this.state).x);
    }

    addAction(action) {
        const sequence = action.sequence;
        this.actions = this.actions.filter(a => {
            console.log('lalalal: ', a.sequence < sequence - 10);
            
            return Math.abs(sequence - a.sequence) < 10;
        });
        this.actions.push(action);
    }

    update(delta) {
        this.otherPlayers.forEach(p => p.update(delta));
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
            this.pixelsToWalk = Math.abs(this.getPlayer(newState).x - this.getPlayer(this.state).x) * 32;
            console.log('pixels to walk', this.pixelsToWalk);
            if (!this.pixelsToWalk) {
                this.isMoving = false;
                this.applyingStateBuffer = null;
                this.pixelsToWalk = 32;
                console.log('No action returning');
                return;
            }
            this.addAction({
                sequence: this.getPlayer(newState).lastProcessedSequence,
                oldPosition: this.getPlayer(this.state).x,
                newPosition: this.getPlayer(newState).x,
            });
            this.applyingStateBuffer = this.getActionBySequence(this.getPlayer(newState).lastProcessedSequence);
            this.applyMovementFromReconciliation(this.applyingStateBuffer, delta);
            
            return;
        }
        if (this.lastKeyPressed) {

            // new sequence
            this.lastAction.key = this.lastKeyPressed;
            this.lastAction.sequence++;
            
            const _action = {...this.lastAction};
            setTimeout(() => {
                this.socket.emit('INPUT', _action);
            }, this.fakeLag); // FAKE LAG 50ms
            this.addAction({
                sequence: this.lastAction.sequence,
                oldPosition: this.getPlayer(this.state).x,
                newPosition: this.predictNewPosition(this.getPlayer(this.state).x, _action.key),
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
        if (!action.newPosition) {
            debugger;
        }
        const {oldPosition, newPosition} = action;


        const movementSpeed = 0.15;
        const deltaTime = delta / 1000;

        // we need to lerp between these two values
        // considering delta time as well and pixels to walk
        // TODO:
        // let currentPosition = this.lerp(oldPosition, newPosition, )



        const unitsToTravel = newPosition >= this.getPlayer(this.state).x ? 1 : - 1;
        this.getPlayer(this.state).x += unitsToTravel / 32;
        // console.log('applying movement from reoc', this.state.players[0].x);
        this.pixelsToWalk--;
        if (this.pixelsToWalk === 0) {
            if (!Number.isInteger(this.getPlayer(this.state).x)) {
                debugger;
            }
            this.isMoving = false;
            this.pixelsToWalk = 32;
            this.applyingStateBuffer = null;
        }

    }

    applyMovement(delta) {
        const speed = this.lastAction.key === 'right' ? 1 : this.lastAction.key === 'left' ? -1 : 0
        this.getPlayer(this.state).x += speed / 32;
        // console.log('applying movement', this.state.players[0].x);
        this.pixelsToWalk--;
        if (this.pixelsToWalk === 0) {
            if (!Number.isInteger(this.getPlayer(this.state).x)) {
                debugger;
            }
            this.isMoving = false;
            
            this.getActionBySequence(this.lastAction.sequence).newPosition = this.getPlayer(this.state).x;
            this.lastAction.key === 'none';
            this.pixelsToWalk = 32;
        }

        // console.log('player pos: ',this.state.players[0].x);
    }

    getActionBySequence(sequence) {
        return this.actions.find(item => item.sequence === sequence);
    }

    updateState(newState) {
        console.log('update state with last processed ', this.getPlayer(newState).lastProcessedSequence);
        console.log('hello: ', this.actions);

        newState.players.forEach(p => {

            // for player
            if (p.id === this.socket.id && this.getPlayer(newState).lastProcessedSequence ) {
                if (!this.getActionBySequence(this.getPlayer(newState).lastProcessedSequence)) {
                    debugger
                }
                if (this.getActionBySequence(this.getPlayer(newState).lastProcessedSequence).newPosition !== this.getPlayer(newState).x) {
                    // Do Reconciliation
                    console.log('recos');
                    this.stateBuffer.unshift(newState);
                }
            
            } else {
                // for other players

                if (!this.otherPlayers.find(player => player.id === p.id)) {
                    console.log('hehe');
                    
                    this.otherPlayers.push(new OtherPlayer(p.id, JSON.parse(JSON.stringify(p))));
                } else {


                    this.otherPlayers.find(player => player.id === p.id).updateState(JSON.parse(JSON.stringify(p)));
                    


                }
            }



        })
        
    }

    draw() {
        this.ctx.clearRect(0,0, 600, 600);
        this.state.players.forEach(player => {

            const isPlayer = player.id === this.socket.id;
            const color = isPlayer ? player.color : 'blue';
            const x = isPlayer ? player.x : this.otherPlayers.find(_p => _p.id === player.id).state.x;
            const y = isPlayer ? player.y : this.otherPlayers.find(_p => _p.id === player.id).state.y;

            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(
                x * 32,
                y * 32,
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
