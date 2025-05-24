import { CONTACT_EMAIL } from '~/lib/constants'

const Imprint = () => {
  return (
    <div className='min-h-min-footer bg-gray-50 dark:bg-slate-900'>
      <div className='mx-auto w-11/12 px-4 pt-12 pb-16 sm:px-6 md:w-4/5 lg:px-8'>
        <h1 className='text-4xl font-bold text-gray-900 dark:text-gray-50'>Imprint</h1>
        <p className='mt-4 text-lg text-gray-900 dark:text-gray-50'>
          Swetrix Ltd
          <br />
          International House, 38 Thistle Street, Edinburgh, United Kingdom, EH2 1EN
          <br />
          Company number SC797389
          <br />
          <br />
          Represented by Andrii Romasiun
          <br />
          Email: {CONTACT_EMAIL}
        </p>
      </div>
    </div>
  )
}

export default Imprint
