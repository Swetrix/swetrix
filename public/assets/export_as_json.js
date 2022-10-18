(async (sdk) => {
  let data = {}
  let pid = null

  sdk.addExportDataRow('As JSON', () => {
    const _data = {
      ...data,
      exportDate: new Date().toString(),
      exportDateISO: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(_data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    // swetrix-YYYY-MM-DDTHH-mm-ss.json
    a.download = `swetrix-export-${new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '')}.json`
    a.click()
  })

  sdk.addEventListener('projectinfo', ({ id }) => {
    pid = id
  })

  sdk.addEventListener('load', ({ period, timeBucket, from, to, params, filters, customs }) => {
    data = {
      period,
      timeBucket,
      from,
      to,
      data: params,
      filters,
      customs,
    }
  })
})
