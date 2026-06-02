import { useMemo } from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable SVG Donut Chart Component
 *
 * Props:
 *   data         – Array of { id?, name?, amount, color, percentage }
 *   activeIndex  – Currently selected slice index (or null)
 *   onSliceClick – (idx) => void
 *   centerText   – Text in donut center (e.g., "Exp")
 *   centerSubtext– Smaller text below center
 *   radius       – Outer radius (default 65)
 *   innerRadius  – Inner hole radius (default 32)
 *   size         – ViewBox/SVG size (default 170)
 *   animate      – Enable mounting animation (default false)
 *   animationProgress – 0..1 for external animation control
 *   gradients    – Array of { id, colorStart, colorEnd } to match data items, or false for solid colors
 *   showLabels   – Render % labels on slices (default false)
 *   labelThreshold – Minimum % to show a label (default 12)
 */
export default function PieChart({
  data,
  activeIndex,
  onSliceClick,
  centerText = '',
  centerSubtext = '',
  radius = 65,
  innerRadius = 32,
  size = 170,
  animate = false,
  animationProgress = 1,
  gradients = false,
  showLabels = true,
  labelThreshold = 8,
}) {
  const cx = size / 2;
  const cy = size / 2;

  const segments = useMemo(() => {
    let accumulatedAngle = 0;

    return data
      .flatMap((item, index) => {
        const percentage = item.percentage;
        if (percentage === 0) return [];

        let angle = ((percentage / 100) * 360) * (animate ? animationProgress : 1);
        if (angle <= 0) return [];

        // Split full-circle segments (360°) into two half-circles to avoid SVG
        // arc undefined behavior when start and end points are identical.
        // This ensures a single 100% category renders as a complete donut ring.
        const subSegments = [];
        if (angle >= 359.95) {
          // Split full-circle (360°) into two half-circles to avoid SVG arc
          // undefined behavior when start and end points are identical.
          // This ensures a single 100% category renders as a complete donut ring.
          const half1 = buildSegment(item, index, accumulatedAngle, 180, radius, cx, cy, activeIndex, gradients);
          subSegments.push(half1);
          const half2 = buildSegment(item, index, accumulatedAngle + 180, 180, radius, cx, cy, activeIndex, gradients);
          // Suppress duplicate label on the second half
          half2.skipLabel = true;
          subSegments.push(half2);
          accumulatedAngle += angle;
        } else {
          const seg = buildSegment(item, index, accumulatedAngle, angle, radius, cx, cy, activeIndex, gradients);
          subSegments.push(seg);
          accumulatedAngle += angle;
        }
        return subSegments;
      })
      .filter(Boolean);
  }, [data, activeIndex, animate, animationProgress, radius, cx, cy, gradients]);

  // Helper: build a single SVG path segment
  function buildSegment(item, index, startAngle, angle, radius, cx, cy, activeIndex, gradients) {
    const endAngle = startAngle + angle;

    const x1 = cx + radius * Math.cos((Math.PI * (startAngle - 90)) / 180);
    const y1 = cy + radius * Math.sin((Math.PI * (startAngle - 90)) / 180);
    const x2 = cx + radius * Math.cos((Math.PI * (endAngle - 90)) / 180);
    const y2 = cy + radius * Math.sin((Math.PI * (endAngle - 90)) / 180);

    const largeArcFlag = angle > 180 ? 1 : 0;
    const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

    // Label position (at 62% of radius from center) — use the midpoint of the original item's angle
    const midAngle = startAngle + angle / 2;
    const labelRadius = radius * 0.62;
    const labelX = cx + labelRadius * Math.cos((Math.PI * (midAngle - 90)) / 180);
    const labelY = cy + labelRadius * Math.sin((Math.PI * (midAngle - 90)) / 180);

    // Explode offset
    const offsetDistance = activeIndex === index ? 6 : 0;
    const dx = offsetDistance * Math.cos((Math.PI * (midAngle - 90)) / 180);
    const dy = offsetDistance * Math.sin((Math.PI * (midAngle - 90)) / 180);

    return {
      ...item,
      pathData,
      labelX,
      labelY,
      dx,
      dy,
      index,
      fillId: gradients ? `url(#${gradients[index]?.id || `${item.id}-grad`})` : item.color,
    };
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      {gradients && (
        <defs>
          {data.map((item, i) => {
            const g = gradients[i];
            if (!g) return null;
            return (
              <linearGradient key={g.id || i} id={g.id} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={g.colorStart} />
                <stop offset="100%" stopColor={g.colorEnd} />
              </linearGradient>
            );
          })}
        </defs>
      )}

      {segments.map((seg, idx) => (
        <g
          key={seg.id || idx}
          transform={`translate(${seg.dx}, ${seg.dy})`}
          style={{ transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}
        >
          <path
            d={seg.pathData}
            fill={seg.fillId}
            className="svg-pie-segment"
            onClick={() => onSliceClick?.(idx)}
            style={{
              opacity: activeIndex === null || activeIndex === idx ? 1 : 0.7,
              cursor: onSliceClick ? 'pointer' : 'default',
            }}
          />
          {showLabels && seg.percentage > labelThreshold && !seg.skipLabel && (
            <LabelPill text={`${seg.percentage}%`} x={seg.labelX} y={seg.labelY} size={size} />
          )}
        </g>
      ))}

      {/* Inner white core for donut effect */}
      <circle cx={cx} cy={cy} r={innerRadius} fill="var(--bg-color)" />

      {/* Center text */}
      {centerText && (
        <text
          x={cx}
          y={centerSubtext ? cy - 4 : cy + 3}
          textAnchor="middle"
          fontSize="10"
          fontWeight="800"
          fill="var(--text-primary)"
        >
          {centerText}
        </text>
      )}
      {centerSubtext && (
        <text
          x={cx}
          y={cy + 10}
          textAnchor="middle"
          fontSize="7"
          fontWeight="600"
          fill="var(--text-secondary)"
          style={{ textTransform: 'uppercase' }}
        >
          {centerSubtext}
        </text>
      )}
    </svg>
  );
}

/**
 * Small SVG label pill for pie segment percentage labels.
 * Dynamically sizes the background pill to fit text and clamps position
 * within SVG bounds to prevent edge clipping.
 */
LabelPill.propTypes = {
  text: PropTypes.string.isRequired,
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  size: PropTypes.number.isRequired,
};

function LabelPill({ text, x, y, size }) {
  // ~5.5px per char at font-size 9, +4px padding either side
  const textWidth = text.length * 5.5 + 8;
  const pillWidth = Math.max(28, textWidth);
  const halfPill = pillWidth / 2;
  // Clamp to stay within SVG viewBox
  const clampedX = Math.max(halfPill, Math.min(size - halfPill, x));

  return (
    <g>
      <rect
        x={clampedX - halfPill}
        y={y - 7}
        width={pillWidth}
        height="14"
        rx="7"
        fill="rgba(255,255,255,0.85)"
        style={{ pointerEvents: 'none' }}
      />
      <text
        x={clampedX}
        y={y}
        fill="var(--text-primary)"
        fontSize="9"
        fontWeight="800"
        textAnchor="middle"
        dominantBaseline="central"
        style={{ pointerEvents: 'none' }}
      >
        {text}
      </text>
    </g>
  );
}

PieChart.propTypes = {
  data: PropTypes.array,
  activeIndex: PropTypes.number,
  onSliceClick: PropTypes.func,
  centerText: PropTypes.string,
  centerSubtext: PropTypes.string,
  radius: PropTypes.number,
  innerRadius: PropTypes.number,
  size: PropTypes.number,
  animate: PropTypes.bool,
  animationProgress: PropTypes.number,
  gradients: PropTypes.oneOfType([PropTypes.array, PropTypes.bool]),
  showLabels: PropTypes.bool,
  labelThreshold: PropTypes.number,
};
