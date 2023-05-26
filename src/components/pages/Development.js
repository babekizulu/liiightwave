//libs
import React, {useState, useEffect} from 'react';
//components
import Link from '../Link';
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
  }
  //side effects
  useEffect(() => {
    responsiveScreenHandler();
  }, []);
  return (
    <div className='development-page'>
      <div className='page-header-container'>
        <header className='page-header'>
          <h1>development_</h1>
        </header>
      </div>
      <div className='repo-container'>
        <Link
          href='https://github.com/liiightwave/formuliii'
          className='repo'
        >
          <GitHubIcon fontSize={responsive ? 'medium' : 'large'} className='icon'/>
          FORMULiii GitHub Repository
        </Link>
      </div>
    </div>
  );
};

export default Development;
