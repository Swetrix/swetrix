import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter } from 'react-router-dom'
import { store } from 'store'
import { Provider } from 'react-redux'
import { transitions, positions, Provider as AlertProvider } from 'react-alert'
import AlertTemplate from 'react-alert-template-basic'
import './index.scss'
import 'bootstrap/dist/css/bootstrap.min.css'
import App from './App'
// import reportWebVitals from './reportWebVitals'

const options = {
  position: positions.BOTTOM_RIGHT,
  timeout: 7000,
  offset: '30px',
  transition: transitions.SCALE
}

ReactDOM.render(
  <React.StrictMode>
    <AlertProvider template={AlertTemplate} {...options}>
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    </AlertProvider>
  </React.StrictMode>,
  document.getElementById('root')
)

// reportWebVitals()