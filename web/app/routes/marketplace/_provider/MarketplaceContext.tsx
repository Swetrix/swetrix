import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { ICategory, IComment, IExtension } from 'redux/models/IMarketplace'
import { useSelector } from 'react-redux'
import { StateType } from 'redux/store'
import { getInstallExtensions, getExtensions, getPublishExtensions, getCategories, getComments } from 'api/marketplace'

type MarketplaceContextType = {
  extensions: { extensions: IExtension[]; count: number }
  publishExtensions: IExtension[]
  installExtensions: IExtension[]
  comments: { comments: IComment[]; count: number }
  isLoading: boolean
  isLoadingPublish: boolean
  isLoadingInstall: boolean
  isLoadingComments: boolean
  publishTotal: number
  installTotal: number
  category: ICategory[]
  // dashboardPaginationPage: 1,
  // dashboardPaginationPagePublish: 1,
  // dashboardTabs: getItem('dashboardTabs') || tabForInstallExtension,
  loadExtensions: (limit?: number, offset?: number) => void
  loadPublishExtensions: (limit?: number, offset?: number) => void
  loadInstallExtensions: (limit?: number, offset?: number) => void
  loadComments: (extensionId: string, limit?: number, offset?: number) => void
}

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined)

export const MarketplaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { authenticated } = useSelector((state: StateType) => state.auth)

  const [extensions, setExtensions] = useState({ extensions: [], count: 0 })
  const [publishExtensions, setPublishExtensions] = useState([])
  const [installExtensions, setInstallExtensions] = useState([])
  const [comments, setComments] = useState({ comments: [], count: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingPublish, setIsLoadingPublish] = useState(true)
  const [isLoadingInstall, setIsLoadingInstall] = useState(true)
  const [isLoadingComments, setIsLoadingComments] = useState(true)
  const [publishTotal, setPublishTotal] = useState(0)
  const [installTotal, setInstallTotal] = useState(0)
  const [category, setCategory] = useState([])

  const loadExtensions = (limit = 10, offset = 0) => {
    setIsLoading(true)

    getExtensions(limit, offset).then(({ extensions, count }) => {
      setExtensions({ extensions, count })
      setIsLoading(false)
    }).catch(() => {
      console.log('failed to load extensions')
    }).finally(() => {
      setIsLoading(false)
    })
  }

  const loadPublishExtensions = (limit = 10, offset = 0) => {
    if (!authenticated) {
      return
    }

    setIsLoadingPublish(true)

    getPublishExtensions(limit, offset).then(({ extensions, count }) => {
      setPublishExtensions(extensions)
      setPublishTotal(count)
      setIsLoadingPublish(false)
    }).catch(() => {
      console.log('failed to load publish extensions')
    }).finally(() => {
      setIsLoadingPublish(false)
    })
  }

  const loadInstallExtensions = (limit = 10, offset = 0) => {
    if (!authenticated) {
      return
    }

    setIsLoadingInstall(true)

    getInstallExtensions(limit, offset).then(({ extensions, count }) => {
      setInstallExtensions(extensions)
      setInstallTotal(count)
      setIsLoadingInstall(false)
    }).catch(() => {
      console.log('failed to load install extensions')
    }).finally(() => {
      setIsLoadingInstall(false)
    })
  }

  const loadComments = (extensionId: string, limit = 10, offset = 0) => {
    setIsLoadingComments(true)

    getComments(extensionId, limit, offset).then(({ comments, count }) => {
      setComments({ comments, count })
      setIsLoadingComments(false)
    }).catch(() => {
      console.log('failed to load comments')
    }).finally(() => {
      setIsLoadingComments(false)
    })
  }

  const loadCategories = () => {
    getCategories().then(({ categories }) => {
      setCategory(categories)
    }).catch(() => {
      console.log('failed to load categories')
    })
  }

  useEffect(() => {
    loadExtensions()
    loadPublishExtensions()
    loadInstallExtensions()
    loadCategories()
  }, [])


  return (
    <MarketplaceContext.Provider
      value={{
        extensions,
        publishExtensions,
        installExtensions,
        comments,
        isLoading,
        isLoadingPublish,
        isLoadingInstall,
        isLoadingComments,
        publishTotal,
        installTotal,
        category,
        loadExtensions,
        loadPublishExtensions,
        loadInstallExtensions,
        loadComments,
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  )
}

export const useMarketplace = () => {
  const context = useContext(MarketplaceContext)

  if (!context) {
    throw new Error('useMarketplace must be used within a MarketplaceProvider')
  }

  return context
}
