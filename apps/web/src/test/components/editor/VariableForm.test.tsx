import type { OGVariable } from '@og/shared'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { VariableForm } from '../../../components/editor/VariableForm'

const baseVar: OGVariable = { name: 'title', type: 'string', required: true, default: 'Hello' }

describe('variableForm component', () => {
  it('shows empty state when no variables', () => {
    render(<VariableForm variables={[]} onChange={vi.fn()} />)
    expect(screen.getByTestId('variables-empty')).toBeInTheDocument()
  })

  it('renders variable rows when variables exist', () => {
    render(<VariableForm variables={[baseVar]} onChange={vi.fn()} />)
    expect(screen.getByTestId('variables-list')).toBeInTheDocument()
    expect(screen.getByTestId('variable-row-0')).toBeInTheDocument()
  })

  it('displays the variable name, type, required, and default', () => {
    render(<VariableForm variables={[baseVar]} onChange={vi.fn()} />)
    expect((screen.getByTestId('variable-name-0') as HTMLInputElement).value).toBe('title')
    expect((screen.getByTestId('variable-type-0') as HTMLSelectElement).value).toBe('string')
    expect((screen.getByTestId('variable-required-0') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByTestId('variable-default-0') as HTMLInputElement).value).toBe('Hello')
  })

  it('calls onChange with updated name when name input changes', () => {
    const onChange = vi.fn()
    render(<VariableForm variables={[baseVar]} onChange={onChange} />)
    fireEvent.change(screen.getByTestId('variable-name-0'), { target: { value: 'subtitle' } })
    expect(onChange).toHaveBeenCalledWith([{ ...baseVar, name: 'subtitle' }])
  })

  it('calls onChange with updated type when type select changes', () => {
    const onChange = vi.fn()
    render(<VariableForm variables={[baseVar]} onChange={onChange} />)
    fireEvent.change(screen.getByTestId('variable-type-0'), { target: { value: 'number' } })
    expect(onChange).toHaveBeenCalledWith([{ ...baseVar, type: 'number' }])
  })

  it('calls onChange with toggled required when checkbox changes', () => {
    const onChange = vi.fn()
    render(<VariableForm variables={[baseVar]} onChange={onChange} />)
    fireEvent.click(screen.getByTestId('variable-required-0'))
    expect(onChange).toHaveBeenCalledWith([{ ...baseVar, required: false }])
  })

  it('calls onChange with updated default when default input changes', () => {
    const onChange = vi.fn()
    render(<VariableForm variables={[baseVar]} onChange={onChange} />)
    fireEvent.change(screen.getByTestId('variable-default-0'), { target: { value: 'World' } })
    expect(onChange).toHaveBeenCalledWith([{ ...baseVar, default: 'World' }])
  })

  it('removes a variable when remove button is clicked', () => {
    const onChange = vi.fn()
    const vars: OGVariable[] = [
      baseVar,
      { name: 'count', type: 'number', required: false, default: '0' },
    ]
    render(<VariableForm variables={vars} onChange={onChange} />)
    fireEvent.click(screen.getByTestId('variable-remove-0'))
    expect(onChange).toHaveBeenCalledWith([vars[1]])
  })

  it('adds a new variable when Add Variable button is clicked', () => {
    const onChange = vi.fn()
    render(<VariableForm variables={[baseVar]} onChange={onChange} />)
    fireEvent.click(screen.getByTestId('add-variable-btn'))
    expect(onChange).toHaveBeenCalledWith([
      baseVar,
      { name: 'var2', type: 'string', required: true, default: '' },
    ])
  })

  it('adds first variable with name var1 when list is empty', () => {
    const onChange = vi.fn()
    render(<VariableForm variables={[]} onChange={onChange} />)
    fireEvent.click(screen.getByTestId('add-variable-btn'))
    expect(onChange).toHaveBeenCalledWith([
      { name: 'var1', type: 'string', required: true, default: '' },
    ])
  })
})
