import { useMemo } from 'react';
import PropTypes from 'prop-types';

/**
 * Clean SVG Donut Chart — with extreme-ratio detection, label bounds checking,
 * short leader lines, and responsive sizing.
 *
 * Extreme-ratio mode (single category or any ≥95%):
 *   - Hides ALL external labels and leader lines
 *   - Shows dominant percentage + category name in the donut center
 *
 * Props:
 *   data         – Array of { id?, name?, amount, color, percentage }
 *   activeIndex  – Selected slice index (or null)
 *   onSliceClick – (idx) => void
 *   centerText   – Short label in the donut hole (overridden in extreme mode)
 *   centerSubtext– Smaller text below centerText (overridden in extreme mode)
 *   size         – SVG viewBox size (default 170)
 *   gradients    – Array of { id, colorStart, colorEnd } or false for solid colors
 *   paddingAngle – Gap between slices in degrees (default 2)
 */

// ── Helper: build a donut arc path ────────────────────────────────────
function buildArc(cx, cy, outerR, innerR, startDeg, sweepDeg, padRad) {
  const sRad = (startDeg * Math.PI) / 180 + padRad;
  const swRad = (sweepDeg * Math.PI) / 180 - padRad * 2;
  if (swRad <= 0) return null;

  const ox1 = cx + outerR * Math.cos(sRad - Math.PI / 2);
  const oy1 = cy + outerR * Math.sin(sRad - Math.PI / 2);
  const ox2 = cx + outerR * Math.cos(sRad + swRad - Math.PI / 2);
  const oy2 = cy + outerR * Math.sin(sRad + swRad - Math.PI / 2);
  const ix1 = cx + innerR * Math.cos(sRad + swRad - Math.PI / 2);
  const iy1 = cy + innerR * Math.sin(sRad + swRad - Math.PI / 2);
  const ix2 = cx + innerR * Math.cos(sRad - Math.PI / 2);
  const iy2 = cy + innerR * Math.sin(sRad - Math.PI / 2);
  const largeArc = swRad > Math.PI ? 1 : 0;

  return [
    `M ${ox1} ${oy1}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${ox2} ${oy2}`,
    `L ${ix1} ${iy1}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2}`,
    'Z',
  ].join(' ');
}

