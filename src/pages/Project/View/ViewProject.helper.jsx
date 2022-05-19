import { saveAs } from 'file-saver'
import _forEach from 'lodash/forEach'
import _map from 'lodash/map'
import _split from 'lodash/split'
import _replace from 'lodash/replace'
import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _round from 'lodash/round'
import JSZip from 'jszip'

import countries from 'i18n-iso-countries'
import countriesEn from 'i18n-iso-countries/langs/en.json'
import countriesDe from 'i18n-iso-countries/langs/de.json'
import countriesEl from 'i18n-iso-countries/langs/el.json'
import countriesHi from 'i18n-iso-countries/langs/hi.json'
import countriesUk from 'i18n-iso-countries/langs/uk.json'
import countriesZh from 'i18n-iso-countries/langs/zh.json'
import countriesRu from 'i18n-iso-countries/langs/ru.json'
import countriesSv from 'i18n-iso-countries/langs/sv.json'

countries.registerLocale(countriesEn)
countries.registerLocale(countriesDe)
countries.registerLocale(countriesEl)
countries.registerLocale(countriesRu)
countries.registerLocale(countriesHi)
countries.registerLocale(countriesUk)
countries.registerLocale(countriesZh)
countries.registerLocale(countriesSv)

const getExportFilename = (suffix) => {
  // turn something like 2022-03-02T19:31:00.100Z into 2022-03-02
  const date = _split(_replace(_split(new Date().toISOString(), '.')[0], /:/g, '-'), 'T')[0]
  return `${suffix}-${date}.zip`
}

function ConvertToCSV(objArray) {
  const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray
  let str = 'name,value,perc\r\n'

  for (let i = 0; i < array.length; i++) {
    let line = ''

    _forEach(array[i], (index) => {
      if (line !== '') line += ','
      line += index
    })

    str += `${line}\r\n`
  }

  return str
}

const onCSVExportClick = (data, t) => {
  const typeNameMapping = {
    cc: t('project.mapping.cc'),
    pg: t('project.mapping.pg'),
    lc: t('project.mapping.lc'),
    ref: t('project.mapping.ref'),
    dv: t('project.mapping.dv'),
    br: t('project.mapping.br'),
    os: t('project.mapping.os'),
    so: 'utm_source',
    me: 'utm_medium',
    ca: 'utm_campaign',
    lt: t('project.mapping.lt'),
  }

  const zip = new JSZip()

  _forEach(data.types, (items) => {
    if (!_isEmpty(data.data[items])) {
      let total = 0

      _forEach(_keys(data.data[items]), (e) => {
        total += data.data[items][e]
      })

      const csvData = _map(_keys(data.data[items]), (e) => {
        const perc = _round(((data.data[items][e] / total) * 100) || 0, 2)

        if (items === 'cc') {
          const name = countries.getName(e, 'en')
          return [name, data.data[items][e], `${perc}%`]
        }

        return [e, data.data[items][e], `${perc}%`]
      })

      zip.file(`${typeNameMapping[items]}.csv`, ConvertToCSV(csvData))
    }
  })

  zip.generateAsync({ type: 'blob' }).then((content) => {
    saveAs(content, `${getExportFilename('panels-date')}.zip`)
  })
}

export default onCSVExportClick
