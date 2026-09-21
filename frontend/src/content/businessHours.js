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
  opens: '10:00',
  closes: '19:00',
  labelEn: 'Sat–Thu, 10am–7pm',
  labelBn: 'শনি–বৃহস্পতি, সকাল ১০টা–সন্ধ্যা ৭টা',
};
