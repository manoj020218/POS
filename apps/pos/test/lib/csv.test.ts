import { describe, expect, it } from 'vitest';

import { parseCsv, toCsv } from '../../src/lib/csv.js';

describe('parseCsv', () => {
  it('parses plain comma-separated rows', () => {
    expect(parseCsv('name,price\r\nRice,120\r\nSalt,20')).toEqual([
      ['name', 'price'],
      ['Rice', '120'],
      ['Salt', '20']
    ]);
  });

  it('handles quoted fields with embedded commas', () => {
    expect(parseCsv('name,note\r\n"Rice, Basmati",good')).toEqual([
      ['name', 'note'],
      ['Rice, Basmati', 'good']
    ]);
  });

  it('unescapes doubled quotes inside a quoted field', () => {
    expect(parseCsv('name\r\n"He said ""hello"""')).toEqual([['name'], ['He said "hello"']]);
  });

  it('handles a trailing newline without producing an empty row', () => {
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2']
    ]);
  });

  it('returns an empty array for an empty string', () => {
    expect(parseCsv('')).toEqual([]);
  });
});

describe('toCsv', () => {
  it('quotes fields containing commas, quotes, or newlines', () => {
    expect(toCsv([['Rice, Basmati', 'say "hi"', 'line1\nline2']])).toBe(
      '"Rice, Basmati","say ""hi""","line1\nline2"'
    );
  });

  it('leaves plain fields unquoted', () => {
    expect(toCsv([['name', 'price'], ['Rice', '120']])).toBe('name,price\r\nRice,120');
  });

  it('round-trips through parseCsv', () => {
    const rows = [
      ['name', 'note'],
      ['Rice, Basmati', 'good "quality"']
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});
