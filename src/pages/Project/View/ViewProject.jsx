import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

import ProjectSettings from 'pages/Project/Create'
import { Locale } from './Panels' 

const data = [
  {
    name: 'Page A',
    uv: 4000,
    pv: 2400,
    amt: 2400,
  },
  {
    name: 'Page B',
    uv: 3000,
    pv: 1398,
    amt: 2210,
  },
  {
    name: 'Page C',
    uv: 2000,
    pv: 9800,
    amt: 2290,
  },
  {
    name: 'Page D',
    uv: 2780,
    pv: 3908,
    amt: 2000,
  },
  {
    name: 'Page E',
    uv: 1890,
    pv: 4800,
    amt: 2181,
  },
  {
    name: 'Page F',
    uv: 2390,
    pv: 3800,
    amt: 2500,
  },
  {
    name: 'Page G',
    uv: 3490,
    pv: 4300,
    amt: 2100,
  },
]

const ViewProject = (props) => {
  const { name } = props
  const [settings, setSettings] = useState(false)

  if (settings) {
    return (
      <ProjectSettings
        onCancel={() => setSettings(false)}
        project={props}
        />
    )
  }

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between">
        <h2>{name}</h2>
        <button
          onClick={() => setSettings(true)}
          className="btn btn-outline-primary h-100">
          Settings
        </button>
      </div>
      <ResponsiveContainer width="100%" minHeight="300px">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="pv" stroke="#8884d8" activeDot={{ r: 8 }} />
          <Line type="monotone" dataKey="uv" stroke="#82ca9d" />
        </LineChart>
      </ResponsiveContainer>
      <div className="d-flex flex-wrap">
        <Locale />
        <Locale />
        <Locale />
        <Locale />
        <Locale />
        <Locale />
        <Locale />
      </div>
    </div>
  )
}

ViewProject.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
}

export default ViewProject