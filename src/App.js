import React, { Component } from 'react';
//import logo from './logo.svg';
import './App.css';
import SlideGame from './SlideGame.jsx';

class App extends Component {
  render() {
    return (
      <div className="App">
         <SlideGame gridsize={3} />
      </div>
    );
  }
}

export default App;
