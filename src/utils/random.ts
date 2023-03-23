import { customAlphabet } from 'nanoid'

const legalCharacters = '1234567890QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm'

export const nanoid = customAlphabet(legalCharacters, 12)
