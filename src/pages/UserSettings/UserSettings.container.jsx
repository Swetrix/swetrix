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
import { confirmEmail, exportUserData } from 'api'
import routes from 'routes'
import UserSettings from './UserSettings'

dayjs.extend(utc)

const UserSettingsContainer = () => {
  const { t } = useTranslation('common')
  const dispatch = useDispatch()
  const history = useHistory()

  const onDelete = () => {
    dispatch(
      authActions.deleteAccountAsync(
        (error) => dispatch(
          errorsActions.deleteAccountFailed(error),
        ),
        () => history.push(routes.main),
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

      dispatch(alertsActions.accountUpdated(t('profileSettings.reportSent')))
      setCookie(GDPR_REQUEST, true, 1209600) // setting cookie for 14 days
    } catch (e) {
      dispatch(errorsActions.updateProfileFailed(e))
    }
  }

  const onDeleteProjectCache = () => {
    dispatch(UIActions.deleteProjectCache())
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

  const deleteProjectFailed = (message) => {
    dispatch(errorsActions.deleteProjectFailed(message))
  }

  const removeProject = (projectId) => {
    dispatch(UIActions.removeProject(projectId))
  }

  const removeShareProject = (id) => {
    dispatch(authActions.deleteShareProject(id))
  }

  const setProjectsShareData = (data, id) => {
    dispatch(UIActions.setProjectsShareData(data, id))
  }
  const setUserShareData = (data, id) => {
    dispatch(authActions.setUserShareData(data, id))
  }

  return (
    <UserSettings
      t={t}
      onDelete={onDelete}
      onExport={onExport}
      removeProject={removeProject}
      removeShareProject={removeShareProject}
      setProjectsShareData={setProjectsShareData}
      setUserShareData={setUserShareData}
      onSubmit={onSubmit}
      deleteProjectFailed={deleteProjectFailed}
      onEmailConfirm={onEmailConfirm}
      onDeleteProjectCache={onDeleteProjectCache}
    />
  )
}

export default memo(withAuthentication(UserSettingsContainer, auth.authenticated))
