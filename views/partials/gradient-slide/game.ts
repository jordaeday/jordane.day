// function randomColor() {
//   let result = '';
//   for (let i = 0; i < 6; ++i) {
//     const value = Math.floor(16 * Math.random());
//     result += value.toString(16);
//   }
//   return '#' + result;
// }

// let topLeft = randomColor();
// let bottomRight = randomColor();

// function initDots() {
//   let dots = [];
//   for(let x = 0; x < size; x++) {
//       dots[x] = [];
//       for(let y = 0; y < size; y++) {
//         //use RGB values

//       }
//   }
//   return dots;
// }

let actualBottomRight = "#7149a1";

let solution: string[][] = 
[
  ["#fe0b11", "#d2363a", "#a56065", "#778a8e", "#4bb4b7", "#1ddfdf"],
  ["#ff2134", "#d73f58", "#ac5f73", "#857b93", "#5b9cb2", "#31b9cf"],
  ["#ff375b", "#db4b6f", "#b65b84", "#946f9b", "#6c81ac", "#4794c2"],
  ["#fe4d81", "#de538a", "#be5b92", "#9e619d", "#7d67a7", "#5a6fb2"],
  ["#ff62a5", "#e15ea4", "#c758a5", "#ab52a4", "#8b4da2", "#ffffff"]
]

let height = solution.length;
let width = solution[0].length;

let randomized: string[][] = randomize(solution);

solution[height-1][width-1] = actualBottomRight;

function randomize(solution: string[][]) {
  let randomized: string[][] = [];
  for(let r = 0; r < height; r++) {
    randomized[r] = [];
    for(let c = 0; c < width; c++) {
      randomized[r][c] = solution[r][c];
    }
  }
  for(let r = 0; r < height; r++) {
    for(let c = 0; c < width; c++) {
      let swapR = Math.floor(Math.random() * height);
      let swapC = Math.floor(Math.random() * width);
      let temp = randomized[r][c];
      randomized[r][c] = randomized[swapR][swapC];
      randomized[swapR][swapC] = temp;
    }
  }
  return randomized;
}

function testIfSolved() {
  let solved = true;
  for(let r = 0; r < height; r++) {
    for(let c = 0; c < width; c++) {
      if(r == height-1 && c == width-1) {
        continue;
      }
      if(randomized[r][c] != solution[r][c]) {
        solved = false;
      }
    }
  }
  return solved;
}

function create(game:Game) {
  for(let r = 0; r < config.gridHeight; r++) {
    for(let c = 0; c < config.gridWidth; c++) {
      game.setDot(c, r, solution[r][c]);
    }
  }
}

let waitPeriod = 24*5;

function update(game:Game) {
  if(testIfSolved() || waitPeriod > 0) {
    for(let r = 0; r < config.gridHeight; r++) {
      for(let c = 0; c < config.gridWidth; c++) {
        game.setDot(c, r, solution[r][c]);
      }
    }
    if(waitPeriod > 0) {
      game.setText(("" + waitPeriod/24).substring(0, 3));
    } else {
      game.setText("Solved!");
    }
    waitPeriod--;
  } else {
    game.setText("");
    for(let r = 0; r < config.gridHeight; r++) {
      for(let c = 0; c < config.gridWidth; c++) {
        game.setDot(c, r, randomized[r][c]);
      }
    }
  }
}

function onDotClicked(x: number, y: number) {
  //first, check to see if white dot is next to clicked dot
  //if so, swap colors
  console.log("clicked " + x + ", " + y);
  if(y-1 >= 0 && randomized[y-1][x] == "#ffffff") {
    randomized[y-1][x] = randomized[y][x];
    randomized[y][x] = "#ffffff";
  }
  if(y+1 < height && randomized[y+1][x] == "#ffffff") {
    randomized[y+1][x] = randomized[y][x];
    randomized[y][x] = "#ffffff";
  }
  if(x-1 >= 0 && randomized[y][x-1] == "#ffffff") {
    randomized[y][x-1] = randomized[y][x];
    randomized[y][x] = "#ffffff";
  }
  if(x+1 < width && randomized[y][x+1] == "#ffffff") {
    randomized[y][x+1] = randomized[y][x];
    randomized[y][x] = "#ffffff";
  }

}

let config = {
  create: create,
  update: update,
  gridHeight: 5,
  gridWidth: 6,
  onDotClicked: onDotClicked
};

let game = new Game(config);
game.run();