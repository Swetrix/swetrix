import React from 'react'
import _replace from 'lodash/replace'
import { UsersIcon } from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import _isEmpty from 'lodash/isEmpty'
import routes from 'utils/routes'
import { CDN_URL } from 'redux/constants'

interface ExtensionsCardProps {
  name: string
  stars: number
  downloads: number
  mainImage?: string
  price: number
  companyLink?: string
  companyName: string
  id: string
}

const ExtensionsCard: React.FC<ExtensionsCardProps> = ({ 
  name, 
  stars, 
  downloads, 
  mainImage, 
  price, 
  companyLink, 
  companyName, 
  id,
}) => {
  const navigate = useNavigate()

  const subStr = (string: string, len: number): string => {
    if (string.length > len) {
      return `${string.substring(0, len)}...`
    }
    return string
  }

  const openExtension = (): void => {
    navigate(_replace(routes.view_extensions, ':id', id))
  }

  return (
    <div
      className='group max-w-[210px] relative border-2 border-white rounded-lg p-3 bg-gray-100 dark:bg-slate-900 dark:border-gray-900 cursor-pointer'
      onClick={openExtension}
    >
      <div className='h-28 w-28 mx-auto aspect-w-1 aspect-h-1 rounded-md overflow-hidden group-hover:opacity-75 lg:aspect-none'>
        <img
          src={
            mainImage
              ? `${CDN_URL}file/${mainImage}`
              : `https://via.placeholder.com/150?text=${name}`
          }
          alt={companyName}
          className='w-full h-full object-center object-cover lg:w-full lg:h-full'
        />
      </div>
      <div className='mt-4'>
        <h3 className='text-center text-lg font-semibold leading-5 text-gray-700 dark:text-gray-300'>
          <p>{subStr(name, 15)}</p>
        </h3>
        <div className='flex items-center justify-between mt-2'>
          <div className='flex flex-col'>
            <p className='dark:text-gray-400 text-gray-500 text-sm leading-[10px]'>{subStr(companyName, 10)}</p>
            {(companyLink && !_isEmpty(companyLink)) && (
              <a
                href={companyLink}
                className='dark:text-indigo-400 cursor-pointer text-indigo-500 font-semibold border-0 text-sm'
              >
                {subStr(companyLink, 10)}
              </a>
            )}
          </div>
          <div className='flex items-center'>
            <UsersIcon className='h-5 w-5 text-gray-400' aria-hidden='true' />
            <p className='pl-1 text-gray-400'>{downloads}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExtensionsCard
