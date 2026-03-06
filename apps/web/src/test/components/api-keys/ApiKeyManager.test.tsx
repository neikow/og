import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiKeyManager } from '../../../components/api-keys/ApiKeyManager'
import { apiKeysApi } from '../../../lib/api'
import { renderWithProviders } from '../../setup'

vi.mock('../../../lib/api', () => ({
  apiKeysApi: {
    list: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockKey = {
  id: 'key-1',
  name: 'Production',
  createdAt: '2024-01-01T00:00:00.000Z',
  lastUsedAt: null,
  tagRestrictions: [],
}

describe('apiKeyManager component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state initially', () => {
    vi.mocked(apiKeysApi.list).mockReturnValue(new Promise(() => {}))
    renderWithProviders(<ApiKeyManager />)
    expect(screen.getByTestId('api-keys-loading')).toBeInTheDocument()
  })

  it('shows empty state when no API keys', async () => {
    vi.mocked(apiKeysApi.list).mockResolvedValue([])
    renderWithProviders(<ApiKeyManager />)
    await waitFor(() => expect(screen.getByTestId('api-keys-empty')).toBeInTheDocument())
  })

  it('renders API key list when keys exist', async () => {
    vi.mocked(apiKeysApi.list).mockResolvedValue([mockKey])
    renderWithProviders(<ApiKeyManager />)
    await waitFor(() => expect(screen.getByTestId('api-keys-list')).toBeInTheDocument())
    expect(screen.getByTestId('api-key-item-key-1')).toBeInTheDocument()
    expect(screen.getByText('Production')).toBeInTheDocument()
  })

  it('opens create modal when Create API Key button is clicked', async () => {
    vi.mocked(apiKeysApi.list).mockResolvedValue([])
    renderWithProviders(<ApiKeyManager />)
    await waitFor(() => screen.getByTestId('api-keys-empty'))
    fireEvent.click(screen.getByTestId('create-api-key-btn'))
    expect(screen.getByTestId('create-api-key-modal')).toBeInTheDocument()
  })

  it('closes modal when onClose is triggered', async () => {
    vi.mocked(apiKeysApi.list).mockResolvedValue([])
    renderWithProviders(<ApiKeyManager />)
    await waitFor(() => screen.getByTestId('api-keys-empty'))
    fireEvent.click(screen.getByTestId('create-api-key-btn'))
    fireEvent.click(screen.getByTestId('modal-cancel-btn'))
    expect(screen.queryByTestId('create-api-key-modal')).not.toBeInTheDocument()
  })

  it('shows new key banner after creating a key', async () => {
    vi.mocked(apiKeysApi.list).mockResolvedValue([])
    vi.mocked(apiKeysApi.create).mockResolvedValue({
      apiKey: mockKey,
      rawKey: 'og_abc123',
    })
    renderWithProviders(<ApiKeyManager />)
    await waitFor(() => screen.getByTestId('api-keys-empty'))

    fireEvent.click(screen.getByTestId('create-api-key-btn'))
    fireEvent.change(screen.getByTestId('api-key-name-input'), { target: { value: 'Production' } })
    fireEvent.click(screen.getByTestId('modal-create-btn'))

    await waitFor(() => expect(screen.getByTestId('new-key-banner')).toBeInTheDocument())
    expect(screen.getByTestId('new-key-value')).toHaveTextContent('og_abc123')
  })

  it('dismisses the new key banner', async () => {
    vi.mocked(apiKeysApi.list).mockResolvedValue([])
    vi.mocked(apiKeysApi.create).mockResolvedValue({
      apiKey: mockKey,
      rawKey: 'og_abc123',
    })
    renderWithProviders(<ApiKeyManager />)
    await waitFor(() => screen.getByTestId('api-keys-empty'))

    fireEvent.click(screen.getByTestId('create-api-key-btn'))
    fireEvent.change(screen.getByTestId('api-key-name-input'), { target: { value: 'Production' } })
    fireEvent.click(screen.getByTestId('modal-create-btn'))

    await waitFor(() => screen.getByTestId('new-key-banner'))
    fireEvent.click(screen.getByTestId('dismiss-key-btn'))
    expect(screen.queryByTestId('new-key-banner')).not.toBeInTheDocument()
  })

  it('revokes a key when confirmed', async () => {
    vi.mocked(apiKeysApi.list).mockResolvedValue([mockKey])
    vi.mocked(apiKeysApi.delete).mockResolvedValue({ ok: true })
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderWithProviders(<ApiKeyManager />)
    await waitFor(() => screen.getByTestId('api-key-item-key-1'))
    fireEvent.click(screen.getByTestId('revoke-api-key-key-1'))

    await waitFor(() => expect(apiKeysApi.delete).toHaveBeenCalledWith('key-1'))
    await waitFor(() => expect(screen.queryByTestId('api-key-item-key-1')).not.toBeInTheDocument())
  })

  it('does not revoke key when confirm is cancelled', async () => {
    vi.mocked(apiKeysApi.list).mockResolvedValue([mockKey])
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    renderWithProviders(<ApiKeyManager />)
    await waitFor(() => screen.getByTestId('api-key-item-key-1'))
    fireEvent.click(screen.getByTestId('revoke-api-key-key-1'))

    expect(apiKeysApi.delete).not.toHaveBeenCalled()
  })
})
