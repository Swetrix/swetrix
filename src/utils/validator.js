export const isValidEmail = text => text.match(/^\w+([.+-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,7})+$/)

export const isValidPassword = text => text.length >= 8
