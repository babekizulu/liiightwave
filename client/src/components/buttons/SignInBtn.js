//libs
import React from 'react';
//components
import Link from '../Link';

const SignInBtn = () => {
  return (
    <Link href='/sign-in' className='btn-container'>
      <button className='sign-in-btn'>sign in</button>
    </Link>
  );
};

export default SignInBtn;
