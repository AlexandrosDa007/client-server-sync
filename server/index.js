import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: { origin: '*' }
});

const db = {
    players: [],
};

io.on("connection", (socket) => {
    console.log('connected');
    db.players.push({
        id: socket.id,
        x: Math.random() > 0.5 ? 6 : 10,
        y: Math.random() > 0.5 ? 6 : 10,
        color: 'red',
        inputBuffer: [],
    })
  const playerIndex = db.players.findIndex(item => item.id === socket.id);
  io.emit('GAME', db);
  socket.on('INPUT', ({key, sequence}) => {
    console.log('key: ', key, sequence);
    if(db.players[playerIndex].inputBuffer.some(item => item.sequence >= sequence)) {
        console.warn('Already done this sequence')
        return;
    }
    db.players[playerIndex].inputBuffer.push({key,sequence});
  });
});

httpServer.listen(3000, () => {
    console.log('server start');

    const loop = () => {
        // read all players and move them
        db.players.forEach(player => {
            if (player.inputBuffer.length === 0) {
                return;
            }

            // use input buffer to calculate new position
            movePlayer(player);
        });

        const hasUpdates = db.players.some(player => player.lastProcessedSequence);

        // send
        if (hasUpdates) {
            io.emit('GAME_UPDATE', db);
            db.players.forEach(p => p.lastProcessedSequence = undefined);
        }


    }


    setInterval(loop, 100);

});


function movePlayer(player) {
    const {inputBuffer} = player;
    const oldX = player.x;
    inputBuffer.sort((a,b) => a.sequence - b.sequence);
    console.log(inputBuffer[0], inputBuffer[1]);
    for (let i = 0;i < inputBuffer.length;i++) {
        switch (inputBuffer[i].key) {
            case 'right': {
                player.x++;
                break;
            }
            case 'left': {
                player.x--;
                break;
            }
            case 'none': {
                break;
            }
        }
    }

    if (player.x === 13) {
        player.x = 10;
        player.lastProcessedSequence = inputBuffer.at(-1).sequence;
    }


    if (oldX !== player.x) {
        player.lastProcessedSequence = inputBuffer.at(-1).sequence;
    }

    console.log('server pos: ', player.x);

    player.inputBuffer = [];

}