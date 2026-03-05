import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TemplateEditor } from '../../../components/editor/TemplateEditor'

describe('templateEditor component', () => {
  it('renders the Monaco editor (mocked as textarea)', () => {
    render(<TemplateEditor value="const x = 1" onChange={vi.fn()} />)
    expect(screen.getByTestId('template-editor')).toBeInTheDocument()
  })

  it('displays the provided value', () => {
    render(<TemplateEditor value="hello world" onChange={vi.fn()} />)
    const editor = screen.getByTestId('template-editor') as HTMLTextAreaElement
    expect(editor.value).toBe('hello world')
  })

  it('calls onChange when the editor value changes', () => {
    const onChange = vi.fn()
    render(<TemplateEditor value="" onChange={onChange} />)
    const editor = screen.getByTestId('template-editor')
    fireEvent.change(editor, { target: { value: 'new code' } })
    expect(onChange).toHaveBeenCalledWith('new code')
  })
})
