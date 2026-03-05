import { describe, expect, it } from 'vitest'
import {
  FontError,
  validateFontExtension,
} from '../../services/fonts'

describe('fonts service', () => {
  describe('validateFontExtension', () => {
    it('accepts .ttf', () => {
      expect(validateFontExtension('Inter-Regular.ttf')).toBe('.ttf')
    })

    it('accepts .otf', () => {
      expect(validateFontExtension('Inter-Regular.otf')).toBe('.otf')
    })

    it('accepts .woff', () => {
      expect(validateFontExtension('Inter-Regular.woff')).toBe('.woff')
    })

    it('rejects .woff2 with a helpful error', () => {
      expect(() => validateFontExtension('Inter-Regular.woff2')).toThrow(FontError)
      expect(() => validateFontExtension('Inter-Regular.woff2')).toThrow(/WOFF2/)
    })

    it('rejects unknown extensions', () => {
      expect(() => validateFontExtension('font.eot')).toThrow(FontError)
      expect(() => validateFontExtension('font.svg')).toThrow(FontError)
    })

    it('is case-insensitive', () => {
      expect(validateFontExtension('Font.TTF')).toBe('.ttf')
      expect(validateFontExtension('Font.OTF')).toBe('.otf')
    })
  })
})
