(async (sdk) => {
  console.log('test_extension.js', sdk)
  console.log('--------------------')

  sdk.addExportDataRow('As blahblahblah', () => {
    console.log('blahblahblah')
  })

  sdk.addExportDataRow('As test', () => {
    console.log('test')
  })

  sdk.addPanelTab('pg', 'test', () => {})

  // sdk.addEventListener('timeupdate', (data) => {
  //   console.log('timeupdate', data)
  // })

  // sdk.addEventListener('filtersupdate', (data) => {
  //   console.log('filtersupdate', data)
  // })

  // sdk.addEventListener('load', (data) => {
  //   console.log('load', data)
  // })
})
