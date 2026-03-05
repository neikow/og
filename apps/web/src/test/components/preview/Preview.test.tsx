import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Preview } from '../../../components/preview/Preview'

describe('preview component', () => {
  it('shows placeholder when no url and not loading', () => {
    render(<Preview url={null} loading={false} error={null} />)
    expect(screen.getByTestId('preview-placeholder')).toBeInTheDocument()
  })

  it('shows loading spinner when loading with no url', () => {
    render(<Preview url={null} loading={true} error={null} />)
    expect(screen.getByTestId('preview-loading')).toBeInTheDocument()
  })

  it('shows the image when url is provided', () => {
    render(<Preview url="blob:http://localhost/abc" loading={false} error={null} />)
    const img = screen.getByTestId('preview-image') as HTMLImageElement
    expect(img).toBeInTheDocument()
    expect(img.src).toBe('blob:http://localhost/abc')
  })

  it('shows overlay while loading with existing image', () => {
    render(<Preview url="blob:http://localhost/abc" loading={true} error={null} />)
    expect(screen.getByTestId('preview-overlay-loading')).toBeInTheDocument()
    expect(screen.getByTestId('preview-image')).toBeInTheDocument()
  })

  it('shows error message when error is set', () => {
    render(<Preview url={null} loading={false} error="Syntax error on line 3" />)
    const errorEl = screen.getByTestId('preview-error')
    expect(errorEl).toBeInTheDocument()
    expect(errorEl).toHaveTextContent('Syntax error on line 3')
  })

  it('prefers error over url when both are present', () => {
    render(<Preview url="blob:http://localhost/abc" loading={false} error="Something broke" />)
    expect(screen.getByTestId('preview-error')).toBeInTheDocument()
    expect(screen.queryByTestId('preview-image')).not.toBeInTheDocument()
  })
})
