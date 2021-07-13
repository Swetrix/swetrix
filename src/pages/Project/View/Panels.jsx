import React, { memo, Fragment } from 'react'
import Card from 'react-bootstrap/Card'
import ProgressBar from 'react-bootstrap/ProgressBar'
import _size from 'lodash/size'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _reduce from 'lodash/reduce'
import _round from 'lodash/round'

const Locale = () => {
  return (
    <Card style={{ height: '300px' }} className='w31-5 m-3 shadow-sm'>
      <Card.Body>
        <Card.Title>Locale</Card.Title>
        <Card.Text>Test locale blahblah</Card.Text>
      </Card.Body>
    </Card>
  )
}

const Panel = ({ name, data }) => {
  const keys = _keys(data)
  const total = _reduce(keys, (prev, curr) => prev + data[curr], 0)
  console.log(data)

  return (
    <Card style={{ height: '300px' }} className='w31-5 m-3 shadow-sm'>
      <Card.Body>
        <Card.Title>{name}</Card.Title>
        <Card.Text>{_map(keys, key => {
          const perc = _round(data[key] / total * 100, 2)

          return (
            <Fragment key={key}>
              <div className='d-flex justify-content-between'>
                {key}
                <span className='text-secondary'>({perc}%)</span>
              </div>
              <ProgressBar now={perc} />
            </Fragment>
          )
        })}</Card.Text>
      </Card.Body>
    </Card>
  )
}

const LocaleMemo = memo(Locale)
const PanelMemo = memo(Panel)

export {
  LocaleMemo as Locale,
  PanelMemo as Panel,
}