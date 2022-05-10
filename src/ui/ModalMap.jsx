import React, { Fragment, memo } from 'react'
import PropTypes from 'prop-types'
import { Dialog, Transition } from '@headlessui/react'

const Modal = ({
   isOpened, onClose, closeText, children
}) => {
  return (
    <Transition.Root show={isOpened} as={Fragment}>
      <Dialog as='div' className={'fixed z-10 inset-0 overflow-y-auto'} open={isOpened} onClose={onClose} static>
        <div className='flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0'>
          <Transition.Child
            as={Fragment}
            enter='ease-out duration-300'
            enterFrom='opacity-0'
            enterTo='opacity-100'
            leave='ease-in duration-200'
            leaveFrom='opacity-100'
            leaveTo='opacity-0'
          >
            <Dialog.Overlay className='fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-opacity-55 transition-opacity' />
          </Transition.Child>
          <span className='hidden sm:inline-block sm:align-middle sm:h-screen' aria-hidden='true'>
            &#8203;
          </span>
          <Transition.Child
            as={Fragment}
            enter='ease-out duration-300'
            enterFrom='opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95'
            enterTo='opacity-100 translate-y-0 sm:scale-100'
            leave='ease-in duration-200'
            leaveFrom='opacity-100 translate-y-0 sm:scale-100'
            leaveTo='opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95'
          >
            <div className='inline-block align-bottom bg-white dark:bg-gray-750 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full p-20 sm:px-5 sm:py-4'>
              <div className='sm:flex sm:items-start'>
                { children }
              </div>
              <div className='px-4 py-3 sm:px-0 sm:pb-0 sm:flex sm:flex-row-reverse'>
                {closeText && (
                  <button
                    type='button'
                    className={'w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm bg-indigo-600 hover:bg-indigo-700'}
                    onClick={onClose}
                  >
                    {closeText}
                  </button>
                )}
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  )
}

Modal.propTypes = {
  onClose: PropTypes.func.isRequired,
  isOpened: PropTypes.bool,
  closeText: PropTypes.string,
}

Modal.defaultProps = {
  isOpened: false,
  onClose: () => { },
  closeText: null,
}

export default memo(Modal)
