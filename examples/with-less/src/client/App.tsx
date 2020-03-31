import * as React from 'react'
import { Route, Switch } from 'react-router-dom'

import './App.less'
import Home from './Home'
// import Loadable from 'react-loadable';

// const Home = Loadable({
//   loader: () => import(/* webpackChunkName: "home" */ './Home'),
//   loading: () => null,
// });

const App = () => (
  <Switch>
    <Route exact path="/" component={Home}/>
  </Switch>
)

export default App
