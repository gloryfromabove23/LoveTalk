import React, { useState } from 'react';
import './style.css';
import HeartLogo from './assets/heart-logo.png';

function App() {
  const [bouncing, setBouncing] = useState(false);

  return (
    <div className="app-container">
      <img
        src={HeartLogo}
        alt="Heart Logo"
        className={`logo ${bouncing ? 'bouncing' : ''}`}
      />
      <div className="controls">
        <button onClick={() => setBouncing(true)}>Start Talking</button>
        <button onClick={() => setBouncing(false)}>Stop Talking</button>
      </div>
    </div>
  );
}

export default App;
