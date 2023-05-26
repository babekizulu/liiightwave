//libs
import { useEffect, useState } from 'react';

const Route = ({ path, children }) => {
  //create a current path & setter
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  //change pathname on nav event
  useEffect(() => {
    const onLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    //run location change function on nav event
    window.addEventListener('popstate', onLocationChange);
    //cleanup function to remove nav event listener
    return () => {
      window.removeEventListener('popstate', onLocationChange);
    };
  }, []);
  //check current path against component path
  //render appropriate component based on component path
  return currentPath === path ? children : null;
};

export default Route;
