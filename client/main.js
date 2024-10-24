import { io } from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";
import { Game } from './index.js';


let state = {};
const game = new Game();
console.log(game);

const lagController = document.getElementById('lagController');
lagController.addEventListener('input', (ev) => {
  console.log('change lag: ', ev.target.value);

  game.fakeLag = ev.target.value;
})

const socket = io('ws://localhost:3000');
game.socket = socket;
socket.on('GAME', (initalData) => {
  console.log(initalData);
  state = { ...initalData };
  game.start(state);
});

socket.on('GAME_UPDATE', (data) => {
  state = { ...data };
  game.updateState(state);
});

document.addEventListener('keydown', (ev) => {
  if (game.isMoving) {
    return;
  }
  if (ev.key === 'ArrowRight') {
    console.log('emitting right');
    // socket.emit('INPUT', {key:'right', sequence: game.lastKeyPressed ? game.lastKeyPressed.sequence + 1 : 1});
    // game.lastAction = {key:'right', sequence: game.lastAction.sequence + 1};
    game.lastKeyPressed = 'right';
  } else if (ev.key === 'ArrowLeft') {
    // socket.emit('INPUT', {key:'left', sequence: game.lastKeyPressed ? game.lastKeyPressed.sequence + 1 : 1});
    // game.lastAction = {key:'left', sequence: game.lastAction.sequence + 1};
    game.lastKeyPressed = 'left';
  }
});

document.addEventListener('keyup', (ev) => {
  if (ev.key === 'ArrowRight') {
    console.log('emitting null');
    // socket.emit('INPUT', {key: null, sequence: game.lastKeyPressed ? game.lastKeyPressed.sequence + 1 : 1});
    // game.lastAction = {key: null, sequence: game.lastAction.sequence + 1};
    game.lastKeyPressed = 'none';
  } else if (ev.key === 'ArrowLeft') {
    // socket.emit('INPUT', {key: null, sequence: game.lastKeyPressed ? game.lastKeyPressed.sequence + 1 : 1});
    // game.lastAction = {key: null, sequence: game.lastAction.sequence + 1 };
    game.lastKeyPressed = 'none';

  }
})