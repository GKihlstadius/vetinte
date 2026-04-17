import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductCard } from '@/components/product-card';

const sample = {
  id: '1',
  slug: 'sony-wh-1000xm5',
  brand: 'Sony',
  model: 'WH-1000XM5',
  price_from: 2990,
  store_count: 6,
  rating: 4.7,
  test_count: 247,
  specs: ['ANC', '30h batteri', '250 g'],
  image_url: null,
  is_winner: true,
  angle: 'Bästa ANC',
  affiliate_link_id: 'abc',
};

describe('ProductCard', () => {
  it('renders brand and model', () => {
    render(<ProductCard {...sample} />);
    expect(screen.getByText('Sony')).toBeDefined();
    expect(screen.getByText('WH-1000XM5')).toBeDefined();
  });

  it('shows Bäst i test badge for winners', () => {
    render(<ProductCard {...sample} />);
    expect(screen.getByText('Bäst i test')).toBeDefined();
  });
});
