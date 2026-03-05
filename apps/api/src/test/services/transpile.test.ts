import { describe, expect, it } from 'vitest'
import { TranspileError, transpileTemplate } from '../../services/transpile'

describe('transpile service', () => {
  it('transpiles a valid TSX template and returns a React element', () => {
    const code = `
      const Template = ({ title }: { title: string }) => (
        <div style={{ display: 'flex' }}>{title}</div>
      )
      export default Template
    `
    const element = transpileTemplate(code, { title: 'Hello' })
    expect(element).toBeDefined()
    expect(element.type).toBeDefined()
  })

  it('passes props to the component correctly', () => {
    const code = `
      const Template = ({ title, count }: { title: string; count: number }) => (
        <div>{title} {count}</div>
      )
      export default Template
    `
    const element = transpileTemplate(code, { title: 'Test', count: 42 })
    expect(element.props).toMatchObject({ title: 'Test', count: 42 })
  })

  it('throws TranspileError on syntax error', () => {
    const code = `
      const Template = ({ title } => <div>{title}</div> // syntax error
      export default Template
    `
    expect(() => transpileTemplate(code, {})).toThrow(TranspileError)
  })

  it('throws TranspileError when default export is missing', () => {
    const code = `
      const Template = () => <div>Hello</div>
      // no export default
    `
    expect(() => transpileTemplate(code, {})).toThrow(TranspileError)
  })

  it('throws TranspileError when default export is not a function', () => {
    const code = `export default 42`
    expect(() => transpileTemplate(code, {})).toThrow(TranspileError)
  })

  it('throws TranspileError when requiring a forbidden module', () => {
    const code = `
      const fs = require('fs')
      const Template = () => <div>Hello</div>
      export default Template
    `
    expect(() => transpileTemplate(code, {})).toThrow(TranspileError)
  })

  it('handles TypeScript type annotations', () => {
    const code = `
      interface Props { title: string; count?: number }
      const Template: React.FC<Props> = ({ title, count = 0 }) => (
        <div style={{ display: 'flex' }}>
          <span>{title}</span>
          <span>{count}</span>
        </div>
      )
      export default Template
    `
    const element = transpileTemplate(code, { title: 'TS Works' })
    expect(element).toBeDefined()
  })
})
