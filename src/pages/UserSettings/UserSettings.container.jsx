/* eslint-disable no-param-reassign */
import React, { memo } from 'react'
import { useHistory } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import _isNull from 'lodash/isNull'

import {
  CONFIRMATION_TIMEOUT, GDPR_REQUEST, GDPR_EXPORT_TIMEFRAME,
} from 'redux/constants'
import { withAuthentication, auth } from 'hoc/protected'
import { authActions } from 'redux/actions/auth'
import { errorsActions } from 'redux/actions/errors'
import { alertsActions } from 'redux/actions/alerts'
import UIActions from 'redux/actions/ui'
import { getCookie, setCookie } from 'utils/cookie'
import { trackCustom } from 'utils/analytics'
import {
  confirmEmail, exportUserData, generateApiKey, deleteApiKey,
} from 'api'
import routes from 'routes'
import UserSettings from './UserSettings'

dayjs.extend(utc)

const UserSettingsContainer = () => {
  const { t, i18n: { language } } = useTranslation('common')
  const dispatch = useDispatch()
  const history = useHistory()

  const onDelete = () => {
    dispatch(
      authActions.deleteAccountAsync(
        (error) => dispatch(
          errorsActions.deleteAccountFailed(error),
        ),
        () => {
          trackCustom('ACCOUNT_DELETED')
          history.push(routes.main)
        },
        t,
      ),
    )
  }

  const onExport = async (exportedAt) => {
    try {
      if (getCookie(GDPR_REQUEST) || (!_isNull(exportedAt) && !dayjs().isAfter(dayjs.utc(exportedAt).add(GDPR_EXPORT_TIMEFRAME, 'day'), 'day'))) {
        dispatch(errorsActions.GDPRExportFailed(t('profileSettings.tryAgainInXDays', { amount: GDPR_EXPORT_TIMEFRAME })))
        return
      }
      await exportUserData()

      trackCustom('GDPR_EXPORT')
      dispatch(alertsActions.accountUpdated(t('profileSettings.reportSent')))
      setCookie(GDPR_REQUEST, true, 1209600) // setting cookie for 14 days
    } catch (e) {
      dispatch(errorsActions.updateProfileFailed(e))
    }
  }

  const updateUserData = (data) => {
    dispatch(authActions.updateUserData(data))
  }

  const onDeleteProjectCache = () => {
    dispatch(UIActions.deleteProjectCache())
  }

  const login = (user) => {
    dispatch(authActions.loginSuccess(user))
  }

  const onSubmit = (data) => {
    delete data.repeat
    // eslint-disable-next-line no-restricted-syntax
    for (const key in data) {
      if (data[key] === '') {
        delete data[key]
      }
    }

    dispatch(
      authActions.updateUserProfileAsync(
        data,
        () => dispatch(
          alertsActions.accountUpdated(t('profileSettings.updated')),
        ),
      ),
    )
  }

  const onEmailConfirm = async (errorCallback) => {
    if (getCookie(CONFIRMATION_TIMEOUT)) {
      dispatch(errorsActions.updateProfileFailed(t('profileSettings.confTimeout')))
      return
    }

    try {
      const res = await confirmEmail()

      if (res) {
        setCookie(CONFIRMATION_TIMEOUT, true, 600)
        dispatch(alertsActions.accountUpdated(t('profileSettings.confSent')))
      } else {
        errorCallback(t('profileSettings.noConfLeft'))
      }
    } catch (e) {
      dispatch(errorsActions.updateProfileFailed(e))
    }
  }

  const userSharedUpdate = (message) => {
    dispatch(alertsActions.userSharedUpdate(message))
  }

  const sharedProjectError = (message) => {
    dispatch(errorsActions.sharedProjectFailed(message))
  }

  const genericError = (message) => {
    dispatch(errorsActions.genericError(message))
  }

  const removeProject = (projectId) => {
    dispatch(UIActions.removeProject(projectId, true))
  }

  const removeShareProject = (id) => {
    dispatch(authActions.deleteShareProject(id))
  }

  const setProjectsShareData = (data, id) => {
    dispatch(UIActions.setProjectsShareData(data, id, true))
  }

  const setUserShareData = (data, id) => {
    dispatch(authActions.setUserShareData(data, id))
  }

  const onApiKeyGenerate = async () => {
    try {
      const res = await generateApiKey()
      console.log(res)
      dispatch(authActions.setApiKey(res.apiKey))
    } catch (e) {
      dispatch(errorsActions.updateProfileFailed(e))
    }
  }

  const onApiKeyDelete = async () => {
    try {
      const res = await deleteApiKey()
      console.log(res)
      dispatch(authActions.setApiKey(null))
    } catch (e) {
      dispatch(errorsActions.updateProfileFailed(e))
    }
  }

  return (
    <UserSettings
      t={t}
      language={language}
      onDelete={onDelete}
      onExport={onExport}
      removeProject={removeProject}
      removeShareProject={removeShareProject}
      setProjectsShareData={setProjectsShareData}
      setUserShareData={setUserShareData}
      onSubmit={onSubmit}
      userSharedUpdate={userSharedUpdate}
      sharedProjectError={sharedProjectError}
      onEmailConfirm={onEmailConfirm}
      onDeleteProjectCache={onDeleteProjectCache}
      updateUserData={updateUserData}
      login={login}
      genericError={genericError}
      onApiKeyDelete={onApiKeyDelete}
      onApiKeyGenerate={onApiKeyGenerate}
    />
  )
}

export default memo(withAuthentication(UserSettingsContainer, auth.authenticated))
