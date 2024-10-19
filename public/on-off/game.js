let dots;
let size;

function initDots() {
    let dots = Array(size).fill().map(() => Array(size).fill(2));
    for(let x = 0; x < size; x++) {
        dots[x] = [];
        for(let y = 0; y < size; y++) {
            if(Math.random() < 0.25) {
                dots[x][y] = 1; //on
            } else {
                dots[x][y] = 0; //off
            }
        }
    }
    return dots;
}

function create(game, size) {
    dots = initDots();
}

function update(game) {
    //game.setDot(x,y,Color.Color)
    let howManyOff = 0;
    for(let x = 0; x < size; x++) {
        for(let y = 0; y < size; y++) {
            if(dots[x][y] == 1) {
                game.setDot(x,y,Color.Yellow);
            } else if(dots[x][y] == 0){
                game.setDot(x,y,Color.Black);
                howManyOff++;
            } else {
                game.setDot(x,y,"#ffffff");
            }
        }
    }
    game.setText("Off: " + howManyOff);
}

function onDotClicked(x,y) {
    //at point
    dots[x][y] = 1 - dots[x][y];
    console.log("clicked: " + x + "," + y);

    //one below
    if(y > 0) {
        dots[x][y-1] = 1 - dots[x][y-1];
    }

    //one above
    if(y < size-1) {
        dots[x][y+1] = 1 - dots[x][y+1];
    }

    //one right
    if(x > 0) {
        dots[x-1][y] = 1 - dots[x-1][y];
    }

    //one left
    if(x < size-1) {
        dots[x+1][y] = 1 - dots[x+1][y];
    }

}

function onKeyPress(direction) {}

let game = null;

function make(size) {
    let config = {
        create: create,
        update: update,
        onKeyPress: onKeyPress,
        gridHeight: size,
        gridWidth: size,
        onDotClicked: onDotClicked,
        containerId: "game"
      };
      
      if (game != null) {
        game.end();
        document.getElementsByTagName("canvas")[0].remove();
      }
        
      game = new Game(config);
      game.run();
}