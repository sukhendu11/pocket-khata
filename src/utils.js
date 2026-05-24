// src/utils.js — Reusable utility functions for Pocket Khata

/**
 * Convert English digits (0-9) to Bangla digits (০-৯).
 * Works on any string containing digits.
 * @param {string|number} input - Value to convert
 * @returns {string} String with Bangla digits
 */
export function toBengaliDigits(input) {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(input).replace(/[0-9]/g, (d) => banglaDigits[parseInt(d)]);
}

/**
 * Format a number for display with locale-aware separators.
 * When lang is 'bn', converts digits to Bangla numerals.
 * Does NOT affect internal calculations — display only.
 *
 * @param {number} num - The number to format
 * @param {string} lang - Language code ('en' or 'bn')
 * @returns {string} Formatted number string
 *
 * @example
 * formatNumber(12345.67, 'en')  // "12,345.67"
 * formatNumber(12345.67, 'bn')  // "১২,৩৪৫.৬৭"
 * formatNumber(5000, 'en')      // "5,000"
 * formatNumber(5000, 'bn')      // "৫,০০০"
 */
export function formatNumber(num, lang = 'en') {
  if (num === null || num === undefined || isNaN(num)) {
    return lang === 'bn' ? '০' : '0';
  }
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  if (lang === 'bn') {
    return toBengaliDigits(formatted);
  }
  return formatted;
}

/**
 * Format a percentage for display.
 *
 * @param {number} pct - Percentage value (0-100)
 * @param {string} lang - Language code ('en' or 'bn')
 * @returns {string} e.g. "45%" or "৪৫%"
 */
export function formatPercent(pct, lang = 'en') {
  if (pct === null || pct === undefined || isNaN(pct)) {
    return lang === 'bn' ? '০%' : '0%';
  }
  if (lang === 'bn') {
    return toBengaliDigits(Math.round(pct)) + '%';
  }
  return Math.round(pct) + '%';
}
