import React, { useMemo } from 'react';

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
  showLabels = false,
  labelThreshold = 12,
}) {
  const cx = size / 2;
  const cy = size / 2;

  const segments = useMemo(() => {
    let accumulatedAngle = 0;

    return data
      .map((item, index) => {
        const percentage = item.percentage;
        if (percentage === 0) return null;

        const angle = ((percentage / 100) * 360) * (animate ? animationProgress : 1);
        if (angle <= 0) return null;

        const startAngle = accumulatedAngle;
        const endAngle = accumulatedAngle + angle;

        const x1 = cx + radius * Math.cos((Math.PI * (startAngle - 90)) / 180);
        const y1 = cy + radius * Math.sin((Math.PI * (startAngle - 90)) / 180);
        const x2 = cx + radius * Math.cos((Math.PI * (endAngle - 90)) / 180);
        const y2 = cy + radius * Math.sin((Math.PI * (endAngle - 90)) / 180);

        const largeArcFlag = angle > 180 ? 1 : 0;
        const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

        // Label position (at 62% of radius from center)
        const midAngle = startAngle + angle / 2;
        const labelRadius = radius * 0.62;
        const labelX = cx + labelRadius * Math.cos((Math.PI * (midAngle - 90)) / 180);
        const labelY = cy + labelRadius * Math.sin((Math.PI * (midAngle - 90)) / 180);

        // Explode offset
        const offsetDistance = activeIndex === index ? 6 : 0;
        const dx = offsetDistance * Math.cos((Math.PI * (midAngle - 90)) / 180);
        const dy = offsetDistance * Math.sin((Math.PI * (midAngle - 90)) / 180);

        accumulatedAngle += angle;

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
      })
      .filter(Boolean);
  }, [data, activeIndex, animate, animationProgress, radius, cx, cy, gradients]);

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
          {showLabels && seg.percentage > labelThreshold && (
            <text
              x={seg.labelX}
              y={seg.labelY}
              fill="#ffffff"
              fontSize="9"
              fontWeight="800"
              textAnchor="middle"
              dominantBaseline="central"
              style={{
                pointerEvents: 'none',
                filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.3))',
              }}
            >
              {seg.percentage}%
            </text>
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
          textTransform="uppercase"
        >
          {centerSubtext}
        </text>
      )}
    </svg>
  );
}
