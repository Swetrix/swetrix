import React, { useEffect } from "react";
import bb from "billboard.js";
import "billboard.js/dist/theme/datalab.css"
import "billboard.js/dist/billboard.css";

const Chart = ({current, children, options}) => {
  let chartInstance = {};

  useEffect(() => {
    renderChart()

    return () => { destroy() }
  })

  const destroy = () => {
    if (chartInstance !== null) {
      try {
        chartInstance.destroy();
      } catch (error) {
        console.error("Internal billboard.js error", error);
      } finally {
        chartInstance = null;
      }
    }
  }

  const renderChart = () => {
    if (current !== null) {
      chartInstance = bb.generate({
        ...options,
        bindto: "#"+ current
      });
    }
  }

  
  return (
    <div>
      <div id={current} />
      {children}
    </div>
  );

}

export default Chart
