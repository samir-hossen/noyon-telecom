// Single source of truth for the shop's opening hours — shown in the navbar
// hotline line, the homepage trust strip, and the Contact page (both the
// visible text and its LocalBusiness JSON-LD `openingHoursSpecification`),
// so those three places can never drift out of sync with each other again
// (they previously showed two different, conflicting hour ranges). Update
// ONLY here once the real hours are confirmed — every display location and
// the structured data both read from this one place.
export const BUSINESS_HOURS = {
  // schema.org day names, for openingHoursSpecification.
  days: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
  opens: '09:00',
  closes: '20:00',
  labelEn: 'Sat–Thu, 9am–8pm',
  labelBn: 'শনি–বৃহস্পতি, সকাল ৯টা–রাত ৮টা',
};
