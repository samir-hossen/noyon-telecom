import { describe, it, expect } from 'vitest';
import translations from '../i18n/translations.js';
import { POLICY_PAGES, policyPageContent } from './policyPages.js';

describe('published policy content', () => {
  it('resolves all English and Bangla sections, inline links and duration placeholders', () => {
    for (const lang of ['en', 'bn']) {
      for (const key of Object.keys(POLICY_PAGES)) {
        const page = policyPageContent(key, (name) => {
          expect(translations[lang][name], `${lang}: ${name}`).toBeTypeOf('string');
          return translations[lang][name];
        });
        expect(JSON.stringify(page)).not.toMatch(/\{\{|\[\[ EDIT/);
        expect(page.sections.length).toBeGreaterThanOrEqual(6);
      }
    }
    const warranty = policyPageContent('warranty', (name) => translations.en[name]);
    expect(warranty.sections[0].blocks[0].parts[0].text).toContain('7-day testing warranty');
    expect(warranty.sections[3].blocks[0].items[0][2].text).toContain('7-day testing warranty window');
    const refund = policyPageContent('refund', (name) => translations.en[name]);
    expect(refund.sections[0].blocks[0].parts[0].text).toContain('within 7 days');
    expect(refund.updated).toBe('Last updated: August 2026');
  });
});
