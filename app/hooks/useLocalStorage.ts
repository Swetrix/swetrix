import { useEffect, useState } from 'react'

const useLocalStorage = (key: string) => {
  const [state, setState] = useState(null)

  useEffect(() => {
    const localState = localStorage.getItem(key)

    if (localState) {
      setState(JSON.parse(localState))
    }
  }, [key])

  const setWithLocalStorage = (nextState: any) => {
    setState(nextState)
  }

  return [state, setWithLocalStorage]
}

export default useLocalStorage
