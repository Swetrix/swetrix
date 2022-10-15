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

  // sdk.addEventListener('load', (data) => {
  //   console.log('sdk.addEventListener', data)

  //   for (let i = 0; i < 999999999; i++) {}
  //   console.log('end')
  // })
})
