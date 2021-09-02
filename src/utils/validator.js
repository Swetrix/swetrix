import _includes from 'lodash/includes'

export const isValidEmail = text => text.match(/^\w+([.+-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,7})+$/)

export const isValidPassword = text => text.length >= 8

export const isAdmin = user => _includes(user.roles, 'admin')
