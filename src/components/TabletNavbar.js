//libs
import React from 'react';
//components
import Link from './Link';
//icons
import HomeIcon from '@mui/icons-material/Home';
import EmojiObjectsIcon from '@mui/icons-material/EmojiObjects';
import DeveloperBoardIcon from '@mui/icons-material/DeveloperBoard';

const TabletNavbar = () => {
  return (
    <div className='tablet-navbar'>
      <nav>
        <ul>
          <li>
            <Link href='/' className='tablet-nav-item'>
              <HomeIcon />
            </Link>
          </li>
          <li>
            <Link href='/research' className='tablet-nav-item'>
              <EmojiObjectsIcon />
            </Link>
          </li>
          <li>
            <Link href='/development' className='tablet-nav-item'>
              <DeveloperBoardIcon />
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default TabletNavbar;
