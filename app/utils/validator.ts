export const MIN_PASSWORD_CHARS = 8
export const MAX_PASSWORD_CHARS = 50

export const isValidEmail = (text: string) => text.match(/^\w+([.+-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,7})+$/)

export const isValidPassword = (text: string) => text.length >= MIN_PASSWORD_CHARS
