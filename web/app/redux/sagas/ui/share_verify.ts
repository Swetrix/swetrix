import { call } from 'redux-saga/effects'
const { verifyShare } = require('api')

export default function* shareVerify({
  payload: { data, successfulCallback, errorCallback },
}: {
  payload: {
    data: {
      path: string
      id: string
    }
    successfulCallback: () => void
    errorCallback: (error: any) => void
  }
}) {
  try {
    yield call(verifyShare, data)
    successfulCallback()
  } catch (reason) {
    errorCallback(reason)
  }
}
