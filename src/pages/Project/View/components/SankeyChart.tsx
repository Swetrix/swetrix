import React from 'react'
import { ResponsiveSankey } from '@nivo/sankey'
import { connect } from 'react-redux'
import { StateType, AppDispatch } from 'redux/store'
import UIActions from 'redux/reducers/ui'
import { IUserFlow } from 'redux/models/IUserFlow'

const dataTest = {
  nodes: [
    {
      id: 'John',
      nodeColor: 'hsl(127, 70%, 50%)',
    },
    {
      id: 'Raoul',
      nodeColor: 'hsl(132, 70%, 50%)',
    },
    {
      id: 'Jane',
      nodeColor: 'hsl(76, 70%, 50%)',
    },
    {
      id: 'Marcel',
      nodeColor: 'hsl(20, 70%, 50%)',
    },
    {
      id: 'Ibrahim',
      nodeColor: 'hsl(225, 70%, 50%)',
    },
    {
      id: 'Junko',
      nodeColor: 'hsl(28, 70%, 50%)',
    },
  ],
  links: [
    {
      source: 'Junko',
      target: 'John',
      value: 88,
    },
    {
      source: 'Junko',
      target: 'Raoul',
      value: 22,
    },
    {
      source: 'Junko',
      target: 'Jane',
      value: 155,
    },
    {
      source: 'Raoul',
      target: 'John',
      value: 153,
    },
    {
      source: 'Marcel',
      target: 'Ibrahim',
      value: 198,
    },
    {
      source: 'Ibrahim',
      target: 'Junko',
      value: 138,
    },
    {
      source: 'Jane',
      target: 'John',
      value: 13,
    },
    {
      source: 'Jane',
      target: 'Raoul',
      value: 200,
    },
  ],
}

const mapStateToProps = (state: StateType) => ({
  userFlowAscending: state.ui.cache.userFlowAscending,
  userFlowDescending: state.ui.cache.userFlowDescending,
})

const SankeyChart = ({
  data, disableLegend, pid, period, timeBucket, from, to, timezone, userFlowAscending, userFlowDescending,
}: {
  data?: any
  disableLegend?: boolean
  pid: string
  userFlowAscending: IUserFlow[]
  userFlowDescending: IUserFlow[]
  period: string
  timezone: string
  timeBucket: string
  from: string
  to: string
}) => (
  <ResponsiveSankey
    data={dataTest}
    margin={{
      top: 0, right: disableLegend ? 0 : 120, bottom: 0, left: 20,
    }}
    align='justify'
    colors={{ scheme: 'nivo' }}
    nodeOpacity={1}
    nodeHoverOthersOpacity={0.35}
    nodeThickness={18}
    nodeSpacing={24}
    nodeBorderWidth={0}
    nodeBorderColor={{
      from: 'color',
      modifiers: [
        [
          'darker',
          0.8,
        ],
      ],
    }}
    nodeBorderRadius={3}
    linkOpacity={0.5}
    linkHoverOthersOpacity={0.1}
    linkContract={3}
    enableLinkGradient
    labelPosition='outside'
    labelOrientation='vertical'
    labelPadding={16}
    labelTextColor={{
      from: 'color',
      modifiers: [
        [
          'darker',
          1,
        ],
      ],
    }}
    legends={!disableLegend ? [
      {
        anchor: 'bottom-right',
        direction: 'column',
        translateX: 100,
        itemWidth: 100,
        itemHeight: 14,
        itemDirection: 'right-to-left',
        itemsSpacing: 2,
        itemTextColor: '#999',
        symbolSize: 14,
        effects: [
          {
            on: 'hover',
            style: {
              itemTextColor: '#000',
            },
          },
        ],
      },
    ] : []}
  />
)

SankeyChart.defaultProps = {
  data: {},
  disableLegend: false,
}

export default SankeyChart
