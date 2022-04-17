import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter } from 'react-router-dom'
import { store } from 'redux/store'
import { Provider } from 'react-redux'
import { I18nextProvider } from 'react-i18next'
import { HelmetProvider } from 'react-helmet-async'
import { transitions, positions, Provider as AlertProvider } from '@blaumaus/react-alert'
import * as Swetrix from 'swetrix'
import 'billboard.js/dist/billboard.min.css'
import 'prismjs/themes/prism-tomorrow.css'

import { isSelfhosted } from 'redux/constants'
import CrashHandler from 'pages/CrashHandler'
import AlertTemplate from 'ui/Alert'
import App from './App'
import i18next from './i18next'
import './index.css'

const SWETRIX_PID = 'STEzHcB1rALV'

console.log('%cWelcome, hacker, glad you opened your console, you seem serious about your craft and will go a long way!\nP.S. All the bugs, feature requests are welcome to be sent to security@swetrix.com', 'color: #818cf8;background: #1f2937;font-size: 20px;text-shadow: 2px 2px black')

if (!isSelfhosted) {
  Swetrix.init(SWETRIX_PID)
  Swetrix.trackViews({
    ignore: [/^\/projects/i, /^\/verify/i, /^\/password-reset/i],
    heartbeatOnBackground: true,
  })
}

const options = {
  position: positions.BOTTOM_RIGHT,
  timeout: 8000,
  offset: '30px',
  transition: transitions.SCALE
}

if (process.env.NODE_ENV !== 'production') {
  localStorage.debug = 'swetrix:*'
}

ReactDOM.render(
  <React.StrictMode>
    <CrashHandler>
      <AlertProvider template={AlertTemplate} {...options}>
        <Provider store={store}>
          <HelmetProvider>
            <BrowserRouter>
              <I18nextProvider i18n={i18next}>
                <App />
              </I18nextProvider>
            </BrowserRouter>
          </HelmetProvider>
        </Provider>
      </AlertProvider>
    </CrashHandler>
  </React.StrictMode>,
  document.getElementById('root'),
)
