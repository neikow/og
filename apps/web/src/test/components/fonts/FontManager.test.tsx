import type { Font } from '@og/shared'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FontManager } from '../../../components/fonts/FontManager'
import { renderWithProviders } from '../../setup'

import { fontsApi } from '../../../lib/api'

// Mock the fonts API
vi.mock('../../../lib/api', () => ({
  fontsApi: {
    list: vi.fn(),
    upload: vi.fn(),
    addHosted: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockFont: Font = {
  id: 'font-1',
  family: 'Inter',
  weight: 400,
  style: 'normal',
  source: 'upload',
  filePath: '/fonts/inter.woff2',
  createdAt: '2024-01-01T00:00:00.000Z',
}

describe('fontManager component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state initially', () => {
    vi.mocked(fontsApi.list).mockReturnValue(new Promise(() => {}))
    renderWithProviders(<FontManager />)
    expect(screen.getByTestId('fonts-loading')).toBeInTheDocument()
  })

  it('shows empty state when no fonts', async () => {
    vi.mocked(fontsApi.list).mockResolvedValue([])
    renderWithProviders(<FontManager />)
    await waitFor(() => expect(screen.getByTestId('fonts-empty')).toBeInTheDocument())
  })

  it('renders font list when fonts exist', async () => {
    vi.mocked(fontsApi.list).mockResolvedValue([mockFont])
    renderWithProviders(<FontManager />)
    await waitFor(() => expect(screen.getByTestId('fonts-list')).toBeInTheDocument())
    expect(screen.getByTestId('font-item-font-1')).toBeInTheDocument()
    expect(screen.getByText('Inter')).toBeInTheDocument()
  })

  it('shows upload font form when Upload Font button is clicked', async () => {
    vi.mocked(fontsApi.list).mockResolvedValue([])
    renderWithProviders(<FontManager />)
    await waitFor(() => screen.getByTestId('fonts-empty'))
    fireEvent.click(screen.getByTestId('upload-font-btn'))
    expect(screen.getByTestId('upload-font-form')).toBeInTheDocument()
  })

  it('toggles upload form off when Upload Font is clicked again', async () => {
    vi.mocked(fontsApi.list).mockResolvedValue([])
    renderWithProviders(<FontManager />)
    await waitFor(() => screen.getByTestId('fonts-empty'))
    fireEvent.click(screen.getByTestId('upload-font-btn'))
    expect(screen.getByTestId('upload-font-form')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('upload-font-btn'))
    expect(screen.queryByTestId('upload-font-form')).not.toBeInTheDocument()
  })

  it('shows Google Fonts form when + Google Fonts button is clicked', async () => {
    vi.mocked(fontsApi.list).mockResolvedValue([])
    renderWithProviders(<FontManager />)
    await waitFor(() => screen.getByTestId('fonts-empty'))
    fireEvent.click(screen.getByTestId('add-google-font-btn'))
    expect(screen.getByTestId('google-font-form')).toBeInTheDocument()
  })

  it('hides form on cancel in upload form', async () => {
    vi.mocked(fontsApi.list).mockResolvedValue([])
    renderWithProviders(<FontManager />)
    await waitFor(() => screen.getByTestId('fonts-empty'))
    fireEvent.click(screen.getByTestId('upload-font-btn'))
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByTestId('upload-font-form')).not.toBeInTheDocument()
  })

  it('deletes a font when delete is confirmed', async () => {
    vi.mocked(fontsApi.list).mockResolvedValue([mockFont])
    vi.mocked(fontsApi.delete).mockResolvedValue({ ok: true })
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderWithProviders(<FontManager />)
    await waitFor(() => screen.getByTestId('font-item-font-1'))
    fireEvent.click(screen.getByTestId('delete-font-font-1'))

    await waitFor(() => expect(fontsApi.delete).toHaveBeenCalledWith('font-1'))
    await waitFor(() => expect(screen.queryByTestId('font-item-font-1')).not.toBeInTheDocument())
  })

  it('does not delete font when confirm is cancelled', async () => {
    vi.mocked(fontsApi.list).mockResolvedValue([mockFont])
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    renderWithProviders(<FontManager />)
    await waitFor(() => screen.getByTestId('font-item-font-1'))
    fireEvent.click(screen.getByTestId('delete-font-font-1'))

    expect(fontsApi.delete).not.toHaveBeenCalled()
  })
})
