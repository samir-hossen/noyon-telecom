import { describe, it, expect } from 'vitest';
import { priceRequestLink, stockRequestLink, hasPublicPrice, quoteRequestPath, WHATSAPP_NUMBER } from './whatsapp';

const product = { id: 'p1', slug: 'vivo-y21-display', name: 'Vivo Y21 Display', sku: 'NT-DIS-VIVO-Y21', moq: 1 };

function messageOf(link) {
  return decodeURIComponent(new URL(link).searchParams.get('text'));
}

describe('WhatsApp price/stock links', () => {
  it("uses the store's number and the owner's pre-filled Bangla price message", () => {
    const link = priceRequestLink(product);
    expect(link.startsWith(`https://wa.me/${WHATSAPP_NUMBER}?text=`)).toBe(true);
    expect(messageOf(link)).toBe(
      `আসসালামু আলাইকুম, এই পার্টসটার পাইকারি দাম জানতে চাই: Vivo Y21 Display (SKU: NT-DIS-VIVO-Y21) — ${window.location.origin}/product/vivo-y21-display`
    );
  });

  it('leaves out the SKU part when a product has none', () => {
    expect(messageOf(priceRequestLink({ ...product, sku: null }))).not.toContain('SKU');
  });

  it('has a matching stock message', () => {
    expect(messageOf(stockRequestLink(product))).toContain('এই পার্টসটার স্টক জানতে চাই: Vivo Y21 Display');
  });
});

describe('hasPublicPrice', () => {
  it('is false for the null price the API sends for a hidden draft price, and for 0', () => {
    expect(hasPublicPrice({ price: null })).toBe(false);
    expect(hasPublicPrice({ price: 0 })).toBe(false);
    expect(hasPublicPrice({})).toBe(false);
    expect(hasPublicPrice({ price: 1150 })).toBe(true);
  });
});

describe('quoteRequestPath', () => {
  it('prefills the quote form with the product', () => {
    const url = new URL(quoteRequestPath(product), 'https://x.test');
    expect(url.pathname).toBe('/request-quote');
    expect(url.searchParams.get('productId')).toBe('p1');
    expect(url.searchParams.get('name')).toBe('Vivo Y21 Display');
    expect(url.searchParams.get('sku')).toBe('NT-DIS-VIVO-Y21');
    expect(url.searchParams.get('qty')).toBe('1');
  });
});
