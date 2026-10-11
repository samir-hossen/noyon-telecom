import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import { WishlistProvider } from '../context/WishlistContext.jsx';
import { ToastProvider } from '../context/ToastContext.jsx';
import ProductCard from './ProductCard.jsx';

function renderCard(product) {
  localStorage.setItem('nt-language', 'bn');
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <ToastProvider>
          <AuthProvider>
            <WishlistProvider>
              <ProductCard product={product} onAdd={() => {}} />
            </WishlistProvider>
          </AuthProvider>
        </ToastProvider>
      </LanguageProvider>
    </MemoryRouter>
  );
}

const base = { id: 'p1', slug: 'vivo-y21-display', name: 'Vivo Y21 Display', sku: 'NT-DIS-VIVO-Y21', category: 'Display', img: '', moq: 1 };

describe('ProductCard — hidden draft price', () => {
  it('a product without a published price shows WhatsApp + quote, never ৳0, sold out or add-to-cart', () => {
    const { container } = renderCard({ ...base, price: null, stock: 0 });
    const wa = screen.getByRole('link', { name: /দাম জানতে WhatsApp করুন/ });
    expect(wa.getAttribute('href')).toContain('wa.me/8801560047377');
    expect(screen.getByRole('link', { name: 'কোটেশন চান' })).toHaveAttribute('href', expect.stringContaining('/request-quote?'));
    expect(container.textContent).not.toContain('৳');
    expect(container.textContent).not.toContain('স্টক শেষ');
    expect(screen.queryByRole('button', { name: 'কার্টে যোগ করুন' })).toBeNull();
  });

  it('a published price with stock 0 shows the price and a WhatsApp stock button, never "Sold out"', () => {
    const { container } = renderCard({ ...base, price: 1150, retailPrice: 1150, stock: 0 });
    expect(container.textContent).toContain('৳1,150');
    expect(container.textContent).not.toContain('স্টক শেষ');
    expect(screen.getByRole('link', { name: /স্টক জানতে WhatsApp করুন/ })).toHaveAttribute('href', expect.stringContaining('wa.me/8801560047377'));
  });

  it('a published price shows the price and add-to-cart', () => {
    const { container } = renderCard({ ...base, price: 1150, retailPrice: 1150, stock: 5 });
    expect(container.textContent).toContain('৳1,150');
    expect(screen.getByRole('button', { name: 'কার্টে যোগ করুন' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'কোটেশন চান' })).toBeNull();
  });
});
