//libs
import React from 'react';
//components
import Link from '../Link';
//icons
import formuliiiIcon from '../icons/FORMULiii.svg';

const Apps = () => {
  return (
    <div className='apps-page'>
      <div className='page-header-container'>
        <header className='page-header'>
          <h1>apps_</h1>
        </header>
      </div>
      <div className='app-menu'>
        <nav>
          <ul>
            <li>
              <Link href='https://formuliii.com' className='menu-item'>
                <img src={formuliiiIcon} alt='formuliii icon' />
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default Apps;
