import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext.jsx';
import NotFound from './NotFound.jsx';

describe('NotFound page', () => {
  it('shows a 404 heading and a link back home', () => {
    render(
      <MemoryRouter>
        <LanguageProvider>
          <NotFound />
        </LanguageProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back home/i })).toHaveAttribute('href', '/');
  });

  it('renders Bengali text when the stored language preference is bn', () => {
    localStorage.setItem('nt-language', 'bn');
    render(
      <MemoryRouter>
        <LanguageProvider>
          <NotFound />
        </LanguageProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('এই পেজটি খুঁজে পাওয়া যায়নি।')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'হোমে ফিরে যান' })).toHaveAttribute('href', '/');
    localStorage.removeItem('nt-language');
  });
});
