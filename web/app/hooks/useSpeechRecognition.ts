import { useCallback, useEffect, useRef, useState } from 'react'

type SpeechRecognitionResultLike = {
  isFinal: boolean
  0: { transcript: string }
}

type SpeechRecognitionEventLike = {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike>
}

type SpeechRecognitionErrorEventLike = {
  error: string
  message?: string
}

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

const getSpeechRecognition = (): SpeechRecognitionConstructor | null => {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

interface UseSpeechRecognitionResult {
  isListening: boolean
  transcript: string
  interimTranscript: string
  start: () => void
  stop: () => void
  isSupported: boolean
  error: string | null
}

const useSpeechRecognition = (): UseSpeechRecognitionResult => {
  const [isSupported, setIsSupported] = useState<boolean>(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const finalTranscriptRef = useRef('')

  useEffect(() => {
    const Ctor = getSpeechRecognition()
    if (!Ctor) return
    setIsSupported(true)

    const recognition = new Ctor()
    recognition.lang =
      (typeof navigator !== 'undefined' && navigator.language) || 'en-US'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onstart = () => {
      setIsListening(true)
      setError(null)
    }

    recognition.onresult = (event) => {
      let interim = ''
      let finalChunk = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0].transcript
        if (result.isFinal) {
          finalChunk += text
        } else {
          interim += text
        }
      }

      if (finalChunk) {
        finalTranscriptRef.current += finalChunk
      }

      setInterimTranscript(interim)
      setTranscript(`${finalTranscriptRef.current}${interim}`)
    }

    recognition.onerror = (event) => {
      setError(event.error || 'speech-recognition-error')
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
      setInterimTranscript('')
    }

    recognitionRef.current = recognition

    return () => {
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      recognition.onstart = null
      try {
        recognition.abort()
      } catch {
        // no-op
      }
      recognitionRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition) return

    finalTranscriptRef.current = ''
    setTranscript('')
    setInterimTranscript('')
    setError(null)

    try {
      recognition.start()
    } catch (err) {
      setError((err as Error)?.message || 'failed-to-start')
    }
  }, [])

  const stop = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition) return
    try {
      recognition.stop()
    } catch {
      // no-op
    }
  }, [])

  return {
    isListening,
    transcript,
    interimTranscript,
    start,
    stop,
    isSupported,
    error,
  }
}

export default useSpeechRecognition
