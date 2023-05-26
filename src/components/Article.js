//libs
import React from 'react';

const Article = ({ contentHeader, contentHref, content }) => {
  return (
    <div className='article'>
      <a
        href={contentHref}
        target='_BLANK'
        className='article-header-container'
        rel='noreferrer'
      >
        {contentHeader}
      </a>
      <br />
      <div className='article-content-container'>{content}</div>
    </div>
  );
};

export default Article;
