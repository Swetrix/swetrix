((sdk) => {
  function main(sdk) {
    console.log('Main function called!\n', sdk)
  }
  
  main(sdk)

  sdk.addExportDataRow('As blahblahblah', () => {
    console.log('blahblahblah')
  })

  sdk.addExportDataRow('As test', () => {
    console.log('test')
  })

  sdk.addPanelTab('test-extension', 'pg', () => {})
})
