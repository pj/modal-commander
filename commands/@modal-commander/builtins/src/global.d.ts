import type React from 'react'

declare global {
  interface Window {
    ModalCommanderContext: React.Context<any>
  }
} 