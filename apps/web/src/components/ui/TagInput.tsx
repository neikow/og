import type { KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { useRef, useState } from 'react'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  /** If true, render a compact inline version without a visible input box border */
  inline?: boolean
}

const MULTI_SPACE_REGEX = /\s+/g

export function TagInput({ tags, onChange, placeholder = 'Add tag…', inline = false }: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function addTag(raw: string) {
    const value = raw.trim().toLowerCase().replace(MULTI_SPACE_REGEX, '-')
    if (!value || tags.includes(value)) {
      setInputValue('')
      return
    }
    onChange([...tags, value])
    setInputValue('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
    }
    else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  function removeTag(tag: string) {
    onChange(tags.filter(t => t !== tag))
  }

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4,
        alignItems: 'center',
        padding: inline ? '2px 0' : '4px 8px',
        border: inline ? 'none' : '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        background: inline ? 'transparent' : 'var(--bg-tertiary)',
        cursor: 'text',
        minHeight: 30,
      }}
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map(tag => (
        <span
          key={tag}
          className="badge badge-blue"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, paddingRight: 4 }}
        >
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              removeTag(tag)
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: 'inherit',
              opacity: 0.7,
              lineHeight: 1,
            }}
            aria-label={`Remove tag ${tag}`}
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (inputValue.trim())
            addTag(inputValue)
        }}
        placeholder={tags.length === 0 ? placeholder : ''}
        style={{
          border: 'none',
          outline: 'none',
          background: 'transparent',
          padding: '0 2px',
          fontSize: 12,
          color: 'var(--text)',
          minWidth: 80,
          flex: 1,
        }}
      />
    </div>
  )
}
