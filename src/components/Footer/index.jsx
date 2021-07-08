import React from 'react'
import './styles.css'
import { Link } from 'react-router-dom'

export default () => {
  return (
    <footer className={classes.footer}>
      <Link to="/test">Test</Link>
      |
      <Link to="/test">Test</Link>
      |
      <Link to="/test">Test</Link>
    </footer>
  );
}