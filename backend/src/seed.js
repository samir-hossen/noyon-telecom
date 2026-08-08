import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from './prismaClient.js';

// Sample wholesale catalog covering the core categories Noyon Telecom deals in.
// Image URLs are neutral placeholders — swap for real product photography
// via the admin panel once available.
const PRODUCTS = [
  {
    name: 'iPhone 13 OLED Display Assembly (with Digitizer)',
    desc: 'Original-quality OLED display and digitizer assembly for iPhone 13. True-tone compatible, pre-tested before dispatch.',
    categories: ['Display', 'OLED'],
    category: 'Display',
    images: ['https://images.unsplash.com/photo-1592286927505-1def25115481?w=800&q=80&auto=format'],
    img: 'https://images.unsplash.com/photo-1592286927505-1def25115481?w=800&q=80&auto=format',
    price: 8500,
    compareAt: 9800,
    stock: 120,
    sku: 'NT-DIS-IP13-OLED',
    brand: 'Apple',
    compatibleModels: ['iPhone 13'],
    moq: 1,
    dealerPrice: 7200,
    bulkPricing: [{ minQty: 5, price: 6900 }, { minQty: 20, price: 6500 }],
    warranty: '7 Days Testing Warranty',
  },
  {
    name: 'Samsung Galaxy S23 Ultra Super AMOLED Display',
    desc: 'Super AMOLED replacement display for Galaxy S23 Ultra with in-built fingerprint sensor support.',
    categories: ['Display', 'Touch'],
    category: 'Display',
    images: ['https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&q=80&auto=format'],
    img: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&q=80&auto=format',
    price: 11500,
    compareAt: 13000,
    stock: 60,
    sku: 'NT-DIS-S23U-AMOLED',
    brand: 'Samsung',
    compatibleModels: ['Galaxy S23 Ultra'],
    moq: 1,
    dealerPrice: 9800,
    bulkPricing: [{ minQty: 5, price: 9500 }],
    warranty: '7 Days Testing Warranty',
  },
  {
    name: 'iPhone 12 Series Original Capacity Battery',
    desc: 'Zero-cycle battery cell for iPhone 12/12 Pro with full battery-health reporting support.',
    categories: ['Battery'],
    category: 'Battery',
    images: ['https://images.unsplash.com/photo-1620825141336-4d5b3f9c6d0b?w=800&q=80&auto=format'],
    img: 'https://images.unsplash.com/photo-1620825141336-4d5b3f9c6d0b?w=800&q=80&auto=format',
    price: 1450,
    compareAt: 1650,
    stock: 300,
    sku: 'NT-BAT-IP12',
    brand: 'Apple',
    compatibleModels: ['iPhone 12', 'iPhone 12 Pro'],
    moq: 2,
    dealerPrice: 1150,
    bulkPricing: [{ minQty: 10, price: 1080 }, { minQty: 50, price: 990 }],
    warranty: '4 Months',
  },
  {
    name: 'Samsung Galaxy A54 Charging Port Flex Cable',
    desc: 'USB Type-C charging port flex, direct replacement for Galaxy A54 5G.',
    categories: ['Charging Port', 'Flex'],
    category: 'Charging Port',
    images: ['https://images.unsplash.com/photo-1587033411391-5d9e51cce126?w=800&q=80&auto=format'],
    img: 'https://images.unsplash.com/photo-1587033411391-5d9e51cce126?w=800&q=80&auto=format',
    price: 520,
    compareAt: 620,
    stock: 400,
    sku: 'NT-CHG-A54',
    brand: 'Samsung',
    compatibleModels: ['Galaxy A54 5G'],
    moq: 5,
    dealerPrice: 410,
    bulkPricing: [{ minQty: 20, price: 380 }],
    warranty: '30 Days',
  },
  {
    name: 'iPhone 14 Pro Max Back Glass Panel',
    desc: 'Rear glass panel replacement for iPhone 14 Pro Max, laser-cut to factory tolerances.',
    categories: ['Back Glass', 'Housing'],
    category: 'Back Glass',
    images: ['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&q=80&auto=format'],
    img: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&q=80&auto=format',
    price: 1350,
    compareAt: null,
    stock: 90,
    sku: 'NT-BKG-IP14PM',
    brand: 'Apple',
    compatibleModels: ['iPhone 14 Pro Max'],
    moq: 5,
    dealerPrice: 1050,
    bulkPricing: [{ minQty: 20, price: 950 }],
    warranty: '30 Days',
  },
  {
    name: 'Xiaomi Redmi Note 12 Rear Camera Module',
    desc: '108MP primary rear camera module for Redmi Note 12, plug-and-play flex.',
    categories: ['Camera'],
    category: 'Camera',
    images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80&auto=format'],
    img: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80&auto=format',
    price: 1850,
    compareAt: 2100,
    stock: 55,
    sku: 'NT-CAM-RN12',
    brand: 'Xiaomi',
    compatibleModels: ['Redmi Note 12'],
    moq: 2,
    dealerPrice: 1550,
    bulkPricing: [{ minQty: 10, price: 1450 }],
    warranty: '15 Days',
  },
  {
    name: 'OnePlus Nord CE3 Loud Speaker Ringer Module',
    desc: 'Original-spec loudspeaker/ringer module for OnePlus Nord CE3.',
    categories: ['Speaker'],
    category: 'Speaker',
    images: ['https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800&q=80&auto=format'],
    img: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800&q=80&auto=format',
    price: 380,
    compareAt: 450,
    stock: 220,
    sku: 'NT-SPK-NCE3',
    brand: 'OnePlus',
    compatibleModels: ['Nord CE3'],
    moq: 5,
    dealerPrice: 300,
    bulkPricing: [{ minQty: 25, price: 270 }],
    warranty: '30 Days',
  },
  {
    name: 'Universal SIM Tray Ejector Pin & Tray Set (Assorted)',
    desc: 'Assorted SIM tray + ejector pin set covering major Apple and Samsung models. Sold per pack of 10.',
    categories: ['SIM Tray', 'Accessories'],
    category: 'SIM Tray',
    images: ['https://images.unsplash.com/photo-1601972602288-3be527b4f18a?w=800&q=80&auto=format'],
    img: 'https://images.unsplash.com/photo-1601972602288-3be527b4f18a?w=800&q=80&auto=format',
    price: 250,
    compareAt: null,
    stock: 500,
    sku: 'NT-SIM-UNI10',
    brand: null,
    compatibleModels: [],
    moq: 10,
    dealerPrice: 190,
    bulkPricing: [{ minQty: 50, price: 165 }],
    warranty: 'N/A',
  },
  {
    name: 'Precision Repair Tool Kit (25-in-1)',
    desc: 'Full opening, prying and screwdriver kit for mobile phone and tablet repair technicians.',
    categories: ['Repair Tools'],
    category: 'Repair Tools',
    images: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80&auto=format'],
    img: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80&auto=format',
    price: 950,
    compareAt: 1200,
    stock: 150,
    sku: 'NT-TL-25KIT',
    brand: null,
    compatibleModels: [],
    moq: 1,
    dealerPrice: 780,
    bulkPricing: [{ minQty: 10, price: 720 }],
    warranty: '30 Days',
  },
  {
    name: 'Samsung Galaxy A14 Housing Frame (Middle Chassis)',
    desc: 'Mid-frame chassis replacement for Galaxy A14 with side button pre-fitted.',
    categories: ['Frame', 'Housing'],
    category: 'Frame',
    images: ['https://images.unsplash.com/photo-1611791484670-ce19b801d192?w=800&q=80&auto=format'],
    img: 'https://images.unsplash.com/photo-1611791484670-ce19b801d192?w=800&q=80&auto=format',
    price: 780,
    compareAt: null,
    stock: 75,
    sku: 'NT-FRM-A14',
    brand: 'Samsung',
    compatibleModels: ['Galaxy A14'],
    moq: 5,
    dealerPrice: 640,
    bulkPricing: [{ minQty: 20, price: 590 }],
    warranty: '30 Days',
  },
];

