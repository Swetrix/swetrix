import { useEffect, useState } from 'react'

type ScriptStatus = 'idle' | 'loading' | 'ready' | 'error'

const getScriptStatus = (src: string): ScriptStatus => {
  if (!src) return 'idle'
  if (typeof document === 'undefined') return 'loading'

  const existingScript = document.querySelector(`script[src="${src}"]`)
  const dataStatus = existingScript?.getAttribute('data-status')

  if (dataStatus === 'ready' || dataStatus === 'error') {
    return dataStatus as ScriptStatus
  }

  return 'loading'
}

const useScript = (src: string) => {
  const [prevSrc, setPrevSrc] = useState(src)
  const [status, setStatus] = useState<ScriptStatus>(() => getScriptStatus(src))

  // Handle src changes during render (React-recommended pattern for syncing state with props)
  if (src !== prevSrc) {
    setPrevSrc(src)
    setStatus(getScriptStatus(src))
  }

  useEffect(() => {
    if (!src || status === 'ready' || status === 'error') {
      return
    }

    let script = document.querySelector(
      `script[src="${src}"]`,
    ) as HTMLScriptElement | null

    if (!script) {
      script = document.createElement('script')
      script.src = src
      script.defer = true
      script.setAttribute('data-status', 'loading')
      document.head.appendChild(script)
    }

    const handleLoad = () => {
      script!.setAttribute('data-status', 'ready')
      setStatus('ready')
    }

    const handleError = () => {
      script!.setAttribute('data-status', 'error')
      setStatus('error')
    }

    script.addEventListener('load', handleLoad)
    script.addEventListener('error', handleError)

    return () => {
      script!.removeEventListener('load', handleLoad)
      script!.removeEventListener('error', handleError)
    }
  }, [src, status])

  return status
}

export default useScript
