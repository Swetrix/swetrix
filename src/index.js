import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter } from 'react-router-dom'
import { store } from 'redux/store'
import { Provider } from 'react-redux'
import { transitions, positions, Provider as AlertProvider } from 'react-alert'
import * as Sentry from '@sentry/react'
import { Integrations } from '@sentry/tracing'
import 'billboard.js/dist/billboard.min.css'
import 'prismjs/themes/prism-tomorrow.css'

import AlertTemplate from 'ui/Alert'
import App from './App'
import reportWebVitals from './reportWebVitals'
import './index.css'

Sentry.init({
  dsn: 'https://ce538bac7e64484d9a30dcb2eadfe69b@o920340.ingest.sentry.io/5865898',
  integrations: [new Integrations.BrowserTracing()],
  tracesSampleRate: 1.0,
})

const options = {
  position: positions.BOTTOM_RIGHT,
  timeout: 7000,
  offset: '30px',
  transition: transitions.SCALE
}

if (process.env.NODE_ENV !== 'production') {
  localStorage.debug = 'analytics:*'
}

ReactDOM.render(
  <React.StrictMode>
    <AlertProvider template={AlertTemplate} {...options}>
      <Provider store={store}>
        <BrowserRouter>
          <Sentry.ErrorBoundary fallback={<p>The app crashed.. :(<br/>Please, tell us about it at contact@swetrix.com</p>}>  
            <App />
          </Sentry.ErrorBoundary>
        </BrowserRouter>
      </Provider>
    </AlertProvider>
  </React.StrictMode>,
  document.getElementById('root')
)

reportWebVitals()
