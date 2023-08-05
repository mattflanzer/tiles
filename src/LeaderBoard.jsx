import React, { Component } from 'react';
import Modal from './Modal.jsx';
import moment from 'moment';
import './LeaderBoard.css';

const DEFAULT_PLACES = 10; // hold top 10 by default

class LeaderBoard extends Component {
    constructor(props) {
        super(props);
        this.numPlaces = props.places ? props.places : DEFAULT_PLACES;
        this.hostname = this.props.hostname;
        this.hideModal = this.hideModal.bind(this);
        this.nameRef = React.createRef();
        this.modalPromise = [null,null];
        this.state = {
            leaderboard: [],
            showModal: false
        }
    }

    async componentDidMount() {
        if (this.state.leaderboard.length == 0) {
            let leaderboard = await this.loadLeaderboard();
            this.setState({
                leaderboard: leaderboard
            });
        }
    }

    async componentDidUpdate(prevProps, prevState, snapshot) {
        let winData = this.props.winData;
        let prevWinData = prevProps.winData;
        //let allowAdd = ((winData.winAt === undefined) || (prevWinData.winAt === undefined) || (winData.winAt > prevWinData.winAt)); 
        let allowAdd = (winData.state !== prevWinData.state) || (this.props.boardName !== prevProps.boardName);
        if (allowAdd) {
            try {
                let leaderboard = await this.loadLeaderboard();
                console.log(leaderboard);
                if (winData.state) {
                    let win = {
                        id: null,
                        score: Math.round(winData.score * 100) / 100,
                        name: winData.name,
                        timestamp: moment.utc(winData.winAt),
                        board: this.props.boardName
                    };
                    leaderboard = await this.addScore(leaderboard,win,this.props.golf);
                }
                this.setState({
                    leaderboard: leaderboard
                });
            } catch (err) {
                console.log(err.message);
            }
        }
    }

    async loadLeaderboard() {
        const name = this.props.boardName;
        try {
            let url = `${this.hostname}/api/leaderboard/${name}`;
            let obj = await fetch(url,{
                method: 'GET',
                headers: {
                    Accept: 'application/json'
            }});
            if (obj.ok) {
                let jobj = await obj.json();
                console.log(jobj);
                let leaderboard = jobj.data.map((j)=>{
                    j.timestamp = moment.utc(j.timestamp);
                    return j;
                });
                return leaderboard;
            } else {
                throw new Error(`Error ${obj.status} ${obj.statusText}: ${obj.url}`);
            }
        } catch (err) {
            console.log(`Leaderboard load error: ${err.message}`);
        }
        return [];
    }

    async saveLeaderboard(leaderboard) {
        const name = this.props.boardName;
        try {
            let url = `${this.hostname}/api/leaderboard`;
            let jobj = {
                'board':name,
                'data-size': leaderboard.length,
                'data': leaderboard
            };
            let jstr = JSON.stringify(jobj);
            console.log(jstr);
            await fetch(url,{
                method: 'POST',
                body: jstr,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin':'*'
                }
            });
        } catch (err) {
            console.log(`Leaderboard save error: ${err.message}`);
        }
    }

    async addScore(leaderboard, win, isGolf) {
        console.log(leaderboard);
        console.log(win);
        console.log(isGolf);
        // no name, no save
        let name = win.name;
        if ((name === null)||(name === false)||(name.length==0)) {
            return leaderboard;
        }
        // comparison function
        let scoreCompare = (a,b)=> {
            return (isGolf ? (a<=b) : (a>=b));
        };
        // find place for it
        let needSave = false;
        if (leaderboard.length > 0) {
            let i = leaderboard.findIndex((p)=>scoreCompare(win.score,p.score));
            console.log(`add score at ${i}`);
            // add it if necessary
            if ((i >= 0)&&(i < this.numPlaces)&&(win.timestamp > leaderboard[i].timestamp)) {
                leaderboard.splice(i,0,win);
                needSave = true;
            } else if ((i<0)&&(leaderboard.length < this.numPlaces)) {
                leaderboard.push(win);
                needSave = true;
            }
        } else {
            leaderboard = [win];
            needSave = true;
        }
        // remove extra elements
        if (leaderboard.length > this.numPlaces) {
            leaderboard.splice(-1,1);
        }
        // save it if nec.
        if (needSave) {
            // get the name
            let new_name = await this.getName();
            // fix ids
            leaderboard = leaderboard.map((p,i)=>{
                if (p.id == null) {
                    p.name = new_name;
                    console.log("Got new name: "+p.name);
                }
                p.id = i+1;
                return p;
            });
            // save it
            await this.saveLeaderboard(leaderboard);
        }
        return leaderboard;
    }

    showModal() {
        this.setState({ showModal: true });
    }
    
    hideModal() {
        this.setState({ showModal: false });
        let [resolve, reject] = this.modalPromise;
        try {
            const input = this.nameRef.current;
            const name = input.value;
            console.log("Name from dialog: "+name);
            if (resolve && name) {
                resolve(name);
            } else {
                reject(Error("user canceled"));
            }
        } catch (err) {
            console.log("Could not get name from dialog");
            if (reject) {
                reject(err);
            }
        }
    }

    async getName() {
        return new Promise((resolve,reject) => {
            this.showModal();
            this.modalPromise = [resolve,reject];
        });
    }
    

    render() {
        let leaderboard = this.state.leaderboard;
        let tstyle = {
            width: this.props.tableWidth
        }
        return (
        <div className='leaderboard' style={tstyle}>
            <span>Leader Board</span>
            <Modal show={this.state.showModal} handleClose={this.hideModal}>
                <p>Congratulations! You got a top score.</p>
                <div>
                    <label htmlFor="name">Your Name</label>
                    <input id="name" name="name" type="text" placeholder="Name" defaultValue="" readOnly={false} ref={this.nameRef}/>
                </div>
            </Modal>
            <table style={tstyle}><tbody>
            {
                leaderboard.map((p,idx)=>{
                    let key = `leaderboard-${idx}`;
                    let timedisplay = p.timestamp.local().format('L LTS');
                    return (
                        <tr key={key}>
                            <td className='leaderboard-id'>{p.id}.</td>
                            <td className='leaderboard-name'>{p.name}</td>
                            <td className='leaderboard-score'>{p.score}'</td>
                            <td className='leaderboard-time'>{timedisplay}</td>
                        </tr>
                    ) 
                }) 
            }
            </tbody></table>
        </div>
        );
    }
}


export default LeaderBoard;