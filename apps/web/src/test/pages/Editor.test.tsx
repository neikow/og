import type { OGVariableType } from '@og/shared'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { assetsApi, fontsApi, previewApi, templatesApi } from '../../lib/api'
import { Editor } from '../../pages/Editor'
import { renderWithProviders } from '../setup'

vi.mock('../../lib/api', () => ({
  templatesApi: {
    get: vi.fn(),
    update: vi.fn(),
  },
  fontsApi: {
    list: vi.fn(),
  },
  previewApi: {
    render: vi.fn(),
    debug: vi.fn(),
  },
  assetsApi: {
    list: vi.fn(),
  },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock clipboard
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
})

const mockTemplate = {
  id: 'tpl-1',
  name: 'My Template',
  code: 'export default () => <div>Hello</div>',
  variableSchema: [{ name: 'title', type: 'string' as OGVariableType, required: true, default: 'Hello' }],
  cssConfig: '',
  tags: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  fonts: [],
}

function renderEditor(id = 'tpl-1') {
  return renderWithProviders(
    <MemoryRouter initialEntries={[`/templates/${id}`]}>
      <Routes>
        <Route path="/templates/:id" element={<Editor />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('editor page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fontsApi.list).mockResolvedValue([])
    vi.mocked(assetsApi.list).mockResolvedValue([])
    vi.mocked(previewApi.render).mockResolvedValue('blob:mock')
    vi.mocked(previewApi.debug).mockResolvedValue('blob:debug')
  })

  it('shows loading state before template is loaded', () => {
    vi.mocked(templatesApi.get).mockReturnValue(new Promise(() => {}))
    renderEditor()
    expect(screen.getByText('Loading editor…')).toBeInTheDocument()
  })

  it('renders the editor UI after loading template', async () => {
    vi.mocked(templatesApi.get).mockResolvedValue(mockTemplate)
    renderEditor()
    await waitFor(() => expect(screen.getByTestId('back-btn')).toBeInTheDocument())
    expect(screen.getByText('My Template')).toBeInTheDocument()
    expect(screen.getByTestId('save-btn')).toBeInTheDocument()
    expect(screen.getByTestId('copy-url-btn')).toBeInTheDocument()
  })

  it('navigates back to dashboard when Back is clicked', async () => {
    vi.mocked(templatesApi.get).mockResolvedValue(mockTemplate)
    renderEditor()
    await waitFor(() => screen.getByTestId('back-btn'))
    fireEvent.click(screen.getByTestId('back-btn'))
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
  })

  it('shows the template code in the editor', async () => {
    vi.mocked(templatesApi.get).mockResolvedValue(mockTemplate)
    renderEditor()
    await waitFor(() => screen.getByTestId('template-editor'))
    const editor = screen.getByTestId('template-editor') as HTMLTextAreaElement
    expect(editor.value).toBe(mockTemplate.code)
  })

  it('switches between Variables and Fonts bottom tabs', async () => {
    vi.mocked(templatesApi.get).mockResolvedValue(mockTemplate)
    renderEditor()
    await waitFor(() => screen.getByTestId('tab-fonts'))
    fireEvent.click(screen.getByTestId('tab-fonts'))
    // FontSelector should show (no fonts = empty state)
    expect(screen.getByTestId('font-selector-empty')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('tab-variables'))
    // VariableForm should show with the variable from schema
    expect(screen.getByTestId('variable-row-0')).toBeInTheDocument()
  })

  it('calls templatesApi.update on save', async () => {
    vi.mocked(templatesApi.get).mockResolvedValue(mockTemplate)
    vi.mocked(templatesApi.update).mockResolvedValue(mockTemplate)
    renderEditor()
    await waitFor(() => screen.getByTestId('save-btn'))
    fireEvent.click(screen.getByTestId('save-btn'))
    await waitFor(() =>
      expect(templatesApi.update).toHaveBeenCalledWith('tpl-1', expect.objectContaining({ code: mockTemplate.code })),
    )
  })

  it('shows saving state while save is in progress', async () => {
    vi.mocked(templatesApi.get).mockResolvedValue(mockTemplate)
    vi.mocked(templatesApi.update).mockReturnValue(new Promise(() => {}))
    renderEditor()
    await waitFor(() => screen.getByTestId('save-btn'))
    fireEvent.click(screen.getByTestId('save-btn'))
    await waitFor(() => expect(screen.getByTestId('save-btn')).toHaveTextContent('Saving…'))
  })

  it('copies API URL to clipboard', async () => {
    vi.mocked(templatesApi.get).mockResolvedValue(mockTemplate)
    renderEditor()
    await waitFor(() => screen.getByTestId('copy-url-btn'))
    fireEvent.click(screen.getByTestId('copy-url-btn'))
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled())
  })

  it('displays the API URL in the url bar', async () => {
    vi.mocked(templatesApi.get).mockResolvedValue(mockTemplate)
    renderEditor()
    await waitFor(() => screen.getByTestId('api-url-display'))
    expect(screen.getByTestId('api-url-display')).toHaveTextContent('/og/tpl-1')
  })

  it('shows template name as clickable span', async () => {
    vi.mocked(templatesApi.get).mockResolvedValue(mockTemplate)
    renderEditor()
    await waitFor(() => screen.getByTestId('template-name'))
    expect(screen.getByTestId('template-name')).toHaveTextContent('My Template')
  })

  it('switches to rename input when template name is clicked', async () => {
    vi.mocked(templatesApi.get).mockResolvedValue(mockTemplate)
    renderEditor()
    await waitFor(() => screen.getByTestId('template-name'))
    fireEvent.click(screen.getByTestId('template-name'))
    expect(screen.getByTestId('rename-input')).toBeInTheDocument()
    expect((screen.getByTestId('rename-input') as HTMLInputElement).value).toBe('My Template')
  })

  it('commits rename on Enter and calls templatesApi.update', async () => {
    vi.mocked(templatesApi.get).mockResolvedValue(mockTemplate)
    vi.mocked(templatesApi.update).mockResolvedValue({ ...mockTemplate, name: 'New Name' })
    renderEditor()
    await waitFor(() => screen.getByTestId('template-name'))
    fireEvent.click(screen.getByTestId('template-name'))
    const input = screen.getByTestId('rename-input')
    fireEvent.change(input, { target: { value: 'New Name' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() =>
      expect(templatesApi.update).toHaveBeenCalledWith('tpl-1', expect.objectContaining({ name: 'New Name' })),
    )
    await waitFor(() => expect(screen.getByTestId('template-name')).toHaveTextContent('New Name'))
  })

  it('commits rename on blur', async () => {
    vi.mocked(templatesApi.get).mockResolvedValue(mockTemplate)
    vi.mocked(templatesApi.update).mockResolvedValue({ ...mockTemplate, name: 'Blurred Name' })
    renderEditor()
    await waitFor(() => screen.getByTestId('template-name'))
    fireEvent.click(screen.getByTestId('template-name'))
    const input = screen.getByTestId('rename-input')
    fireEvent.change(input, { target: { value: 'Blurred Name' } })
    fireEvent.blur(input)
    await waitFor(() =>
      expect(templatesApi.update).toHaveBeenCalledWith('tpl-1', expect.objectContaining({ name: 'Blurred Name' })),
    )
  })

  it('cancels rename on Escape without calling update', async () => {
    vi.mocked(templatesApi.get).mockResolvedValue(mockTemplate)
    renderEditor()
    await waitFor(() => screen.getByTestId('template-name'))
    fireEvent.click(screen.getByTestId('template-name'))
    const input = screen.getByTestId('rename-input')
    fireEvent.change(input, { target: { value: 'Discarded' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    await waitFor(() => expect(screen.getByTestId('template-name')).toBeInTheDocument())
    expect(templatesApi.update).not.toHaveBeenCalledWith('tpl-1', expect.objectContaining({ name: 'Discarded' }))
  })
})
