export const isValidHttpUrl = (value: string) => {
  try {
    const url = new URL(value.trim())
    return ['http:', 'https:'].includes(url.protocol)
  } catch {
    return false
  }
}
