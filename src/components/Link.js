//libs
import React from 'react';

const Link = ({ href, className, children, target }) => {
  const onClick = (e) => {
    if (e.metaKey || e.ctrlKey) {
      return;
    }
    e.preventDefault();
    window.history.pushState({}, '', href);
    //create a new pop state event instance
    const navEvent = new PopStateEvent('popstate');
    window.dispatchEvent(navEvent);
  };
  return (
    <a
      target={target ? '_blank' : '_self'}
      href={href}
      className={className}
      onClick={onClick}
      rel='noreferrer'
    >
      {children}
    </a>
  );
};
export default Link;
