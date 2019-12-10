import * as React from 'react';
import { Route, Switch } from 'react-router-dom';
import Loadable from 'react-loadable';

import './App.css';

const Home = Loadable({
  loader: () => import(/* webpackChunkName: "home" */ './Home'),
  loading: () => null,
});

const App = () => (
  <Switch>
    <Route exact path="/" component={Home} />
  </Switch>
);

export default App;
