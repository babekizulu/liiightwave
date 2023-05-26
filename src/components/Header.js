//libs
import React from 'react';
//component
import Logo from './Logo';
import NavBar from './NavBar';

const Header = () => {
  return (
    <div className='header-container'>
      <Logo />
      <NavBar />
    </div>
  );
};

export default Header;
