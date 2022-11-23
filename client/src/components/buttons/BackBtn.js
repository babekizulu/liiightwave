//libs
import React from 'react';
//components
import Link from '../Link';

const BackBtn = ({ prevUrl }) => {
  return (
    <Link href={prevUrl} className='btn-container'>
      <button className='back-btn'>back</button>
    </Link>
  );
};

export default BackBtn;
