import type React from 'react'
import type ReactDOM from 'react-dom'

declare global {
  interface Window {
    React: typeof React
    ReactDOM: typeof ReactDOM
    ModalCommanderContext: React.Context<any>
  }
} 