async function main() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@noyontelecom.com').toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123';

  // A store admin account is the single highest-value target on this whole
  // site — refuse to create one with the well-known default password
  // outside local development. This only ever runs once (the "already
  // exists" branch below is a no-op on every later deploy), so it's a
  // one-time gate, not friction on every server start.
  if (process.env.NODE_ENV === 'production' && (!process.env.SEED_ADMIN_PASSWORD || adminPassword === 'ChangeMe123')) {
    console.error(
      'Refusing to seed: SEED_ADMIN_PASSWORD is unset or still the default "ChangeMe123".\n' +
      'Set a strong, unique SEED_ADMIN_PASSWORD in your production environment before seeding.'
    );
    process.exit(1);
  }

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: { name: 'Noyon Telecom Admin', email: adminEmail, passwordHash, role: 'admin', emailVerified: true },
    });
    console.log(`Created admin user: ${adminEmail} / ${adminPassword} (change this password after first login!)`);
  } else {
    console.log(`Admin user ${adminEmail} already exists — skipping.`);
  }

  // A sample pre-approved dealer account so the dealer-pricing code paths
  // (and the future dealer dashboard) have something real to log in as.
  // Dev/staging convenience only — a fake "Sample Mobile Care" account has
  // no place in the real dealer list once this goes live.
  if (process.env.NODE_ENV === 'production') {
    console.log('Skipping sample dealer seed in production.');
    return;
  }
  const dealerEmail = (process.env.SEED_DEALER_EMAIL || 'dealer@noyontelecom.com').toLowerCase();
  const dealerPassword = process.env.SEED_DEALER_PASSWORD || 'ChangeMe123';
  const existingDealer = await prisma.user.findUnique({ where: { email: dealerEmail } });
  if (!existingDealer) {
    const passwordHash = await bcrypt.hash(dealerPassword, 12);
    await prisma.user.create({
      data: {
        name: 'Sample Dealer',
        email: dealerEmail,
        passwordHash,
        role: 'dealer',
        emailVerified: true,
        businessName: 'Sample Mobile Care',
        phone: '01911000000',
        address: 'Bashundhara City, Panthapath, Dhaka',
        dealerStatus: 'approved',
        dealerDiscountPercent: 0,
      },
    });
    console.log(`Created sample dealer: ${dealerEmail} / ${dealerPassword}`);
  } else {
    console.log(`Dealer user ${dealerEmail} already exists — skipping.`);
  }

  const productCount = await prisma.product.count();
  if (productCount === 0) {
    await prisma.product.createMany({ data: PRODUCTS });
    console.log(`Seeded ${PRODUCTS.length} sample wholesale products.`);
  } else {
    console.log(`Products table already has ${productCount} rows — skipping product seed.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
