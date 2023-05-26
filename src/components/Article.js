//libs
import React from 'react';
//components
import Link from './Link';

const Article = ({ contentHeader, contentHref, content }) => {
  return (
    <div className='article'>
      <Link
        href={contentHref}
        className='article-header-container'
      >
        {contentHeader}
      </Link>
      <br />
      <div className='article-content-container'>{content}</div>
    </div>
  );
};

export default Article;
