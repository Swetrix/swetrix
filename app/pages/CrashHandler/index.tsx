import React from 'react'
import _toString from 'lodash/toString'
import { ExclamationTriangleIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { CONTACT_EMAIL, PAGE_FORCE_REFRESHED, isBrowser } from 'redux/constants'

interface CrashHandlerProps {
  children: JSX.Element
}

interface CrashHandlerState {
  appCrashed: boolean
  crashStack: string
  errorMessage: string
  crashStackShown: boolean
}

const retryPageLoading = () => {
  if (!isBrowser) {
    return null
  }

  const wasPageForceRefreshed = sessionStorage.getItem(PAGE_FORCE_REFRESHED) === 'true'

  if (!wasPageForceRefreshed) {
    sessionStorage.setItem(PAGE_FORCE_REFRESHED, 'true')
    return window.location.reload()
  }

  return null
}

class CrashHandler extends React.Component<CrashHandlerProps, CrashHandlerState> {
  constructor(props: CrashHandlerProps) {
    super(props)
    this.state = {
      appCrashed: false,
      crashStack: '',
      errorMessage: '',
      crashStackShown: false,
    }
  }

  componentDidCatch() {
    retryPageLoading()
  }

  static getDerivedStateFromError(error: Error) {
    return {
      errorMessage: _toString(error),
      crashStack: error?.stack,
      appCrashed: true,
    }
  }

  onCrashStackClick = () => {
    this.setState((prevState) => ({
      crashStackShown: !prevState.crashStackShown,
    }))
  }

  render() {
    const {
      appCrashed, crashStack, errorMessage, crashStackShown,
    } = this.state
    const { children } = this.props

    if (appCrashed) {
      return (
        // Using style because for some reason min-h-screen doesn't work
        <div style={{ minHeight: '100vh' }} className='pt-16 pb-12 flex flex-col bg-gray-50 dark:bg-slate-900'>
          <div className='flex-grow flex flex-col justify-center max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8'>
            <div className='flex-shrink-0 flex justify-center'>
              <ExclamationTriangleIcon className='h-24 w-auto text-yellow-400 dark:text-yellow-600' />
            </div>
            <div className='py-8'>
              <div className='text-center'>
                <h1 className='text-4xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight sm:text-5xl'>Uh-oh..</h1>
                <p className='mt-2 text-base font-medium text-gray-800 dark:text-gray-300'>
                  The app has crashed. We are sorry about that :(
                  <br />
                  Please, tell us about it at
                  {' '}
                  {CONTACT_EMAIL}
                </p>
                <p className='mt-6 text-base font-medium text-gray-800 dark:text-gray-300'>
                  {errorMessage}
                  <br />
                  <span onClick={this.onCrashStackClick} className='flex justify-center items-center text-base text-gray-800 dark:text-gray-300 cursor-pointer hover:underline'>
                    {crashStackShown ? (
                      <>
                        Hide crash stack
                        <ChevronUpIcon className='w-4 h-4 ml-2' />
                      </>
                    ) : (
                      <>
                        Show crash stack
                        <ChevronDownIcon className='w-4 h-4 ml-2' />
                      </>
                    )}
                  </span>
                  {crashStackShown && (
                    <span className='text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line'>
                      {crashStack}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return children
  }
}

export default CrashHandler
