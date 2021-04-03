import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter } from 'react-router-dom'
import { store } from 'store'
import { Provider } from 'react-redux'
import './index.scss'
import 'bootstrap/dist/css/bootstrap.min.css'
import App from './App'
// import reportWebVitals from './reportWebVitals'

ReactDOM.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
  document.getElementById('root')
)

// reportWebVitals()