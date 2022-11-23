//libs
import React from 'react';
//components
import Header from './Header';
import Route from './Route';
//pages
import Home from './Home';
import Dashboard from './Dashboard';
import Downloads from './Downloads';
import SignUp from './SignUp';
import SignIn from './SignIn';
const App = () => {
  return (
    <div className='app-container'>
      <Header />
      {/*MAIN APP PAGES*/}
      <Route path='/'>
        <Home />
      </Route>
      <Route path='/dashboard'>
        <Dashboard />
      </Route>
      <Route path='/downloads'>
        <Downloads />
      </Route>
      {/*AUTHORIZATION PAGES*/}
      <Route path='/sign-up'>
        <SignUp />
      </Route>
      <Route path='/sign-in'>
        <SignIn />
      </Route>
    </div>
  );
};

export default App;
