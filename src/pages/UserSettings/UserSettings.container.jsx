import React from 'react'
import { useDispatch } from 'react-redux'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import _isNull from 'lodash/isNull'

import {
  CONFIRMATION_TIMEOUT, GDPR_REQUEST, GDPR_EXPORT_TIMEFRAME,
} from 'redux/constants'
import { authActions } from 'redux/actions/auth'
import { errorsActions } from 'redux/actions/errors'
import { alertsActions } from 'redux/actions/alerts'
import { getCookie, setCookie } from 'utils/cookie'
import { confirmEmail, exportUserData } from 'api'

import UserSettings from './UserSettings'

dayjs.extend(utc)

const UserSettingsContainer = () => {
  const dispatch = useDispatch()

  const onDelete = () => {
    dispatch(
      authActions.deleteAccountAsync(
        (error) => dispatch(
          errorsActions.deleteAccountFailed(error.description),
        )
      )
    )
  }

  const onExport = async (exportedAt) => {
    try {
      if (getCookie(GDPR_REQUEST) || (!_isNull(exportedAt) && !dayjs().isAfter(dayjs.utc(exportedAt).add(GDPR_EXPORT_TIMEFRAME, 'day'), 'day'))) {
        dispatch(errorsActions.GDPRExportFailed(`Please, try again later. You can request a GDPR Export only once per ${GDPR_EXPORT_TIMEFRAME} days.`))
        return
      }
      await exportUserData()

      dispatch(alertsActions.accountUpdated('The GDPR data report has been sent to your email address.'))
      setCookie(GDPR_REQUEST, true, 1209600) // setting cookie for 14 days
    } catch (e) {
      dispatch(errorsActions.updateProfileFailed(e))
    }
  }

  const onSubmit = (data) => {
    delete data.repeat
    for (let key in data) {
      if (data[key] === '') {
        delete data[key]
      }
    }

    dispatch(
      authActions.updateUserProfileAsync(
        data,
        () => dispatch(
          alertsActions.accountUpdated('Your account settings have been updated!')
        )
      )
    );
  }

  const onEmailConfirm = async (errorCallback) => {
    if (getCookie(CONFIRMATION_TIMEOUT)) {
      dispatch(errorsActions.updateProfileFailed('An email has already been sent, check your mailbox or try again in a few minutes'))
      return
    }

    try {
      const res = await confirmEmail()

      if (res) {
        setCookie(CONFIRMATION_TIMEOUT, true, 600)
        dispatch(alertsActions.accountUpdated('An account confirmation link has been sent to your email'))
      } else {
        errorCallback('Unfortunately, you\'ve ran out of your email confirmation requests.\nPlease make sure you are able to receive e-mails and check your SPAM folder again for messages.\nYou may try to use a different email address or contact our customer support service.')
      }
    } catch (e) {
      dispatch(errorsActions.updateProfileFailed(e))
    }
  }

  return (
    <UserSettings
      onDelete={onDelete}
      onExport={onExport}
      onSubmit={onSubmit}
      onEmailConfirm={onEmailConfirm}
    />
  )
}

export default UserSettingsContainer
