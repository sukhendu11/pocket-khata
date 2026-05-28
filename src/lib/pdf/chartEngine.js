// src/lib/pdf/chartEngine.js — Chart Module
// Generates inline SVG charts for embedding in the PDF HTML template.
// These charts are rendered by html2canvas alongside the rest of the HTML.

/**
 * Generate an SVG bar chart showing monthly income vs expense trends.
 * @param {Array} monthlyTrend - [{ label, income, expense }]
 * @param {number} width - SVG width in px
 * @param {number} height - SVG height in px
 * @param {function} t - i18n translate function (optional)
 * @param {string} lang - Language code (optional)
 * @returns {string} SVG markup string
 */
export function generateTrendChartSVG(monthlyTrend, width = 700, height = 200) {
  if (!monthlyTrend || monthlyTrend.length === 0) {
    return '';
  }

  const maxVal = Math.max(...monthlyTrend.map(m => Math.max(m.income, m.expense)), 1);
  const padding = { top: 20, bottom: 30, left: 50, right: 20 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const barGroups = monthlyTrend.length;
  const groupWidth = chartW / barGroups;
  const barWidth = Math.max(4, groupWidth * 0.3);
  const barGap = groupWidth * 0.1;

  // Y-axis grid lines
  const gridLines = 4;
  let gridHTML = '';
  for (let i = 0; i <= gridLines; i++) {
    const y = padding.top + (chartH / gridLines) * i;
    const val = maxVal - (maxVal / gridLines) * i;
    gridHTML += `
      <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#e8e8f0" stroke-width="1"/>
      <text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="#95a5a6" font-weight="500">${Math.round(val).toLocaleString()}</text>
    `;
  }

  // Bars
  let barsHTML = '';
  let labelsHTML = '';

  monthlyTrend.forEach((m, i) => {
    const x = padding.left + i * groupWidth;
    const incomeH = (m.income / maxVal) * chartH;
    const expenseH = (m.expense / maxVal) * chartH;
    const incomeY = padding.top + chartH - incomeH;
    const expenseY = padding.top + chartH - expenseH;

    // Income bar
    barsHTML += `
      <rect x="${x + barGap}" y="${incomeY}" width="${barWidth}" height="${Math.max(incomeH, 2)}" rx="3" fill="#2ecc71" opacity="0.85"/>
    `;
    // Expense bar
    barsHTML += `
      <rect x="${x + barGap * 2 + barWidth}" y="${expenseY}" width="${barWidth}" height="${Math.max(expenseH, 2)}" rx="3" fill="#e74c3c" opacity="0.85"/>
    `;

    // Labels
    labelsHTML += `
      <text x="${x + groupWidth / 2}" y="${height - 6}" text-anchor="middle" font-size="10" fill="#7f8c8d" font-weight="600">${m.label}</text>
    `;
  });

  // Legend
  const legendHTML = `
    <g transform="translate(${width - 160}, 5)">
      <rect x="0" y="0" width="10" height="10" rx="2" fill="#2ecc71"/>              <text x="14" y="9" font-size="10" fill="#1a1a2e" font-weight="600">Income</text>
      <rect x="70" y="0" width="10" height="10" rx="2" fill="#e74c3c"/>
      <text x="84" y="9" font-size="10" fill="#1a1a2e" font-weight="600">Expense</text>
    </g>
  `;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background:transparent;">
      ${gridHTML}
      ${barsHTML}
      ${labelsHTML}
      ${legendHTML}
    </svg>
  `;
}

/**
 * Generate an SVG donut/ring chart for category breakdown.
 * @param {Array} breakdown - [{ name, amount, percentage, color }]
 * @param {number} size - SVG width/height in px
 * @param {function} t - i18n translate function (optional)
 * @param {string} lang - Language code (optional)
 * @returns {string} SVG markup string
 */
export function generateCategoryChartSVG(breakdown, size = 300) {
  if (!breakdown || breakdown.length === 0) return '';

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.38;
  const innerR = size * 0.26;
  const total = breakdown.reduce((s, i) => s + i.amount, 0);
  if (total === 0) return '';

  let cumulativeAngle = -90; // Start from top
  const slices = [];

  breakdown.forEach(item => {
    const sliceAngle = (item.amount / total) * 360;
    if (sliceAngle <= 0) return;

    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + sliceAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = cx + outerR * Math.cos(startRad);
    const y1 = cy + outerR * Math.sin(startRad);
    const x2 = cx + outerR * Math.cos(endRad);
    const y2 = cy + outerR * Math.sin(endRad);

    const largeArc = sliceAngle > 180 ? 1 : 0;

    // Outer arc path
    const outerPath = `M ${cx + innerR * Math.cos(startRad)} ${cy + innerR * Math.sin(startRad)}
      L ${x1} ${y1}
      A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2}
      L ${cx + innerR * Math.cos(endRad)} ${cy + innerR * Math.sin(endRad)}
      A ${innerR} ${innerR} 0 ${largeArc} 0 ${cx + innerR * Math.cos(startRad)} ${cy + innerR * Math.sin(startRad)}
      Z`;

    slices.push({
      path: outerPath,
      color: item.color,
      name: item.name,
      pct: item.percentage.toFixed(1),
    });

    cumulativeAngle += sliceAngle;
  });

  const pathsHTML = slices.map(s => `
    <path d="${s.path}" fill="${s.color}" stroke="#fff" stroke-width="1.5"/>
  `).join('');

  // Legend
  const legendItems = slices.slice(0, 8).map((s, i) => {
    const y = 14 + i * 22;
    return `
      <g transform="translate(${size + 16}, ${y})">
        <rect x="0" y="0" width="12" height="12" rx="2" fill="${s.color}"/>
        <text x="18" y="10" font-size="11" fill="#1a1a2e" font-weight="500">${s.name}</text>
        <text x="${160}" y="10" font-size="11" fill="#7f8c8d" font-weight="600" text-anchor="end">${s.pct}%</text>
      </g>
    `;
  }).join('');

  const legendW = 200;
  const totalW = size + legendW;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${Math.max(size, slices.length * 22 + 20)}" viewBox="0 0 ${totalW} ${Math.max(size, slices.length * 22 + 20)}" style="background:transparent;">
      <g transform="translate(0, 0)">
        ${pathsHTML}
      </g>
      ${legendItems}
    </svg>
  `;
}
