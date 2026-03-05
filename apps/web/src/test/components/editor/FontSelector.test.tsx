import type { Font } from '@og/shared'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FontSelector } from '../../../components/editor/FontSelector'
import { renderWithProviders } from '../../setup'

import { fontsApi } from '../../../lib/api'

vi.mock('../../../lib/api', () => ({
  fontsApi: {
    addHosted: vi.fn(),
    upload: vi.fn(),
  },
}))

function makeFont(id: string, family: string, weight: Font['weight'] = 400, style: 'normal' | 'italic' = 'normal', source: 'upload' | 'google' = 'upload'): Font {
  return {
    id,
    family,
    weight,
    style,
    source,
    filePath: `/fonts/${id}.woff2`,
    createdAt: new Date().toISOString(),
  }
}

describe('fontSelector component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows empty state when no fonts available', () => {
    renderWithProviders(<FontSelector allFonts={[]} selectedFontIds={[]} onChange={vi.fn()} />)
    expect(screen.getByTestId('font-selector-empty')).toBeInTheDocument()
  })

  it('renders font toggle buttons when fonts exist', () => {
    const fonts = [makeFont('f1', 'Inter'), makeFont('f2', 'Roboto')]
    renderWithProviders(<FontSelector allFonts={fonts} selectedFontIds={[]} onChange={vi.fn()} />)
    expect(screen.getByTestId('font-selector-list')).toBeInTheDocument()
    expect(screen.getByTestId('font-toggle-f1')).toBeInTheDocument()
    expect(screen.getByTestId('font-toggle-f2')).toBeInTheDocument()
  })

  it('calls onChange with new id when an unselected font is toggled on', () => {
    const onChange = vi.fn()
    const fonts = [makeFont('f1', 'Inter')]
    renderWithProviders(<FontSelector allFonts={fonts} selectedFontIds={[]} onChange={onChange} />)
    fireEvent.click(screen.getByTestId('font-toggle-f1'))
    expect(onChange).toHaveBeenCalledWith(['f1'])
  })

  it('calls onChange without id when a selected font is toggled off', () => {
    const onChange = vi.fn()
    const fonts = [makeFont('f1', 'Inter'), makeFont('f2', 'Roboto')]
    renderWithProviders(<FontSelector allFonts={fonts} selectedFontIds={['f1', 'f2']} onChange={onChange} />)
    fireEvent.click(screen.getByTestId('font-toggle-f1'))
    expect(onChange).toHaveBeenCalledWith(['f2'])
  })

  it('shows G badge for Google Fonts', () => {
    const fonts = [makeFont('g1', 'Noto Sans', 400, 'normal', 'google')]
    renderWithProviders(<FontSelector allFonts={fonts} selectedFontIds={[]} onChange={vi.fn()} />)
    expect(screen.getByTestId('font-toggle-g1')).toHaveTextContent('G')
  })

  it('does not show G badge for uploaded fonts', () => {
    const fonts = [makeFont('u1', 'MyFont', 400, 'normal', 'upload')]
    renderWithProviders(<FontSelector allFonts={fonts} selectedFontIds={[]} onChange={vi.fn()} />)
    expect(screen.getByTestId('font-toggle-u1')).not.toHaveTextContent('G')
  })

  it('shows italic style in font label', () => {
    const fonts = [makeFont('f1', 'Inter', 400, 'italic')]
    renderWithProviders(<FontSelector allFonts={fonts} selectedFontIds={[]} onChange={vi.fn()} />)
    expect(screen.getByTestId('font-toggle-f1')).toHaveTextContent('italic')
  })

  it('filters font list by search query', () => {
    const fonts = [makeFont('f1', 'Inter'), makeFont('f2', 'Roboto')]
    renderWithProviders(<FontSelector allFonts={fonts} selectedFontIds={[]} onChange={vi.fn()} />)
    fireEvent.change(screen.getByTestId('font-selector-search'), { target: { value: 'inter' } })
    expect(screen.getByTestId('font-toggle-f1')).toBeInTheDocument()
    expect(screen.queryByTestId('font-toggle-f2')).not.toBeInTheDocument()
  })

  it('shows no-match message when search yields no results', () => {
    const fonts = [makeFont('f1', 'Inter')]
    renderWithProviders(<FontSelector allFonts={fonts} selectedFontIds={[]} onChange={vi.fn()} />)
    fireEvent.change(screen.getByTestId('font-selector-search'), { target: { value: 'xyz' } })
    expect(screen.getByTestId('font-selector-no-match')).toBeInTheDocument()
  })

  it('toggles Google Fonts form open/closed', () => {
    renderWithProviders(<FontSelector allFonts={[]} selectedFontIds={[]} onChange={vi.fn()} />)
    fireEvent.click(screen.getByTestId('font-selector-add-google'))
    expect(screen.getByTestId('font-selector-google-form')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('font-selector-add-google'))
    expect(screen.queryByTestId('font-selector-google-form')).not.toBeInTheDocument()
  })

  it('toggles upload form open/closed', () => {
    renderWithProviders(<FontSelector allFonts={[]} selectedFontIds={[]} onChange={vi.fn()} />)
    fireEvent.click(screen.getByTestId('font-selector-add-upload'))
    expect(screen.getByTestId('font-selector-upload-form')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('font-selector-add-upload'))
    expect(screen.queryByTestId('font-selector-upload-form')).not.toBeInTheDocument()
  })

  it('adds a Google Font and calls onFontsAdded', async () => {
    const newFont = makeFont('gf1', 'Inter', 400, 'normal', 'google')
    vi.mocked(fontsApi.addHosted).mockResolvedValue([newFont])
    const onFontsAdded = vi.fn()
    renderWithProviders(<FontSelector allFonts={[]} selectedFontIds={[]} onChange={vi.fn()} onFontsAdded={onFontsAdded} />)
    fireEvent.click(screen.getByTestId('font-selector-add-google'))
    fireEvent.change(screen.getByTestId('font-selector-google-family'), { target: { value: 'Inter' } })
    fireEvent.click(screen.getByTestId('font-selector-google-submit'))
    await waitFor(() => expect(onFontsAdded).toHaveBeenCalledWith([newFont]))
    // form closes after success
    expect(screen.queryByTestId('font-selector-google-form')).not.toBeInTheDocument()
  })

  it('shows error when Google Font fetch fails', async () => {
    vi.mocked(fontsApi.addHosted).mockRejectedValue(new Error('Not found'))
    renderWithProviders(<FontSelector allFonts={[]} selectedFontIds={[]} onChange={vi.fn()} />)
    fireEvent.click(screen.getByTestId('font-selector-add-google'))
    fireEvent.change(screen.getByTestId('font-selector-google-family'), { target: { value: 'Bogus' } })
    fireEvent.click(screen.getByTestId('font-selector-google-submit'))
    await waitFor(() => expect(screen.getAllByText('Not found').length).toBeGreaterThan(0))
  })

  it('cancels Google Fonts form', () => {
    renderWithProviders(<FontSelector allFonts={[]} selectedFontIds={[]} onChange={vi.fn()} />)
    fireEvent.click(screen.getByTestId('font-selector-add-google'))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByTestId('font-selector-google-form')).not.toBeInTheDocument()
  })
})
