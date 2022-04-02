import React from 'react'
import _toString from 'lodash/toString'
import { CONTACT_EMAIL } from 'redux/constants'

class CrashHandler extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      appCrashed: false,
      crashStack: '',
      errorMessage: '',
    }
  }

  static getDerivedStateFromError(error) {
    return {
      errorMessage: _toString(error),
      crashStack: error?.stack,
      appCrashed: true,
    }
  }

  render() {
    const { appCrashed, crashStack, errorMessage } = this.state
    const { children } = this.props

    if (appCrashed) {
      return (
        <div>
          <b>
            The app crashed, sorry about that.. :(
            <br />
            Please, tell us about it at {CONTACT_EMAIL}
            <br />
            To continue using the website, please reload the page.
          </b>

          <br />
          <br />

          <p>
            Technical crash information:
            <br />
            <i>
              {errorMessage}
              <br />
              {crashStack}
            </i>
          </p>
        </div>
      )
    }

    return children
  }
}

export default CrashHandler
