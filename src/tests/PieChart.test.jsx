import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
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

const defaultProps = { data: mockData };

beforeEach(() => { cleanup(); });

// ==============================================================================
// Rendering
// ==============================================================================

describe('PieChart - Rendering', () => {
  it('renders SVG without crashing', () => {
    const { container } = render(<PieChart {...defaultProps} />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renders correct number of path segments', () => {
    const { container } = render(<PieChart {...defaultProps} />);
    expect(container.querySelectorAll('path.svg-pie-segment').length).toBe(3);
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
    expect(Array.from(texts).find(t => t.textContent === 'Exp')).toBeTruthy();
  });

  it('shows center subtext when provided', () => {
    const { container } = render(<PieChart {...defaultProps} centerText="Total" centerSubtext="Expenses" />);
    const texts = container.querySelectorAll('text');
    expect(Array.from(texts).find(t => t.textContent === 'Expenses')).toBeTruthy();
  });

  it('does not render center text when empty string', () => {
    const { container } = render(<PieChart {...defaultProps} centerText="" />);
    const texts = container.querySelectorAll('text');
    // Only percentage labels (3 items) should render
    expect(texts.length).toBe(3);
  });
});

// ==============================================================================
// Active Index (Explode Effect)
// ==============================================================================

describe('PieChart - Active Index', () => {
  it('renders segments with activeIndex set', () => {
    const { container } = render(<PieChart {...defaultProps} activeIndex={1} />);
    expect(container.querySelectorAll('path.svg-pie-segment').length).toBe(3);
  });

  it('non-active segments have reduced opacity when activeIndex is set', () => {
    const { container } = render(<PieChart {...defaultProps} activeIndex={1} />);
    const paths = container.querySelectorAll('path.svg-pie-segment');
    expect(paths.length).toBe(3);
    expect(paths[1].style.opacity).toBe('1');
    expect(paths[0].style.opacity).toBe('0.65');
    expect(paths[2].style.opacity).toBe('0.65');
  });

  it('all segments have full opacity when activeIndex is null', () => {
    const { container } = render(<PieChart {...defaultProps} activeIndex={null} />);
    container.querySelectorAll('path.svg-pie-segment').forEach(p => {
      expect(p.style.opacity).toBe('1');
    });
  });
});

// ==============================================================================
// onSliceClick
// ==============================================================================

describe('PieChart - onSliceClick', () => {
  it('calls onSliceClick when a segment is clicked', () => {
    const handleClick = vi.fn();
    const { container } = render(<PieChart {...defaultProps} onSliceClick={handleClick} />);
    fireEvent.click(container.querySelectorAll('path.svg-pie-segment')[0]);
    expect(handleClick).toHaveBeenCalled();
  });

  it('renders with pointer cursor when onSliceClick is provided', () => {
    const { container } = render(<PieChart {...defaultProps} onSliceClick={() => {}} />);
    expect(container.querySelector('path.svg-pie-segment').style.cursor).toBe('pointer');
  });

  it('renders with default cursor when onSliceClick is not provided', () => {
    const { container } = render(<PieChart {...defaultProps} />);
    expect(container.querySelector('path.svg-pie-segment').style.cursor).toBe('default');
  });
});

// ==============================================================================
// Labels
// ==============================================================================

describe('PieChart - Labels', () => {
  it('shows percentage labels for all data items', () => {
    const { container } = render(<PieChart {...defaultProps} />);
    const texts = container.querySelectorAll('text');
    const pctLabels = Array.from(texts).filter(t => t.textContent.includes('%'));
    expect(pctLabels.length).toBe(3);
  });

  it('label text matches percentage values', () => {
    const { container } = render(<PieChart {...defaultProps} />);
    const texts = container.querySelectorAll('text');
    const pctLabels = Array.from(texts).filter(t => t.textContent.includes('%'));
    const pcts = pctLabels.map(t => t.textContent).sort();
    expect(pcts).toEqual(['20%', '30%', '50%']);
  });
});

// ==============================================================================
// Gradients
// ==============================================================================

describe('PieChart - Gradients', () => {
  it('renders defs with gradient elements when gradients provided', () => {
    const { container } = render(<PieChart {...defaultProps} gradients={mockGradients} />);
    const stops = container.querySelectorAll('stop');
    expect(stops.length).toBe(6);
  });

  it('renders segments with gradient fill URLs', () => {
    const { container } = render(<PieChart {...defaultProps} gradients={mockGradients} />);
    const first = container.querySelector('path.svg-pie-segment');
    expect(first.getAttribute('fill')).toContain('url(#');
  });

  it('renders solid colors when gradients is false', () => {
    const { container } = render(<PieChart {...defaultProps} gradients={false} />);
    expect(container.querySelector('path.svg-pie-segment').getAttribute('fill')).toBe('#e17055');
  });
});

// ==============================================================================
// Donut Segments
// ==============================================================================

describe('PieChart - Donut Segments', () => {
  it('renders path segments with stroke for visual separation', () => {
    const { container } = render(<PieChart {...defaultProps} />);
    const paths = container.querySelectorAll('path.svg-pie-segment');
    expect(paths[0].getAttribute('stroke')).toBeTruthy();
    expect(paths[0].getAttribute('stroke-width')).toBeTruthy();
  });

  it('arc paths are proper donut segments (no center coordinate)', () => {
    const { container } = render(<PieChart {...defaultProps} />);
    container.querySelectorAll('path.svg-pie-segment').forEach(p => {
      const d = p.getAttribute('d');
      expect(d.startsWith('M')).toBe(true);
      expect(d).toContain('A');
    });
  });
});

// ==============================================================================
// Edge Cases
// ==============================================================================

describe('PieChart - Edge Cases', () => {
  it('handles empty data array', () => {
    const { container } = render(<PieChart data={[]} />);
    expect(container.querySelectorAll('path').length).toBe(0);
  });

  it('handles data with all zero percentages', () => {
    const { container } = render(<PieChart data={[
      { id: 'a', name: 'A', amount: 0, color: '#e17055', percentage: 0 },
      { id: 'b', name: 'B', amount: 0, color: '#e74c3c', percentage: 0 },
    ]} />);
    expect(container.querySelectorAll('path').length).toBe(0);
  });

  it('handles single item with 100%', () => {
    const { container } = render(<PieChart data={[
      { id: 'only', name: 'Only', amount: 50000, color: '#e17055', percentage: 100 },
    ]} />);
    // 100% splits into 2 half-circle arcs
    expect(container.querySelectorAll('path.svg-pie-segment').length).toBe(2);
  });

  it('handles undefined data gracefully', () => {
    const { container } = render(<PieChart data={undefined} />);
    expect(container.querySelector('svg')).toBeTruthy();
    expect(container.querySelectorAll('path').length).toBe(0);
  });

  it('handles null data gracefully', () => {
    const { container } = render(<PieChart data={null} />);
    expect(container.querySelectorAll('path').length).toBe(0);
  });

  it('handles missing optional props without crashing', () => {
    const { container } = render(<PieChart data={mockData} />);
    expect(container.querySelector('svg')).toBeTruthy();
  });
});
