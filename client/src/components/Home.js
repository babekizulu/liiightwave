//libs
import React from 'react';
//components
import SignUpBtn from './buttons/SignUpBtn';
import SignInBtn from './buttons/SignInBtn';

const Home = () => {
  return (
    <div className='home-page'>
      <div className='auth-box'>
        <SignUpBtn />
        <SignInBtn />
      </div>
    </div>
  );
};

export default Home;
