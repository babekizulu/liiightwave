//libs
import React from 'react';
//components
import Link from './Link';

const NavBar = () => {
  return (
    <div className='navbar'>
      <ul>
        <li>
          <Link href='/' className='nav-item'>
            home<span>_</span>
          </Link>
        </li>
        <li>
          <Link href='/research' className='nav-item'>
            research<span>_</span>
          </Link>
        </li>
        <li>
          <Link href='/development' className='nav-item'>
            development<span>_</span>
          </Link>
        </li>
        <li>
          <Link href='/ethics' className='nav-item'>
            ethics<span>_</span>
          </Link>
        </li>
        {/* <li>
          <Link href='/careers' className='nav-item'>
            careers<span>_</span>
          </Link>
        </li>
        <li>
          <Link href='/apps' className='nav-item'>
            apps<span>_</span>
          </Link>
        </li> */}
        {/* <li>
          <Link href='/support' className='nav-item'>
            support<span>_</span>
          </Link>
        </li> */}
      </ul>
    </div>
  );
};

export default NavBar;
