import { normalizeServerUrl } from '../serverUrl'

describe('normalizeServerUrl', () => {
  it('trims whitespace and trailing slashes', () => {
    expect(normalizeServerUrl('  https://example.com/  ')).toBe('https://example.com')
  })

  it('adds https:// when scheme is missing', () => {
    expect(normalizeServerUrl('example.com')).toBe('https://example.com')
  })

  it('preserves http:// when provided', () => {
    expect(normalizeServerUrl('http://example.com')).toBe('http://example.com')
  })

  it('preserves https:// when provided', () => {
    expect(normalizeServerUrl('https://example.com')).toBe('https://example.com')
  })

  it('removes multiple trailing slashes', () => {
    expect(normalizeServerUrl('https://example.com/api/')).toBe('https://example.com/api')
  })

  it('returns empty string for empty input', () => {
    expect(normalizeServerUrl('')).toBe('')
  })
})
