//libs
import React from 'react';
//components
import ModelContainer from '../ModelContainer';

const Home = () => {
  return (
    <div className='home-page'>
      <div className='page-header-container'>
        <header className='page-header'>
          <h1>
            for the th<span>iii</span>nkers_
          </h1>
        </header>
      </div>
      <div className='instruction-container'>
        <p>(click and drag to interact)</p>
      </div>
      <ModelContainer />
    </div>
  );
};

export default Home;
