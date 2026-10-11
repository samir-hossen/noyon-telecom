import { describe, it, expect } from 'vitest';
import { qualityOptions, hasQualityOptions, priceRange } from './quality';
import { orderRequestLink } from './whatsapp';

describe('quality grades', () => {
  const product = { name: 'Vivo Y21 Display', slug: 'vivo-y21-display', sku: 'NT-DIS-VIVO-Y21', qualityOptions: [{ label: 'High Quality', price: 999 }, { label: 'Original', price: 1699 }, { label: 'x', price: 0 }] };
  it('lists priced grades and the range', () => {
    expect(qualityOptions(product).map((g) => g.label)).toEqual(['High Quality', 'Original']);
    expect(priceRange(product)).toEqual({ min: 999, max: 1699 });
    expect(hasQualityOptions({ qualityOptions: [] })).toBe(false);
    expect(priceRange({ qualityOptions: [{ label: 'Original', price: 1699 }] })).toBeNull();
  });
  it('the WhatsApp order message names the chosen grade and its price', () => {
    const text = decodeURIComponent(orderRequestLink(product, { label: 'Original', price: 1699 }).split('?text=')[1]);
    expect(text).toContain('অর্ডার করতে চাই: Vivo Y21 Display — কোয়ালিটি: Original (৳1,699) (SKU: NT-DIS-VIVO-Y21)');
  });
});
