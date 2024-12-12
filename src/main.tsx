import React from 'react'
import ReactDOM from 'react-dom'

// Expose React globally
window.React = React
window.ReactDOM = ReactDOM

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App debug={true} />
    </StrictMode>,
)
