import type { OGVariable, OGVariableType } from '@og/shared'

interface VariableFormProps {
  variables: OGVariable[]
  onChange: (variables: OGVariable[]) => void
}

export function VariableForm({ variables, onChange }: VariableFormProps) {
  function addVariable() {
    onChange([
      ...variables,
      { name: `var${variables.length + 1}`, type: 'string', required: true, default: '' },
    ])
  }

  function updateVariable(index: number, patch: Partial<OGVariable>) {
    onChange(variables.map((v, i) => (i === index ? { ...v, ...patch } : v)))
  }

  function removeVariable(index: number) {
    onChange(variables.filter((_, i) => i !== index))
  }

  return (
    <div>
      {variables.length === 0
        ? (
            <p className="muted" style={{ marginBottom: 8 }} data-testid="variables-empty">
              No variables defined.
            </p>
          )
        : (
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}
              data-testid="variables-list"
            >
              {variables.map((v, i) => (
                <div
                  key={i}
                  style={{ display: 'flex', gap: 8, alignItems: 'center' }}
                  data-testid={`variable-row-${i}`}
                >
                  <input
                    value={v.name}
                    onChange={e => updateVariable(i, { name: e.target.value })}
                    placeholder="name"
                    style={{ width: 120 }}
                    data-testid={`variable-name-${i}`}
                  />
                  <select
                    value={v.type}
                    onChange={e => updateVariable(i, { type: e.target.value as OGVariableType })}
                    data-testid={`variable-type-${i}`}
                  >
                    <option value="string">string</option>
                    <option value="number">number</option>
                    <option value="boolean">boolean</option>
                  </select>
                  <label
                    style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer' }}
                  >
                    <input
                      type="checkbox"
                      checked={v.required}
                      onChange={e => updateVariable(i, { required: e.target.checked })}
                      data-testid={`variable-required-${i}`}
                      style={{ width: 'auto', padding: 0 }}
                    />
                    required
                  </label>
                  <input
                    value={v.default ?? ''}
                    onChange={e => updateVariable(i, { default: e.target.value })}
                    placeholder="default"
                    style={{ flex: 1 }}
                    data-testid={`variable-default-${i}`}
                  />
                  <button
                    className="btn-danger"
                    onClick={() => removeVariable(i)}
                    style={{ fontSize: 12, padding: '3px 8px' }}
                    data-testid={`variable-remove-${i}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
      <button
        className="btn-secondary"
        onClick={addVariable}
        style={{ fontSize: 12, padding: '4px 10px' }}
        data-testid="add-variable-btn"
      >
        + Add Variable
      </button>
    </div>
  )
}
