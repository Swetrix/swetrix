import React from 'react'
import Card from 'react-bootstrap/Card'

const Locale = () => {
  return (
    <Card style={{ height: '300px' }} className="w31-5 m-3 shadow-sm">
      <Card.Body>
        <Card.Title>Locale</Card.Title>
        <Card.Text>Test locale blahblah</Card.Text>
      </Card.Body>
    </Card>
  )
}

const LocaleMemo = React.memo(Locale)

export {
  LocaleMemo as Locale,
}