import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Food Donation Platform database with core schema...');

  await prisma.claim.deleteMany();
  await prisma.foodListing.deleteMany();
  await prisma.user.deleteMany();

  const defaultPassword = await bcrypt.hash('password123', 10);

  // 1. Create Users
  const donor1 = await prisma.user.create({
    data: {
      name: 'Elena Rostova (FreshBites Bakery)',
      email: 'donor@freshbites.com',
      password: defaultPassword,
      role: 'DONOR',
      location: 'Brooklyn, NY',
      latitude: 40.6833,
      longitude: -73.9626,
      phone: '+1 (555) 234-5678',
    },
  });

  const donor2 = await prisma.user.create({
    data: {
      name: 'Marcus Chen (GreenPlate Catering)',
      email: 'catering@greenplate.com',
      password: defaultPassword,
      role: 'DONOR',
      location: 'New York, NY',
      latitude: 40.7081,
      longitude: -74.0113,
      phone: '+1 (555) 876-5432',
    },
  });

  const receiver1 = await prisma.user.create({
    data: {
      name: 'Sarah Jenkins (FeedHope Kitchen)',
      email: 'ngo@feedhope.org',
      password: defaultPassword,
      role: 'RECEIVER',
      location: 'Lower Manhattan, NY',
      latitude: 40.7180,
      longitude: -73.9950,
      phone: '+1 (555) 345-6789',
      acceptedCategories: 'VEG,NON_VEG,RAW,COOKED',
      dailyCapacity: 150,
      isAvailable: true,
      serviceRadiusKm: 12.0,
    },
  });

  const receiver2 = await prisma.user.create({
    data: {
      name: 'David Alvarez (Harbor Shelter)',
      email: 'shelter@harborhouse.org',
      password: defaultPassword,
      role: 'RECEIVER',
      location: 'Brooklyn, NY',
      latitude: 40.6900,
      longitude: -73.9750,
      phone: '+1 (555) 456-7890',
      acceptedCategories: 'VEG,RAW,COOKED', // Does not accept NON_VEG
      dailyCapacity: 60,
      isAvailable: true,
      serviceRadiusKm: 10.0,
    },
  });

  const receiver3 = await prisma.user.create({
    data: {
      name: 'St. Jude Community Outreach',
      email: 'stjude@communitypantry.org',
      password: defaultPassword,
      role: 'RECEIVER',
      location: 'Queens, NY',
      latitude: 40.7450,
      longitude: -73.8750,
      phone: '+1 (555) 333-2211',
      acceptedCategories: 'VEG,NON_VEG,RAW,COOKED',
      dailyCapacity: 200,
      isAvailable: false, // Inactive/Closed currently
      serviceRadiusKm: 8.0,
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: 'Alexander Ward (Admin)',
      email: 'admin@foodrescue.org',
      password: defaultPassword,
      role: 'ADMIN',
      location: 'New York, NY',
      latitude: 40.7128,
      longitude: -74.0060,
      phone: '+1 (555) 999-0000',
    },
  });

  const volunteer = await prisma.user.create({
    data: {
      name: 'Sam Rivera (EcoCourier Volunteer)',
      email: 'volunteer@foodrescue.org',
      password: defaultPassword,
      role: 'VOLUNTEER',
      location: 'New York, NY',
      latitude: 40.7128,
      longitude: -74.0060,
      phone: '+1 (555) 777-8899',
    },
  });

  // 2. Create Food Listings
  const now = new Date();

  const listing1 = await prisma.foodListing.create({
    data: {
      title: 'Artisan Sourdough & Baguettes',
      description: 'Daily fresh unsold bread and baguettes from evening bake. Prepared today, vacuum-wrapped and ready for immediate community distribution.',
      quantity: '18 kg',
      expiryTime: new Date(now.getTime() + 14 * 60 * 60 * 1000), // 14 hrs
      foodType: 'VEG',
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
      temperatureControl: 'ROOM_TEMP',
      prepTimestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      safetyChecklistPassed: true,
      donorId: donor1.id,
      locationAddress: '452 Grand Avenue, Suite 101, Brooklyn, NY',
      latitude: 40.6833,
      longitude: -73.9626,
    },
  });

  const listing2 = await prisma.foodListing.create({
    data: {
      title: 'Mediterranean Grilled Chicken & Quinoa Bowls',
      description: 'Excess catered lunch boxes from corporate conference. Kept refrigerated at 3°C in certified thermal containers.',
      quantity: '45 servings',
      expiryTime: new Date(now.getTime() + 8 * 60 * 60 * 1000), // 8 hrs
      foodType: 'NON_VEG',
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
      temperatureControl: 'REFRIGERATED',
      prepTimestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      safetyChecklistPassed: true,
      donorId: donor2.id,
      locationAddress: '120 Broadway Tower, 4th Floor, New York, NY',
      latitude: 40.7081,
      longitude: -74.0113,
    },
  });

  const listing3 = await prisma.foodListing.create({
    data: {
      title: 'Organic Farm Apples & Valencia Oranges',
      description: 'Three large wooden crates of crisp sweet apples and juicy oranges from weekend market surplus. High nutritional value.',
      quantity: '35 kg',
      expiryTime: new Date(now.getTime() + 72 * 60 * 60 * 1000), // 3 days
      foodType: 'RAW',
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=800&q=80',
      temperatureControl: 'ROOM_TEMP',
      prepTimestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      safetyChecklistPassed: true,
      donorId: donor1.id,
      locationAddress: '452 Grand Avenue, Front Market Store, New York, NY',
    },
  });

  const listing4 = await prisma.foodListing.create({
    data: {
      title: 'Pantry Staples: Brown Rice & Organic Lentils',
      description: 'Unopened manufacturer cases of long-grain rice and green lentils. Shelf-stable pantry restock.',
      quantity: '60 packs',
      expiryTime: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
      foodType: 'RAW',
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
      temperatureControl: 'ROOM_TEMP',
      prepTimestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      safetyChecklistPassed: true,
      donorId: donor2.id,
      locationAddress: '120 Broadway Tower, Warehouse B, New York, NY',
    },
  });

  const listing5 = await prisma.foodListing.create({
    data: {
      title: 'Vegetarian Penne Pasta & Roasted Vegetable Trays',
      description: 'Warm trays of penne pasta with zucchini, bell peppers, sun-dried tomatoes, and fresh basil pesto. Packed in aluminium catering trays.',
      quantity: '30 servings',
      expiryTime: new Date(now.getTime() + 6 * 60 * 60 * 1000), // 6 hrs
      foodType: 'COOKED',
      status: 'CLAIMED',
      imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281290?auto=format&fit=crop&w=800&q=80',
      temperatureControl: 'REFRIGERATED',
      prepTimestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      safetyChecklistPassed: true,
      donorId: donor2.id,
      locationAddress: '120 Broadway Tower, Service Dock, New York, NY',
    },
  });

  // 3. Create Claims
  await prisma.claim.create({
    data: {
      foodListingId: listing5.id,
      receiverId: receiver1.id,
      qrCodeSecret: 'FOOD-RESCUE-DEMO-7A8B9C',
      deliveryStatus: 'UNASSIGNED',
      status: 'APPROVED',
    },
  });

  console.log('Database seeded successfully with food safety & courier delivery schema!');
  console.log('Demo Credentials:');
  console.log('  Donor:      donor@freshbites.com / password123');
  console.log('  NGO:        ngo@feedhope.org / password123');
  console.log('  Volunteer:  volunteer@foodrescue.org / password123');
  console.log('  Admin:      admin@foodrescue.org / password123');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
