export const MIN_PASSWORD_CHARS = 8
export const MAX_PASSWORD_CHARS = 50

export const isValidEmail = (text: string) => text.match(/^\S+@\S+\.\S+$/)

export const isValidPassword = (text: string) => text.length >= MIN_PASSWORD_CHARS
