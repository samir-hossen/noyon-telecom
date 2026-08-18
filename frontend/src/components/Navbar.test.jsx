import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import { CartProvider } from '../context/CartContext.jsx';
import { WishlistProvider } from '../context/WishlistContext.jsx';
import Navbar from './Navbar.jsx';

function renderNavbar() {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <Navbar />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </LanguageProvider>
    </MemoryRouter>
  );
}

describe('Navbar mega menu — crawlability', () => {
  it('renders every category/brand link in the DOM without requiring hover/click first', async () => {
    // Regression test: the mega menu used to be `{megaOpen && (...)}`,
    // meaning none of these links existed in the DOM at all until a real
    // user hovered/clicked the trigger — a crawler that doesn't simulate
    // that interaction saw none of them. It must now always be present
    // (CSS-only show/hide via the .open class), same as .mobile-menu.
    renderNavbar();

    // `{ hidden: true }` is required here for a different reason than the
    // bug this test guards against: the menu correctly sets aria-hidden
    // while closed (so screen readers skip it), which by design excludes it
    // from a plain role query too — that's an accessibility-tree concern,
    // separate from "is the raw <a href> present in the DOM for a crawler
    // to parse", which is what this test actually checks.
    //
    // A category that only ever appeared inside the mega menu (not in the
    // always-visible catbar/mobile menu, which already covered a handful).
    const oledLink = await screen.findByRole('menuitem', { name: 'OLED', hidden: true });
    expect(oledLink).toHaveAttribute('href', '/shop?category=OLED');

    // A brand — the mega menu is the only always-should-be-crawlable place
    // that lists brands other than the homepage's BrandStrip.
    const appleLink = screen.getByRole('menuitem', { name: 'Apple', hidden: true });
    expect(appleLink).toHaveAttribute('href', '/shop?brand=Apple');
  });

  it('mega menu is visually hidden until opened (CSS-only, not unmounted)', () => {
    renderNavbar();
    const menu = document.querySelector('.mega-menu');
    expect(menu).toBeTruthy(); // present in the DOM even though closed
    expect(menu).not.toHaveClass('open');
  });
});
