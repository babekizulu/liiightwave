//libs
import React from 'react';
//components
import Link from '../Link';

const SignUpBtn = () => {
  return (
    <Link href='/sign-up' className='btn-container'>
      <button className='sign-up-btn'>sign up</button>
    </Link>
  );
};

export default SignUpBtn;
