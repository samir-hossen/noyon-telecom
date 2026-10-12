import { describe, it, expect } from 'vitest';
import { placeholderPhoto, splitProductName } from './partPhoto';

describe('placeholderPhoto', () => {
  it("uses the phone model's own photo when there is one", () => {
    expect(placeholderPhoto({ slug: 'iphone-15-pro-back-glass', name: 'iPhone 15 Pro Back Glass', category: 'Back Glass' }))
      .toBe('/images/models/iphone-15-pro-back-sm.webp');
    expect(placeholderPhoto({ slug: 'iphone-16-plus-back-glass', name: 'iPhone 16 Plus Back Glass', category: 'Back Glass' }, { small: false }))
      .toBe('/images/models/iphone-16-back.webp');
  });

  it('otherwise the photo of the part named at the end of the name, then the category', () => {
    expect(placeholderPhoto({ slug: 'oppo-a57-ear-speaker', name: 'Oppo A57 Ear Speaker', brand: 'Oppo', category: 'Speaker' }))
      .toBe('/images/parts/photos/ear-speaker-sm.webp');
    expect(placeholderPhoto({ slug: 'x', name: 'Vivo Y21 Charging Port', brand: 'Vivo', category: 'Flex' }))
      .toBe('/images/parts/photos/charging-port-sm.webp');
    expect(placeholderPhoto({ slug: 'y', name: 'Something', category: 'Unknown' })).toBe('/images/parts/photos/default-sm.webp');
  });

  it('splits brand, model and part', () => {
    expect(splitProductName({ name: 'Samsung Galaxy A15 Display', brand: 'Samsung' })).toEqual({ brand: 'Samsung', model: 'Galaxy A15', part: 'Display' });
  });
});
