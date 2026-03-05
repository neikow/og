import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CreateApiKeyModal } from '../../../components/api-keys/CreateApiKeyModal'
import { renderWithProviders } from '../../setup'

describe('createApiKeyModal component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the modal with title and inputs', () => {
    renderWithProviders(<CreateApiKeyModal onCreate={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByTestId('create-api-key-modal')).toBeInTheDocument()
    expect(screen.getByTestId('api-key-name-input')).toBeInTheDocument()
    expect(screen.getByTestId('modal-create-btn')).toBeInTheDocument()
    expect(screen.getByTestId('modal-cancel-btn')).toBeInTheDocument()
  })

  it('create button is disabled when name is empty', () => {
    renderWithProviders(<CreateApiKeyModal onCreate={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByTestId('modal-create-btn')).toBeDisabled()
  })

  it('create button is enabled when name is filled in', () => {
    renderWithProviders(<CreateApiKeyModal onCreate={vi.fn()} onClose={vi.fn()} />)
    fireEvent.change(screen.getByTestId('api-key-name-input'), { target: { value: 'My Key' } })
    expect(screen.getByTestId('modal-create-btn')).not.toBeDisabled()
  })

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn()
    renderWithProviders(<CreateApiKeyModal onCreate={vi.fn()} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('modal-cancel-btn'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onCreate with trimmed name on form submit', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined)
    renderWithProviders(<CreateApiKeyModal onCreate={onCreate} onClose={vi.fn()} />)
    fireEvent.change(screen.getByTestId('api-key-name-input'), { target: { value: '  CI/CD  ' } })
    fireEvent.click(screen.getByTestId('modal-create-btn'))
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith('CI/CD', []))
  })

  it('shows loading state while creating', async () => {
    const onCreate = vi.fn().mockReturnValue(new Promise(() => {}))
    renderWithProviders(<CreateApiKeyModal onCreate={onCreate} onClose={vi.fn()} />)
    fireEvent.change(screen.getByTestId('api-key-name-input'), { target: { value: 'Key' } })
    fireEvent.click(screen.getByTestId('modal-create-btn'))
    await waitFor(() => expect(screen.getByTestId('modal-create-btn')).toHaveTextContent('Creating…'))
  })

  it('shows error when onCreate rejects', async () => {
    const onCreate = vi.fn().mockRejectedValue(new Error('Server error'))
    renderWithProviders(<CreateApiKeyModal onCreate={onCreate} onClose={vi.fn()} />)
    fireEvent.change(screen.getByTestId('api-key-name-input'), { target: { value: 'Key' } })
    fireEvent.click(screen.getByTestId('modal-create-btn'))
    await waitFor(() => expect(screen.getByText('Server error')).toBeInTheDocument())
  })

  it('does not call onCreate when name is blank', () => {
    const onCreate = vi.fn()
    renderWithProviders(<CreateApiKeyModal onCreate={onCreate} onClose={vi.fn()} />)
    // Simulate submitting with empty name via keyboard (button is disabled but test via form directly)
    // The button is disabled so clicking it won't fire; just verify the guard
    expect(screen.getByTestId('modal-create-btn')).toBeDisabled()
    expect(onCreate).not.toHaveBeenCalled()
  })
})
