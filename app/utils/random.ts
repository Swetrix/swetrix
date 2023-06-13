const legalCharacters = '1234567890QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm'

const loadNanoid = async () => {
  const nanoidModule = await import('nanoid')
  const nanoid = nanoidModule.customAlphabet(legalCharacters, 12)

  return nanoid
}

export const nanoid = loadNanoid()
