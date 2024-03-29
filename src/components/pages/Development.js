//libs
import React, { useState, useEffect } from 'react';
//icons
import GitHubIcon from '@mui/icons-material/GitHub';

const Development = () => {
  //state management
  const [responsive, setResponsive] = useState(false);
  //handlers
  const responsiveScreenHandler = () => {
    if (window.screen.width <= 540) {
      setResponsive(true);
    }
  };
  //side effects
  useEffect(() => {
    responsiveScreenHandler();
  }, []);
  return (
    <div className='development-page'>
      <div className='page-header-container'>
        <header className='page-header'>
          <h1>development</h1>
        </header>
      </div>
      <div className='repo-container'>
        <a
          href='https://github.com/babekizulu/formuliii'
          target='_BLANK'
          className='repo'
          rel='noreferrer'
        >
          <GitHubIcon
            fontSize={responsive ? 'medium' : 'large'}
            className='icon'
          />
          FORMULiii GitHub Repository
        </a>
      </div>
    </div>
  );
};

export default Development;
