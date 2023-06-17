/* eslint-disable implicit-arrow-linebreak */
import axios from 'axios'
import Debug from 'debug'
import _isEmpty from 'lodash/isEmpty'
import { AIAPI_URL } from 'redux/constants'

const debug = Debug('swetrix:ai')

const api = axios.create({
  baseURL: AIAPI_URL,
})

/**
 * Returns the prediction for the given data.
 *
 * @param {*} chart The chart data, i.e. the `chart` key here -> https://docs.swetrix.com/statistics-api#get-v1log
 * @param {*} periodToForecast How many new entries should be added to the chart data array.
 * @param {*} frequency The frequency of the chart data, e.g. h | w | m
 * @returns The prediction for the given data.
 */
export const getChartPrediction = (chart: any, periodToForecast: any, frequency: any) =>
  api
    .post('/', {
      ...chart,
      period_to_forecast: periodToForecast,
      frequency,
    })
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })
