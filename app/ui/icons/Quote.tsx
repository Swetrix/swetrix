import React from 'react'
import cx from 'clsx'

const Quote = ({
  theme,
  className,
  color,
}: {
  theme: 'light' | 'dark'
  className?: string
  color: 'black' | 'indigo'
}): JSX.Element => (
  <svg
    className={cx(className, {
      'fill-[#232536]': color === 'black' && theme === 'light',
      'fill-sky-600': color === 'black' && theme === 'dark',
      'fill-indigo-600': color === 'indigo',
    })}
    width='42'
    height='30'
    viewBox='0 0 42 30'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
  >
    <path d='M12.8109 25.4137C12.0514 28.1254 9.57958 30 6.7635 30C2.1934 30 -0.846327 25.2742 1.04887 21.1156L9.41318 2.76185C10.1798 1.07959 11.8582 0 13.707 0C16.8317 0 19.0935 2.98233 18.2507 5.99128L12.8109 25.4137ZM35.8821 25.4137C35.1226 28.1254 32.6508 30 29.8347 30C25.2646 30 22.2249 25.2742 24.1201 21.1156L32.4844 2.76185C33.251 1.07959 34.9295 0 36.7782 0C39.9029 0 42.1647 2.98233 41.3219 5.99128L35.8821 25.4137Z' />
  </svg>
)

export default Quote
