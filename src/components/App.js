//libs
import React from 'react';
//components
import Header from './Header';
import Route from './Route';
import Footer from './Footer';
//pages
import Home from './pages/Home';
import Research from './pages/Research';
import Development from './pages/Development';
import Ethics from './pages/Ethics';
//styling
import '../scss/App.scss';

const App = () => {
  return (
    <div className='app-container'>
      <Header />
      <Route path='/'>
        <Home />
      </Route>
      <Route path='/research'>
        <Research />
      </Route>
      <Route path='/development'>
        <Development />
      </Route>
      <Route path='/ethics'>
        <Ethics />
      </Route>
      <Footer/>
      {/* <Route path='/careers'>
        <Careers />
      </Route>
      <Route path='/apps'>
        <Apps />
      </Route>
      <Route path='/support'>
        <Support />
      </Route> */}
    </div>
  );
};

export default App;
