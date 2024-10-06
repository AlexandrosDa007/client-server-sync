const CELL_IN_PX = 32;
class OtherPlayer {
    id;
    state;
    actions = [];
    isMoving = false;
    pixelsToWalk = CELL_IN_PX;
    stateBuffer = [];
    applyingStateBuffer = null;

    constructor(id, state) {
        this.id = id;
        this.state = state;
    }
    
    update(delta) {
        
        if (this.applyingStateBuffer) {
            this.applyMovementFromReconciliation(this.applyingStateBuffer,delta);
            return;
        }

        if (this.stateBuffer.length) {
            this.isMoving = true;
            const newState = this.stateBuffer.pop();
            this.pixelsToWalk = Math.abs(newState.x - this.state.x) * 32;
            if (!this.pixelsToWalk) {
                this.isMoving = false;
                this.applyingStateBuffer = null;
                this.pixelsToWalk = 32;
                return;
            }

            this.actions[newState.lastProcessedSequence - 1] = {
                sequence: newState.lastProcessedSequence,
                oldPosition: this.state.x,
                newPosition: newState.x,
            }
            this.applyingStateBuffer = this.actions[newState.lastProcessedSequence - 1];
            this.applyMovementFromReconciliation(this.applyingStateBuffer, delta);
            return;
        }
    }

    applyMovementFromReconciliation(action, delta) {
        // Smooth movement
        if (!action.newPosition) {
            debugger;
        }
        const {oldPosition, newPosition} = action;


        const movementSpeed = 0.15;
        const deltaTime = delta / 1000;

        const unitsToTravel = newPosition >= this.state.x ? 1 : - 1;
        this.state.x += unitsToTravel / 32;
        this.pixelsToWalk--;
        if (this.pixelsToWalk === 0) {
            if (!Number.isInteger(this.state.x)) {
                debugger;
            }
            this.isMoving = false;
            this.pixelsToWalk = 32;
            this.applyingStateBuffer = null;
        }
    }

    updateState(newState) {
        console.log('hehe',newState);
        
        // compare old and new state
        if (!this.actions.length) {
            this.stateBuffer.unshift(newState); 
            return;
        }
        if (this.actions.at(-1).newPosition !== newState.x) {
            // Do Reconciliation
            console.log('reco other player: ', newState.id);
            this.stateBuffer.unshift(newState);
        }
    }
}

export {
    OtherPlayer,
}