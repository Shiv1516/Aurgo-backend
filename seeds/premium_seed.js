const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const Page = require('../models/Page');
const Setting = require('../models/Setting');
const Auction = require('../models/Auction');
const Lot = require('../models/Lot');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for premium seeding');
  } catch (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
};

const premiumSeed = async () => {
  try {
    await connectDB();

    // Clear existing data
    console.log('Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Page.deleteMany({}),
      Setting.deleteMany({}),
      Auction.deleteMany({}),
      Lot.deleteMany({}),
      ActivityLog.deleteMany({}),
      Notification.deleteMany({}),
    ]);
    console.log('Existing data cleared.');

    // 1. Create Users
    console.log('Creating users...');
    const superAdmin = await User.create({
      firstName: 'Augeo',
      lastName: 'Admin',
      email: 'admin@augeo.com',
      password: 'Admin@123456',
      role: 'superadmin',
      isEmailVerified: true,
      isActive: true,
    });

    const client = await User.create({
      firstName: 'Heritage',
      lastName: 'Auctions',
      email: 'client@augeo.com',
      password: 'Client@123456',
      role: 'client',
      isEmailVerified: true,
      isActive: true,
      clientApproved: true,
      companyName: 'Heritage Auction House',
      companyDescription: 'Premier global auction house specializing in fine art, rare collectibles, and luxury estates since 1976.',
    });

    const collector = await User.create({
      firstName: 'James',
      lastName: 'Collector',
      email: 'user@augeo.com',
      password: 'User@123456',
      role: 'user',
      isEmailVerified: true,
      isActive: true,
      kyc: { status: 'verified', submittedAt: new Date() }
    });
    console.log('Users created.');

    // 2. Create Categories
    console.log('Creating categories...');
    const categoriesData = [
      { name: 'Fine Art', slug: 'fine-art', description: 'Exceptional paintings and sculptures from masters.', displayOrder: 1, isActive: true },
      { name: 'Rare Horology', slug: 'watches', description: 'High-end investment timepieces.', displayOrder: 2, isActive: true },
      { name: 'Estate Jewelry', slug: 'jewelry', description: 'Exquisite jewelry with historical provenance.', displayOrder: 3, isActive: true },
      { name: 'Classic Motors', slug: 'motors', description: 'Rare vintage and modern performance vehicles.', displayOrder: 4, isActive: true },
      { name: 'Fine Spirits', slug: 'wine-spirits', description: 'Vintage wines and rare spirits.', displayOrder: 5, isActive: true },
      { name: 'Rare Books', slug: 'books', description: 'First editions and historical manuscripts.', displayOrder: 6, isActive: true },
      { name: 'Designer Fashion', slug: 'fashion', description: 'Couture and iconic luxury accessories.', displayOrder: 7, isActive: true },
      { name: 'Contemporary Design', slug: 'design', description: 'Modern furniture and functional art.', displayOrder: 8, isActive: true },
    ];
    const categories = await Category.insertMany(categoriesData);
    console.log('Categories created.');

    // 3. Create Auctions
    console.log('Creating auctions...');
    const now = new Date();
    const tonight = new Date(now); tonight.setHours(20, 0, 0, 0);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const auctionsData = [
      {
        title: 'Impressionist & Modern Masters',
        slug: 'impressionist-modern-masters',
        description: 'A curated evening sale featuring iconic works from the 19th and 20th centuries. Highlights include rare pieces by Monet, Picasso, and Van Gogh.',
        shortDescription: 'The season\'s most anticipated fine art event.',
        client: client._id,
        category: categories[0]._id,
        tags: ["Monet", "Picasso", "Impressionism", "Investment"],
        coverImage: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5',
        startTime: now,
        endTime: tomorrow,
        status: 'live',
        isPublished: true,
        isFeatured: true,
        buyersPremium: 15,
      },
      {
        title: 'Horological Icons: A Private Collection',
        slug: 'horological-icons',
        description: 'A dedicated sale of the world\'s most sought-after timepieces, featuring Patek Philippe and Rolex models from a single private European vault.',
        shortDescription: 'Rare and investment-grade horology.',
        client: client._id,
        category: categories[1]._id,
        tags: ["Patek Philippe", "Rolex", "Vintage", "Luxury"],
        coverImage: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49',
        startTime: now,
        endTime: new Date(now.getTime() + 48 * 60 * 60 * 1000),
        status: 'live',
        isPublished: true,
        isFeatured: true,
        buyersPremium: 12,
      },
      {
        title: 'The Silver Ghost & Vintage Motors',
        slug: 'vintage-motors-silver-ghost',
        description: 'An exceptional assembly of early 20th-century automotive history, lead by a collection of Rolls-Royce Silver Ghosts.',
        shortDescription: 'Iconic automotive history.',
        client: client._id,
        category: categories[3]._id,
        tags: ["Rolls-Royce", "Vintage", "Automotive"],
        coverImage: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70',
        startTime: nextWeek,
        endTime: new Date(nextWeek.getTime() + 72 * 60 * 60 * 1000),
        status: 'scheduled',
        isPublished: true,
        isFeatured: false,
        buyersPremium: 10,
      }
    ];
    const auctions = await Auction.insertMany(auctionsData);
    console.log('Auctions created.');

    // 4. Create Lots
    console.log('Creating lots...');
    const lotsData = [
      // Art Lots
      {
        auction: auctions[0]._id, client: client._id, category: categories[0]._id, lotNumber: 1, title: 'Nymphéas (Water Lilies)',
        description: 'A sublime study of light and water by Claude Monet, from the iconic Water Lilies series. Provenance: Private French Collection.',
        startingBid: 25000000, reservePrice: 45000000, estimateLow: 45000000, estimateHigh: 65000000, bidIncrement: 1000000,
        conditionRating: 'excellent', artist: 'Claude Monet', origin: 'France', yearCreated: '1906',
        status: 'active', currentBid: 48000000, totalBids: 14,
        images: [{ url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5', order: 0 }]
      },
      {
        auction: auctions[0]._id, client: client._id, category: categories[0]._id, lotNumber: 2, title: 'Femme au Chapeau',
        description: 'An explosive use of color by Henri Matisse, a hallmark of the Fauvist movement.',
        startingBid: 12000000, reservePrice: 20000000, estimateLow: 20000000, estimateHigh: 30000000, bidIncrement: 500000,
        conditionRating: 'excellent', artist: 'Henri Matisse', origin: 'France', yearCreated: '1905',
        status: 'active', currentBid: 0, totalBids: 0,
        images: [{ url: 'https://images.unsplash.com/photo-1578320339911-736b042a1789', order: 0 }]
      },
      // Watch Lots
      {
        auction: auctions[1]._id, client: client._id, category: categories[1]._id, lotNumber: 1, title: 'Patek Philippe Ref. 2499',
        description: 'A third series perpetual calendar chronograph in 18k yellow gold. Widely considered the most important watch model ever made.',
        startingBid: 500000, reservePrice: 800000, estimateLow: 800000, estimateHigh: 1200000, bidIncrement: 50000,
        conditionRating: 'mint', artist: 'Patek Philippe', origin: 'Switzerland', yearCreated: '1975',
        status: 'active', currentBid: 950000, totalBids: 9,
        images: [{ url: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49', order: 0 }]
      },
      {
        auction: auctions[1]._id, client: client._id, category: categories[1]._id, lotNumber: 2, title: 'Rolex Cosmograph "Paul Newman" Daytona',
        description: 'Ref. 6239 with an "Exotic" Panda dial. An exceptional example of the most legendary chronograph in existence.',
        startingBid: 250000, reservePrice: 450000, estimateLow: 450000, estimateHigh: 750000, bidIncrement: 25000,
        conditionRating: 'excellent', artist: 'Rolex', origin: 'Switzerland', yearCreated: '1968',
        status: 'active', currentBid: 475000, totalBids: 7,
        images: [{ url: 'https://images.unsplash.com/photo-1614164185128-e4ec99c436d7', order: 0 }]
      },
      // Car Lots
      {
        auction: auctions[2]._id, client: client._id, category: categories[3]._id, lotNumber: 1, title: 'Rolls-Royce Silver Ghost Barker Tourer',
        description: 'Chassis 76TM, a beautifully preserved open-top tourer with matching numbers. Known for its legendary silence and reliability.',
        startingBid: 350000, reservePrice: 650000, estimateLow: 650000, estimateHigh: 950000, bidIncrement: 25000,
        conditionRating: 'excellent', artist: 'Rolls-Royce', origin: 'UK', yearCreated: '1924',
        status: 'pending', totalBids: 0,
        images: [{ url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70', order: 0 }]
      },
      {
        auction: auctions[2]._id, client: client._id, category: categories[3]._id, lotNumber: 2, title: 'Porsche 911 Carrera RS 2.7',
        description: 'The ultimate 911 for many enthusiasts. Finished in Grand Prix White with blue lettering.',
        startingBid: 400000, reservePrice: 750000, estimateLow: 750000, estimateHigh: 1100000, bidIncrement: 50000,
        conditionRating: 'mint', artist: 'Porsche', origin: 'Germany', yearCreated: '1973',
        status: 'pending', totalBids: 0,
        images: [{ url: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b', order: 0 }]
      }
    ];
    await Lot.insertMany(lotsData);
    console.log('Lots created.');

    // 5. Create Settings
    console.log('Creating settings...');
    const settingsData = [
      { key: 'siteName', value: 'Augeo Auctions', category: 'general' },
      { key: 'siteDescription', value: 'The World\'s Leading Destination for Fine Art and Luxury Objects', category: 'general' },
      { key: 'contactEmail', value: 'concierge@augeo.com', category: 'general' },
      { key: 'defaultBuyersPremium', value: 15, category: 'auction' },
      { key: 'currency', value: 'USD', category: 'auction' },
    ];
    await Setting.insertMany(settingsData);
    console.log('Settings created.');

    // 6. Create Pages
    console.log('Creating pages...');
    const pagesData = [
      { title: 'The Augeo Story', slug: 'about', type: 'about', isPublished: true, content: '<h3>Heritage and Innovation</h3><p>Founded on a passion for the extraordinary, Augeo connects connoisseurs with the world\'s most exceptional treasures.</p>' },
      { title: 'Terms of Sale', slug: 'terms', type: 'terms', isPublished: true, content: '<h3>Trust and Transparency</h3><p>Our conditions of sale are designed to ensure a secure and seamless experience for both buyers and sellers.</p>' },
      { title: 'Private Sales', slug: 'private-sales', type: 'custom', isPublished: true, content: '<h3>Bespoke Opportunities</h3><p>Beyond the auction block, we facilitate private transactions for highly confidential acquisition needs.</p>' },
    ];
    await Page.insertMany(pagesData);
    console.log('Pages created.');

    // 7. Activity Logs
    console.log('Creating activity logs...');
    await ActivityLog.create({
      user: superAdmin._id,
      action: 'auction_created',
      resource: 'Auction',
      resourceId: auctions[0]._id,
      details: 'Created "Impressionist & Modern Masters" auction.',
      ipAddress: '127.0.0.1'
    });
    console.log('Activity logs created.');

    console.log('\n--- Premium Seeding Complete ---');
    console.log('Admin: admin@augeo.com / Admin@123456');
    console.log('Client: client@augeo.com / Client@123456');
    console.log('User: user@augeo.com / User@123456');
    console.log('-------------------------------\n');

    process.exit(0);
  } catch (error) {
    console.error('Premium Seed error:', error);
    process.exit(1);
  }
};

premiumSeed();
