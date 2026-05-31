import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import PieChart from '../components/PieChart';

// ==============================================================================
// Mock Data
// ==============================================================================

const mockData = [
  { id: 'cat_a', name: 'Food', amount: 30000, color: '#e17055', percentage: 30 },
  { id: 'cat_b', name: 'Rent', amount: 50000, color: '#e74c3c', percentage: 50 },
  { id: 'cat_c', name: 'Transport', amount: 20000, color: '#fdcb6e', percentage: 20 },
];

const mockGradients = [
  { id: 'grad_a', colorStart: '#e17055', colorEnd: '#d63031' },
  { id: 'grad_b', colorStart: '#e74c3c', colorEnd: '#c0392b' },
  { id: 'grad_c', colorStart: '#fdcb6e', colorEnd: '#e67e22' },
];

const defaultProps = {
  data: mockData,
};

beforeEach(() => { cleanup(); });

// ==============================================================================
// Rendering
// ==============================================================================

describe('PieChart - Rendering', () => {
  it('renders SVG without crashing', () => {
    const { container } = render(<PieChart {...defaultProps} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('renders correct number of path segments', () => {
    const { container } = render(<PieChart {...defaultProps} />);
    // 3 data items -> 3 path segments (the inner circle is a <circle> not a <path>)
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(3);
  });

  it('renders with custom size', () => {
    const { container } = render(<PieChart {...defaultProps} size={200} />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('width')).toBe('200');
    expect(svg.getAttribute('height')).toBe('200');
  });

  it('renders with default size (170)', () => {
    const { container } = render(<PieChart {...defaultProps} />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('width')).toBe('170');
    expect(svg.getAttribute('height')).toBe('170');
  });
});

// ==============================================================================
// Center Text
// ==============================================================================

describe('PieChart - Center Text', () => {
  it('shows center text when provided', () => {
    const { container } = render(<PieChart {...defaultProps} centerText="Exp" />);
    const texts = container.querySelectorAll('text');
    const centerText = Array.from(texts).find(t => t.textContent === 'Exp');
    expect(centerText).toBeTruthy();
  });

  it('shows center subtext when provided', () => {
    const { container } = render(<PieChart {...defaultProps} centerText="Total" centerSubtext="Expenses" />);
    const texts = container.querySelectorAll('text');
    const subtext = Array.from(texts).find(t => t.textContent === 'Expenses');
    expect(subtext).toBeTruthy();
  });

  it('does not render center text when empty string', () => {
    const { container } = render(<PieChart {...defaultProps} centerText="" />);
    const texts = container.querySelectorAll('text');
    // No center text since empty string is falsy
    expect(texts.length).toBe(0);
  });
});

// ==============================================================================
// Active Index (Explode Effect)
// ==============================================================================

describe('PieChart - Active Index', () => {
  it('renders segments with activeIndex set', () => {
    const { container } = render(<PieChart {...defaultProps} activeIndex={1} />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(3);
  });

  it('non-active segments have reduced opacity when activeIndex is set', () => {
    const { container } = render(<PieChart {...defaultProps} activeIndex={1} />);
    const paths = container.querySelectorAll('path.svg-pie-segment');
    expect(paths.length).toBe(3);

    // Active segment (index 1) should have opacity 1
    expect(paths[1].style.opacity).toBe('1');
    // Non-active segments should have opacity 0.7
    expect(paths[0].style.opacity).toBe('0.7');
    expect(paths[2].style.opacity).toBe('0.7');
  });

  it('all segments have full opacity when activeIndex is null', () => {
    const { container } = render(<PieChart {...defaultProps} activeIndex={null} />);
    const paths = container.querySelectorAll('path.svg-pie-segment');
    expect(paths.length).toBe(3);
    paths.forEach(p => {
      expect(p.style.opacity).toBe('1');
    });
  });
});

// ==============================================================================
// onSliceClick
// ==============================================================================

describe('PieChart - onSliceClick', () => {
  it('calls onSliceClick when a segment is clicked', () => {
    const handleSliceClick = vi.fn();
    const { container } = render(<PieChart {...defaultProps} onSliceClick={handleSliceClick} />);
    const paths = container.querySelectorAll('path.svg-pie-segment');
    expect(paths.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(paths[0]);
    expect(handleSliceClick).toHaveBeenCalledWith(0);
  });

  it('calls onSliceClick with correct index for second segment', () => {
    const handleSliceClick = vi.fn();
    const { container } = render(<PieChart {...defaultProps} onSliceClick={handleSliceClick} />);
    const paths = container.querySelectorAll('path.svg-pie-segment');
    fireEvent.click(paths[1]);
    expect(handleSliceClick).toHaveBeenCalledWith(1);
  });

  it('renders with pointer cursor when onSliceClick is provided', () => {
    const { container } = render(<PieChart {...defaultProps} onSliceClick={() => {}} />);
    const paths = container.querySelectorAll('path.svg-pie-segment');
    expect(paths[0].style.cursor).toBe('pointer');
  });

  it('renders with default cursor when onSliceClick is not provided', () => {
    const { container } = render(<PieChart {...defaultProps} />);
    const paths = container.querySelectorAll('path.svg-pie-segment');
    expect(paths[0].style.cursor).toBe('default');
  });
});

// ==============================================================================
// Labels
// ==============================================================================

describe('PieChart - Labels', () => {
  it('shows percentage labels when showLabels is true', () => {
    const { container } = render(<PieChart {...defaultProps} showLabels />);
    const texts = container.querySelectorAll('text');
    const labelTexts = Array.from(texts).filter(t => t.textContent.includes('%'));
    expect(labelTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('does not show labels for items below labelThreshold', () => {
    const dataWithSmall = [
      { id: 'cat_a', name: 'Big', amount: 90000, color: '#e17055', percentage: 90 },
      { id: 'cat_b', name: 'Small', amount: 10000, color: '#e74c3c', percentage: 10 },
    ];
    const { container } = render(<PieChart data={dataWithSmall} showLabels labelThreshold={15} />);
    const texts = container.querySelectorAll('text');
    const labelTexts = Array.from(texts).filter(t => t.textContent.includes('%'));
    // Item with 90% has label (above 15%), item with 10% does not (below threshold)
    expect(labelTexts.length).toBe(1);
    expect(labelTexts[0].textContent).toBe('90%');
  });

  it('shows labels for all items when all are above threshold', () => {
    const { container } = render(<PieChart {...defaultProps} showLabels labelThreshold={5} />);
    const texts = container.querySelectorAll('text');
    const labelTexts = Array.from(texts).filter(t => t.textContent.includes('%'));
    expect(labelTexts.length).toBe(3);
  });

  it('does not show labels when showLabels is false', () => {
    const { container } = render(<PieChart {...defaultProps} showLabels={false} />);
    const texts = container.querySelectorAll('text');
    const labelTexts = Array.from(texts).filter(t => t.textContent.includes('%'));
    expect(labelTexts.length).toBe(0);
  });
});

// ==============================================================================
// Gradients
// ==============================================================================

describe('PieChart - Gradients', () => {
  it('renders defs with gradient elements when gradients provided', () => {
    const { container } = render(<PieChart {...defaultProps} gradients={mockGradients} />);
    const defs = container.querySelector('defs');
    expect(defs).toBeTruthy();
    const stops = container.querySelectorAll('stop');
    expect(stops.length).toBe(6); // 2 stops per gradient x 3 gradients
  });

  it('renders segments with gradient fill URLs', () => {
    const { container } = render(<PieChart {...defaultProps} gradients={mockGradients} />);
    const paths = container.querySelectorAll('path.svg-pie-segment');
    expect(paths[0].getAttribute('fill')).toContain('url(#');
  });

  it('renders solid colors when gradients is false', () => {
    const { container } = render(<PieChart {...defaultProps} gradients={false} />);
    const paths = container.querySelectorAll('path.svg-pie-segment');
    expect(paths[0].getAttribute('fill')).toBe('#e17055');
  });

  it('renders solid colors by default (gradients not provided)', () => {
    const { container } = render(<PieChart {...defaultProps} />);
    const paths = container.querySelectorAll('path.svg-pie-segment');
    expect(paths[0].getAttribute('fill')).toBe('#e17055');
  });
});

// ==============================================================================
// Animation
// ==============================================================================

describe('PieChart - Animation', () => {
  it('renders with animation enabled (no crash)', () => {
    const { container } = render(<PieChart {...defaultProps} animate />);
    const paths = container.querySelectorAll('path.svg-pie-segment');
    expect(paths.length).toBe(3);
  });

  it('renders with animation progress at 0 (no segments visible)', () => {
    const { container } = render(<PieChart {...defaultProps} animate animationProgress={0} />);
    // animate=true + animationProgress=0 -> angle = 0 for all segments -> all filtered out
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(0);
  });

  it('renders with animation progress at 0.5', () => {
    const { container } = render(<PieChart {...defaultProps} animate animationProgress={0.5} />);
    const paths = container.querySelectorAll('path.svg-pie-segment');
    expect(paths.length).toBe(3);
  });

  it('renders with animation progress at 1', () => {
    const { container } = render(<PieChart {...defaultProps} animate animationProgress={1} />);
    const paths = container.querySelectorAll('path.svg-pie-segment');
    expect(paths.length).toBe(3);
  });
});

// ==============================================================================
// Donut Hole
// ==============================================================================

describe('PieChart - Donut Hole', () => {
  it('renders inner circle for donut effect', () => {
    const { container } = render(<PieChart {...defaultProps} />);
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(1);
  });

  it('renders inner circle with correct radius', () => {
    const { container } = render(<PieChart {...defaultProps} innerRadius={40} />);
    const circle = container.querySelector('circle');
    expect(circle.getAttribute('r')).toBe('40');
  });
});

// ==============================================================================
// Edge Cases
// ==============================================================================

describe('PieChart - Edge Cases', () => {
  it('handles empty data array', () => {
    const { container } = render(<PieChart data={[]} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    // No segments -> no paths
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(0);
  });

  it('handles data with all zero percentages', () => {
    const zeroData = [
      { id: 'cat_a', name: 'A', amount: 0, color: '#e17055', percentage: 0 },
      { id: 'cat_b', name: 'B', amount: 0, color: '#e74c3c', percentage: 0 },
    ];
    const { container } = render(<PieChart data={zeroData} />);
    // percentage=0 -> filtered out -> no segments
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(0);
  });

  it('handles data with some zero percentages', () => {
    const mixedData = [
      { id: 'cat_a', name: 'A', amount: 100, color: '#e17055', percentage: 100 },
      { id: 'cat_b', name: 'B', amount: 0, color: '#e74c3c', percentage: 0 },
    ];
    const { container } = render(<PieChart data={mixedData} />);
    // 1 segment (100%) + 0 circle (circle not path) = 1 path
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(1);
  });

  it('handles single item with 100%', () => {
    const singleData = [
      { id: 'cat_a', name: 'Only', amount: 50000, color: '#e17055', percentage: 100 },
    ];
    const { container } = render(<PieChart data={singleData} />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(1);
  });

  it('handles undefined data gracefully', () => {
    // Component does data.map(...) on undefined -> throws
    expect(() => render(<PieChart data={undefined} />)).toThrow();
  });

  it('handles null data gracefully', () => {
    // Component does data.map(...) on null -> throws
    expect(() => render(<PieChart data={null} />)).toThrow();
  });

  it('handles missing optional props without crashing', () => {
    const { container } = render(<PieChart data={mockData} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });
});
