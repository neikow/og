// ─── Types ────────────────────────────────────────────────────────────────────

import type { ReactNode } from 'react'
import type { Toast, ToastVariant } from './toastContext'
import { useCallback, useReducer } from 'react'
import { ToastList } from '../components/ui/Toast'
import { ToastContext } from './toastContext'

// ─── Reducer ─────────────────────────────────────────────────────────────────

type Action
  = | { type: 'ADD', toast: Toast }
    | { type: 'REMOVE', id: string }

function reducer(state: Toast[], action: Action): Toast[] {
  switch (action.type) {
    case 'ADD':
      // Keep at most 5 toasts
      return [...state.slice(-4), action.toast]
    case 'REMOVE':
      return state.filter(t => t.id !== action.id)
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(reducer, [])

  const toast = useCallback((message: string, variant: ToastVariant = 'success') => {
    const id = Math.random().toString(36).slice(2)
    dispatch({ type: 'ADD', toast: { id, message, variant } })
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastList toasts={toasts} onDismiss={id => dispatch({ type: 'REMOVE', id })} />
    </ToastContext.Provider>
  )
}
