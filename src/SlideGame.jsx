import React, { Component } from 'react';
import {Motion, spring} from 'react-motion';
import LeaderBoard from './LeaderBoard.jsx';
import './SlideGame.css';


const springSetting1 = {stiffness: 180, damping: 10};
const springSetting2 = {stiffness: 120, damping: 17};

const tileSize = 50;
const maxGridSize = 6;
const minGridSize = 3;

/**
 * Shuffles array in place. ES6 version
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}


const API_HOST = (process.env.NODE_ENV === 'production') ? 'https://matt.flanzer.com' : 'http://localhost:8000';

class SlideGame extends Component {
    
    constructor(props) {
        super(props);
        this.gridSize = props.gridsize;
        this.handleReset = this.handleReset.bind(this);
        this.handleGrow = this.handleGrow.bind(this);
        this.handleShrink = this.handleShrink.bind(this);
        let rawTiles = this.newTiles();
        let newFree = this.newFree();
        this.state = {
            free: newFree,
            tiles: rawTiles,
            moves: 0,
            winner: {
                state: false
            }
        };
    }
    numTiles() {
        const gridsize = this.gridSize;
        return ((gridsize*gridsize)-1);
    }
    newFree() {
        return Math.floor(Math.random() * (this.numTiles()+1));
    }
    newTiles() {
        let rawTiles = Array(this.numTiles()).fill(0).map((val,idx) => {
            return idx;
        });
        rawTiles = shuffle(rawTiles);
        return rawTiles;
    }

    row(idx,isFree=false) {
        return Math.floor((idx >= this.state.free && (!isFree) ? idx+1 : idx)/this.gridSize);
    }
    col(idx,isFree=false) {
        return (idx >= this.state.free && (!isFree) ? idx+1 : idx) % this.gridSize;
    }
    canMove(idx) {
        const free = this.state.free;
        const idxRow = this.row(idx);
        const idxCol = this.col(idx);
        const freeRow = this.row(free,true);
        const freeCol = this.col(free,true);
        if (idxRow == freeRow) { // same row
            return ((idxCol+1==freeCol) || (idxCol-1==freeCol));
        } else if (idxCol == freeCol) { // same column
            return ((idxRow+1==freeRow) || (idxRow-1==freeRow));
        } else {
            return false;
        }
    }
    isWinner() {
        const tiles = this.state.tiles;
        const free = this.state.free;
        return ((free == this.numTiles()) 
            && (tiles.filter((t,key) => t==key).length == this.numTiles())
        );
    }

    handleClick(idx) {
        if (this.canMove(idx)) {
            // swap with free node
            const free = this.state.free;
            const moves = this.state.moves + 1;
            let newState = null;
            if (idx == free) { // to the right, only change free spot
                newState = {
                    free: idx+1,
                    moves: moves
                };
            } else if (idx+1 == free)  { // to the left, only change free spot
                newState = {
                    free: idx,
                    moves: moves
                };
            } else { // otherwise need to change free spot and tile positions
                const newFree = idx < free ? idx : idx + 1;
                let tiles = this.state.tiles.slice(0);
                const tmp = tiles[idx];
                tiles.splice(idx,1);
                //tiles.splice(free,0,tmp);
                tiles.splice(idx < free ? free-1 : free,0,tmp);
                // update state
                newState = {
                    free: newFree,
                    tiles: tiles,
                    moves: moves
                };
            }
            if (newState) {
                // winner?
                let willWin = false;
                if (newState.free == this.numTiles()) {
                    let winTiles = newState.tiles ? newState.tiles : this.state.tiles;
                    willWin = (winTiles.filter((t,key) => t==key).length == this.numTiles());
                }
                if (willWin && (!this.state.winner.state)) {
                    newState.winner = {
                        state: true,
                        score: moves,
                        name: "temp-name",
                        winAt: new Date()
                    };
                }
                this.setState(newState);
            }
        } else {
            console.log(`Tile ${idx} can not move`);
        }
    }

    handleReset() {
        let rawTiles = this.newTiles();
        let newFree = this.newFree();
        this.setState({
            free: newFree,
            tiles: rawTiles,
            moves: 0,
            winner: {
                state: false
            }
        });
    }

    handleShrink() {
        const gridsize = this.gridSize;
        if (gridsize > minGridSize) {
            this.gridSize = gridsize - 1;
            this.handleReset();
        } else {
            console.log("Grid size already at minimum.");
        }

    }
    handleGrow() {
        const gridsize = this.gridSize;
        if (gridsize < maxGridSize) {
            this.gridSize = gridsize + 1;
            this.handleReset();
        } else {
            console.log("Grid size already at maximum.");
        }

    }


    render() {
        const tiles = this.state.tiles;
        const moves = this.state.moves;
        const sz = this.gridSize;
        const winner = this.state.winner.state;
        let style = {
            width: Math.max(180,(tileSize * sz)),
            height: Math.max(180,(tileSize * sz)),
            backgroundColor: winner ? 'cyan' : 'initial'
        };
        let movesStyle = {
            top: tileSize * (sz+1)
        }
        let leaderStyle = {
            top: 2,
            width: style.width + 22,
        }
        let winData = this.state.winner;
        let leaderboard_name = `tiles-${sz}`;
        return (
            <div id="wrapper">
            <div className='SlideGame' style={style}>
            <div className='TileCount'><button onClick={this.handleShrink}>-</button>Size {sz}<button onClick={this.handleGrow}>+</button></div>
            <div id='content'> 
            {
                tiles.map((t,key) => {
                    let vizIdx = tiles.indexOf(key);
                    let x = this.col(vizIdx) * tileSize;
                    let y =  this.row(vizIdx) * tileSize;
                    let style = {
                        translateX: spring(x, springSetting2),
                        translateY: spring(y, springSetting2),
                        scale: spring(1, springSetting1),
                        boxShadow: spring((x - (3 * tileSize - 50) / 2) / 15, springSetting1)
                    };
                    return ( 
                        <Motion key={key} style={style}>
                            {({translateX, translateY, scale, boxShadow}) => {
                                return (
                                    <div className='Tile' 
                                        key={key}
                                        onClick={this.handleClick.bind(this,vizIdx)}
                                        style={{
                                            backgroundColor: this.canMove(vizIdx) ? "yellow" : "orange",
                                            WebkitTransform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`,
                                            transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`,
                                            boxShadow: `${boxShadow}px 5px 5px rgba(0,0,0,0.5)`,
                                            height: tileSize * 0.8,
                                            width: tileSize * 0.8
                                          }}
                                    >
                                    {key}
                                    </div>
                                );
                            }}
                        </Motion>
                    );
                })
            }
            </div>
            <div className='Moves' style={movesStyle}>
                Move Counter: {moves}<button onClick={this.handleReset}>Reset</button>
            </div>
            </div>
            <div id="leaderboard-spot" style={leaderStyle}>
                <LeaderBoard boardName={leaderboard_name} hostname={API_HOST} winner={winner} winData={winData} golf={true}/>     
            </div>
            </div>
        );
    }
}

export default SlideGame;