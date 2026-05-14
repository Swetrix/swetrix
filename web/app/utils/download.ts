export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export const downloadText = (
  text: string,
  filename: string,
  type = 'text/plain;charset=utf-8',
) => {
  downloadBlob(new Blob([text], { type }), filename)
}
