import { fireEvent, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { auth, templatesApi } from '../../lib/api'
import { renderWithProviders } from '../setup'

import { Dashboard } from '../../pages/Dashboard'

vi.mock('../../lib/api', () => ({
  templatesApi: {
    list: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  auth: {
    logout: vi.fn(),
  },
}))

// Mock child manager components so we don't need their full API mocks here
vi.mock('../../components/api-keys/ApiKeyManager', () => ({
  ApiKeyManager: () => <div data-testid="api-key-manager" />,
}))

vi.mock('../../components/fonts/FontManager', () => ({
  FontManager: () => <div data-testid="font-manager" />,
}))

vi.mock('../../components/assets/GalleryManager', () => ({
  GalleryManager: () => <div data-testid="gallery-manager" />,
}))

// Mock clipboard
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
})

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const mockTemplate = {
  id: 'tpl-1',
  name: 'My Template',
  code: '',
  variableSchema: [],
  cssConfig: '',
  tags: [],
  fonts: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

describe('dashboard page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function renderDashboard() {
    return renderWithProviders(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    )
  }

  it('shows loading state initially', () => {
    vi.mocked(templatesApi.list).mockReturnValue(new Promise(() => {}))
    renderDashboard()
    expect(screen.getByTestId('templates-loading')).toBeInTheDocument()
  })

  it('shows empty state when no templates', async () => {
    vi.mocked(templatesApi.list).mockResolvedValue([])
    renderDashboard()
    await waitFor(() => expect(screen.getByTestId('templates-empty')).toBeInTheDocument())
  })

  it('renders template list', async () => {
    vi.mocked(templatesApi.list).mockResolvedValue([mockTemplate])
    renderDashboard()
    await waitFor(() => expect(screen.getByTestId('templates-list')).toBeInTheDocument())
    expect(screen.getByTestId('template-item-tpl-1')).toBeInTheDocument()
    expect(screen.getByText('My Template')).toBeInTheDocument()
  })

  it('switches to API Keys tab', async () => {
    vi.mocked(templatesApi.list).mockResolvedValue([])
    renderDashboard()
    await waitFor(() => screen.getByTestId('tab-api-keys'))
    fireEvent.click(screen.getByTestId('tab-api-keys'))
    expect(screen.getByTestId('api-key-manager')).toBeInTheDocument()
  })

  it('switches to Fonts tab', async () => {
    vi.mocked(templatesApi.list).mockResolvedValue([])
    renderDashboard()
    await waitFor(() => screen.getByTestId('tab-fonts'))
    fireEvent.click(screen.getByTestId('tab-fonts'))
    expect(screen.getByTestId('font-manager')).toBeInTheDocument()
  })

  it('navigates to editor when Edit is clicked', async () => {
    vi.mocked(templatesApi.list).mockResolvedValue([mockTemplate])
    renderDashboard()
    await waitFor(() => screen.getByTestId('edit-template-tpl-1'))
    fireEvent.click(screen.getByTestId('edit-template-tpl-1'))
    expect(mockNavigate).toHaveBeenCalledWith('/templates/tpl-1')
  })

  it('creates a new template and navigates to editor', async () => {
    vi.mocked(templatesApi.list).mockResolvedValue([])
    vi.mocked(templatesApi.create).mockResolvedValue({ ...mockTemplate, id: 'tpl-new' })
    renderDashboard()
    await waitFor(() => screen.getByTestId('create-template-btn'))
    fireEvent.click(screen.getByTestId('create-template-btn'))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/templates/tpl-new'))
  })

  it('deletes a template when confirmed', async () => {
    vi.mocked(templatesApi.list).mockResolvedValue([mockTemplate])
    vi.mocked(templatesApi.delete).mockResolvedValue({ ok: true })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderDashboard()
    await waitFor(() => screen.getByTestId('delete-template-tpl-1'))
    fireEvent.click(screen.getByTestId('delete-template-tpl-1'))
    await waitFor(() => expect(templatesApi.delete).toHaveBeenCalledWith('tpl-1'))
    await waitFor(() => expect(screen.queryByTestId('template-item-tpl-1')).not.toBeInTheDocument())
  })

  it('logs out and navigates to login', async () => {
    vi.mocked(templatesApi.list).mockResolvedValue([])
    vi.mocked(auth.logout).mockResolvedValue({ ok: true })
    renderDashboard()
    await waitFor(() => screen.getByTestId('logout-btn'))
    fireEvent.click(screen.getByTestId('logout-btn'))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login'))
  })

  it('copies OG URL to clipboard when Copy URL is clicked', async () => {
    vi.mocked(templatesApi.list).mockResolvedValue([mockTemplate])
    renderDashboard()
    await waitFor(() => screen.getByTestId('copy-url-tpl-1'))
    fireEvent.click(screen.getByTestId('copy-url-tpl-1'))
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('/og/tpl-1'),
      ),
    )
  })

  it('switches to Gallery tab', async () => {
    vi.mocked(templatesApi.list).mockResolvedValue([])
    renderDashboard()
    await waitFor(() => screen.getByTestId('tab-gallery'))
    fireEvent.click(screen.getByTestId('tab-gallery'))
    expect(screen.getByTestId('gallery-manager')).toBeInTheDocument()
  })
})
