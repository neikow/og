import type { RenderOptions } from '@testing-library/react'
import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { ToastProvider } from '../providers/toastProvider'
import '@testing-library/jest-dom'

/**
 * Render a component wrapped in all app-level providers.
 * Use this instead of the bare `render` from @testing-library/react when the
 * component under test (or any child) calls `useToast()`.
 */
export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: ToastProvider, ...options })
}

// Mock URL methods not implemented by jsdom
URL.createObjectURL = vi.fn(() => 'blob:mock')
URL.revokeObjectURL = vi.fn()

// Mock Monaco Editor in tests (it requires a browser DOM with workers)
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange, 'data-testid': testId }: {
    'value'?: string
    'onChange'?: (val: string) => void
    'data-testid'?: string
  }) => (
    <textarea
      data-testid={testId ?? 'monaco-editor'}
      value={value ?? ''}
      onChange={e => onChange?.(e.target.value)}
    />
  ),
  useMonaco: () => null,
  loader: { config: vi.fn() },
}))

// Mock monaco-editor module
vi.mock('monaco-editor', () => ({
  languages: {
    typescript: {
      typescriptDefaults: {
        setCompilerOptions: vi.fn(),
        addExtraLib: vi.fn(),
      },
      JsxEmit: { ReactJSX: 4 },
    },
  },
}))
