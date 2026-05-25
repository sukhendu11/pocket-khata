import { describe, it, expect } from 'vitest';
import { formatNumber, formatPercent, toBengaliDigits } from '../utils';

describe('toBengaliDigits', () => {
  it('converts English digits to Bangla', () => {
    expect(toBengaliDigits('1234567890')).toBe('১২৩৪৫৬৭৮৯০');
  });

  it('leaves non-digit characters unchanged', () => {
    expect(toBengaliDigits('Price: 500')).toBe('Price: ৫০০');
  });

  it('handles decimal numbers', () => {
    expect(toBengaliDigits('12.50')).toBe('১২.৫০');
  });
});

describe('formatNumber', () => {
  it('formats numbers with comma separators', () => {
    expect(formatNumber(12345, 'en')).toBe('12,345');
  });

  it('handles zero', () => {
    expect(formatNumber(0, 'en')).toBe('0');
  });

  it('handles null/undefined', () => {
    expect(formatNumber(null, 'en')).toBe('0');
    expect(formatNumber(undefined, 'en')).toBe('0');
    expect(formatNumber(NaN, 'en')).toBe('0');
  });

  it('converts to Bangla digits when lang is bn', () => {
    const result = formatNumber(5000, 'bn');
    expect(result).toBe('৫,০০০');
  });

  it('handles decimal numbers', () => {
    const result = formatNumber(12345.67, 'en');
    expect(result).toBe('12,345.67');
  });
});

describe('formatPercent', () => {
  it('formats percentage', () => {
    expect(formatPercent(45, 'en')).toBe('45%');
  });

  it('rounds to nearest integer', () => {
    expect(formatPercent(45.7, 'en')).toBe('46%');
  });

  it('handles zero', () => {
    expect(formatPercent(0, 'en')).toBe('0%');
  });

  it('handles null/undefined', () => {
    expect(formatPercent(null, 'en')).toBe('0%');
    expect(formatPercent(undefined, 'en')).toBe('0%');
    expect(formatPercent(NaN, 'en')).toBe('0%');
  });

  it('converts to Bangla digits when lang is bn', () => {
    expect(formatPercent(75, 'bn')).toBe('৭৫%');
  });
});