export default function PieChart({
  data = [],
  activeIndex,
  onSliceClick,
  centerText = '',
  centerSubtext = '',
  size = 170,
  gradients,
  paddingAngle = 2,
}) {
  const margin = Math.max(14, size * 0.09);
  const rad = (size / 2) - margin;
  const innerRad = Math.max(18, rad * 0.42);
  const cx = size / 2;
  const cy = size / 2;
  const padRad = (paddingAngle / 2) * (Math.PI / 180);

  // ── Build segments + labels + center override ──────────────────────
  const chart = useMemo(() => {
    // 1. Filter zero-value items (iterating original data to preserve indices)
    const activeItems = [];
    const originalIndices = [];
    (data || []).forEach((item, idx) => {
      if ((item.percentage || 0) > 0) {
        activeItems.push(item);
        originalIndices.push(idx);
      }
    });

    if (activeItems.length === 0) {
      return { slices: [], labels: [], centerOverride: null };
    }

    // 2. Detect extreme ratio mode
    const extremes = activeItems.length <= 1 || activeItems.some(d => d.percentage >= 95);

    // 3. Build center override for extremes
    let centerOverride = null;
    if (extremes) {
      const dominant = activeItems.reduce((a, b) =>
        a.percentage > b.percentage ? a : b
      );
      centerOverride = {
        text: `${dominant.percentage}%`,
        subtext: dominant.name || '',
      };
    }

    const totalPct = activeItems.reduce((s, d) => s + (d.percentage || 0), 0);
    const scaleFactor = totalPct > 0 ? 360 / totalPct : 0;

    let angle = -90;
    const slices = [];
    const labels = [];

    activeItems.forEach((item, idx) => {
      const rawPct = item.percentage || 0;
      const sweep = rawPct * scaleFactor;
      if (sweep <= 0) return;

      const dataIndex = originalIndices[idx];

      // ── 100% split into halves for reliable arc rendering ──
      if (sweep >= 359.95) {
        const explode = activeIndex === dataIndex ? 7 : 0;
        const origIdx = originalIndices[idx];

        // First half (0-180°)
        const h1Path = buildArc(cx, cy, rad, innerRad, angle, 180, padRad);
        if (h1Path) {
          const mid1 = angle + 90;
          const eAng1 = ((mid1 - 90) * Math.PI) / 180;
          const fill1 = gradients
            ? `url(#${gradients[origIdx]?.id || `g-${origIdx}`})`
            : item.color;
          slices.push({
            _key: `${item.id || idx}-h1`,
            pathData: h1Path,
            fill: fill1,
            dx: explode * Math.cos(eAng1),
            dy: explode * Math.sin(eAng1),
            dataIndex,
          });
        }

        // Second half (180-360°)
        const h2Path = buildArc(cx, cy, rad, innerRad, angle + 180, 180, padRad);
        if (h2Path) {
          const mid2 = angle + 270;
          const eAng2 = ((mid2 - 90) * Math.PI) / 180;
          const fill2 = gradients
            ? `url(#${gradients[origIdx]?.id || `g-${origIdx}`})`
            : item.color;
          slices.push({
            _key: `${item.id || idx}-h2`,
            pathData: h2Path,
            fill: fill2,
            dx: explode * Math.cos(eAng2),
            dy: explode * Math.sin(eAng2),
            dataIndex,
          });
        }

        angle += sweep;
        return;
      }

      // ── Normal segment ──
      const path = buildArc(cx, cy, rad, innerRad, angle, sweep, padRad);
      if (!path) { angle += sweep; return; }

      const midAng = angle + sweep / 2;
      const lRad = ((midAng - 90) * Math.PI) / 180;
      const explode = activeIndex === dataIndex ? 7 : 0;
      const dx = explode * Math.cos(lRad);
      const dy = explode * Math.sin(lRad);
      const origIdx = originalIndices[idx];
      const fill = gradients
        ? `url(#${gradients[origIdx]?.id || `g-${origIdx}`})`
        : item.color;

      slices.push({
        _key: `${item.id || idx}-s`,
        pathData: path,
        fill,
        dx,
        dy,
        dataIndex,
      });

      // ── External label (only when not extreme) ──
      if (!extremes) {
        const text = `${item.percentage}%`;
        const textW = text.length * 5.5 + 12;
        const pillW = Math.max(30, textW);
        const hp = pillW / 2;

        const labelDist = rad + 8;
        const lx = cx + labelDist * Math.cos(lRad) + dx;
        const ly = cy + labelDist * Math.sin(lRad) + dy;

        // Clamp within SVG bounds
        const clampX = Math.max(hp + 2, Math.min(size - hp - 2, lx));
        const clampY = Math.max(10, Math.min(size - 10, ly));

        // Bounds check — if natural pos is far from clamped, hide label
        const shiftedX = Math.abs(clampX - lx);
        const shiftedY = Math.abs(clampY - ly);
        const show = shiftedX < hp && shiftedY < 10;

        // Leader line endpoint at slice outer edge
        const connDist = rad + 1;
        const connX = cx + connDist * Math.cos(lRad) + dx;
        const connY = cy + connDist * Math.sin(lRad) + dy;

        labels.push({
          key: `${item.id || idx}-lbl`,
          text,
          x: clampX,
          y: clampY,
          pillW,
          connX,
          connY,
          show,
        });
      }

      angle += sweep;
    });

    return { slices, extremes, labels, centerOverride };
  }, [data, activeIndex, size, rad, innerRad, cx, cy, paddingAngle, gradients]);

  // ── Determine center display ───────────────────────────────────────
  const centerDisplay = chart.centerOverride || { text: centerText, subtext: centerSubtext };

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{
        width: '100%',
        maxWidth: size,
        height: 'auto',
        display: 'block',
        flexShrink: 0,
        overflow: 'visible',
      }}
    >
      {gradients && (
        <defs>
          {gradients.map((g, i) =>
            g ? (
              <linearGradient
                key={g.id || i}
                id={g.id}
                x1="0%" y1="0%" x2="100%" y2="100%"
              >
                <stop offset="0%" stopColor={g.colorStart} />
                <stop offset="100%" stopColor={g.colorEnd} />
              </linearGradient>
            ) : null
          )}
        </defs>
      )}

      {/* ── Segments ── */}
      {chart.slices.map((seg) => (
        <path
          key={seg._key}
          d={seg.pathData}
          fill={seg.fill}
          stroke="var(--bg-color)"
          strokeWidth={1.5}
          className="svg-pie-segment"
          onClick={() => onSliceClick?.(seg.dataIndex)}
          style={{
            opacity:
              activeIndex === null || activeIndex === seg.dataIndex ? 1 : 0.65,
            cursor: onSliceClick ? 'pointer' : 'default',
            transform:
              seg.dx || seg.dy
                ? `translate(${seg.dx}px, ${seg.dy}px)`
                : 'none',
            transition:
              'opacity 0.25s ease, transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            transformOrigin: 'center',
          }}
        />
      ))}

      {/* ── Leader lines ── */}
      {chart.labels
        .filter((l) => l.show)
        .map((lbl) => (
          <line
            key={`conn-${lbl.key}`}
            x1={lbl.connX}
            y1={lbl.connY}
            x2={lbl.x}
            y2={lbl.y}
            stroke="var(--text-secondary)"
            strokeWidth={0.75}
            strokeDasharray="2 2"
            style={{ transition: 'all 0.3s ease' }}
            className="svg-pie-leader"
          />
        ))}

      {/* ── Percentage labels ── */}
      {chart.labels
        .filter((l) => l.show)
        .map((lbl) => (
          <g key={lbl.key} style={{ transition: 'all 0.3s ease' }}>
            <rect
              x={lbl.x - lbl.pillW / 2}
              y={lbl.y - 8}
              width={lbl.pillW}
              height="16"
              rx="8"
              fill="var(--label-pill-bg, rgba(255,255,255,0.88))"
              stroke="var(--bg-color)"
              strokeWidth="0.5"
            />
            <text
              x={lbl.x}
              y={lbl.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="9"
              fontWeight="800"
              fill="var(--text-primary)"
              style={{ pointerEvents: 'none' }}
            >
              {lbl.text}
            </text>
          </g>
        ))}

      {/* ── Center text ── */}
      {(centerDisplay.text || centerDisplay.subtext) && (
        <>
          <text
            x={cx}
            y={centerDisplay.subtext ? cy - 5 : cy + 3}
            textAnchor="middle"
            fontSize={chart.centerOverride ? '12' : '10'}
            fontWeight="800"
            fill="var(--text-primary)"
            style={{ pointerEvents: 'none' }}
          >
            {centerDisplay.text}
          </text>
          {centerDisplay.subtext && (
            <text
              x={cx}
              y={cy + 9}
              textAnchor="middle"
              fontSize={chart.centerOverride ? '8' : '7'}
              fontWeight="600"
              fill="var(--text-secondary)"
              style={{
                pointerEvents: 'none',
                textTransform: 'uppercase',
              }}
            >
              {centerDisplay.subtext}
            </text>
          )}
        </>
      )}
    </svg>
  );
}

PieChart.propTypes = {
  data: PropTypes.array,
  activeIndex: PropTypes.number,
  onSliceClick: PropTypes.func,
  centerText: PropTypes.string,
  centerSubtext: PropTypes.string,
  size: PropTypes.number,
  gradients: PropTypes.oneOfType([PropTypes.array, PropTypes.bool]),
  paddingAngle: PropTypes.number,
};
