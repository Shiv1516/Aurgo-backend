const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const Page = require('../models/Page');
const Setting = require('../models/Setting');
const Auction = require('../models/Auction');
const Lot = require('../models/Lot');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB Connected for seeding');
};

const seed = async () => {
  try {
    await connectDB();

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Page.deleteMany({}),
      Setting.deleteMany({}),
      Auction.deleteMany({}),
      Lot.deleteMany({}),
    ]);
    console.log('Cleared existing data');

    // Create Super Admin
    const superAdmin = await User.create({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@augeo.com',
      password: 'Admin@123456',
      role: 'superadmin',
      isEmailVerified: true,
      isActive: true,
    });
    console.log('Super Admin created: admin@augeo.com / Admin@123456');

    // Create Client
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
      companyDescription: 'Premier auction house specializing in fine art, antiques, and rare collectibles since 1976.',
    });

    // Create Test User
    const user = await User.create({
      firstName: 'John',
      lastName: 'Doe',
      email: 'user@augeo.com',
      password: 'User@123456',
      role: 'user',
      isEmailVerified: true,
      isActive: true,
    });

    // Categories from dummyData.ts
    const categories = await Category.insertMany([
      { name: 'Fine Art', slug: 'fine-art', description: 'Paintings, sculptures, and fine art pieces', displayOrder: 1, isActive: true },
      { name: 'Rare Horology', slug: 'watches', description: 'Luxury jewelry, diamonds, and timepieces', displayOrder: 2, isActive: true },
      { name: 'Estate Jewelry', slug: 'jewelry', description: 'Rare and valuable antique items', displayOrder: 3, isActive: true },
      { name: 'Classic Motors', slug: 'motors', description: 'Rare collectibles, memorabilia, and limited editions', displayOrder: 4, isActive: true },
      { name: 'Antique Furniture', slug: 'furniture', description: 'Antique and designer furniture pieces', displayOrder: 5, isActive: true },
      { name: 'Fine Spirits', slug: 'wine-spirits', description: 'Fine wines and premium spirits', displayOrder: 6, isActive: true },
      { name: 'Numismatics', slug: 'coins', description: 'Rare coins and banknotes', displayOrder: 7, isActive: true },
      { name: 'Rare Books', slug: 'books', description: 'Rare books and historical manuscripts', displayOrder: 8, isActive: true },
    ]);

    // Auctions from dummyData.ts
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const auctionsData = [
      {
        title: 'The Impressionist Masters Evening Sale',
        slug: 'impressionist-masters-evening-sale',
        description: 'A breathtaking collection of works by Monet, Renoir, and Degas. This evening sale features pieces with exceptional provenance from private European estates.',
        shortDescription: 'A curated evening sale of legendary Impressionist masterpieces.',
        client: client._id,
        category: categories[0]._id,
        tags: ["Monet", "Renoir", "Impressionism", "Masterpiece"],
        coverImage: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=1000&auto=format&fit=crop',
        images: ['https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=1000&auto=format&fit=crop'],
        startTime: now,
        endTime: tomorrow,
        status: 'live',
        isPublished: true,
        isFeatured: true,
        buyersPremium: 15,
      },
      {
        title: 'Exceptional Horology: Rare Patek Philippe Collection',
        slug: 'exceptional-horology-patek-philippe',
        description: 'Featuring a near-mint 1952 Perpetual Calendar and multiple discontinued Nautilus models. This is a once-in-a-decade opportunity for watch collectors.',
        shortDescription: 'Legendary Patek Philippe timepieces from a private Swiss vault.',
        client: client._id,
        category: categories[1]._id,
        tags: ["Patek Philippe", "Nautilus", "Swiss Made", "Investment"],
        coverImage: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=1000&auto=format&fit=crop',
        images: ['https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=1000&auto=format&fit=crop'],
        startTime: now,
        endTime: tomorrow,
        status: 'live',
        isPublished: true,
        isFeatured: true,
        buyersPremium: 12,
      },
      {
        title: 'Classic Motors: The Silver Ghost Series',
        slug: 'classic-motors-silver-ghost',
        description: 'A rare assembly of Rolls-Royce Silver Ghosts from the 1920s, all in concourse-level condition. Fully documented restoration history included.',
        shortDescription: 'Iconic automotive history from the golden age of Rolls-Royce.',
        client: client._id,
        category: categories[3]._id,
        tags: ["Rolls-Royce", "Vintage", "Automotive", "Ghost"],
        coverImage: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1000&auto=format&fit=crop',
        images: ['https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1000&auto=format&fit=crop'],
        startTime: nextWeek,
        endTime: new Date(nextWeek.getTime() + 48 * 60 * 60 * 1000),
        status: 'scheduled',
        isPublished: true,
        isFeatured: false,
        buyersPremium: 10,
      },
      {
        title: 'Fine Spirits: The Macallan Century Selection',
        slug: 'fine-spirits-macallan-century',
        description: 'Rare malts distilled between 1940 and 1980, including the legendary 1946 Select Reserve. Temperature-controlled shipping guaranteed.',
        shortDescription: 'One of the most valuable single-malt collections ever brought to market.',
        client: client._id,
        category: categories[5]._id,
        tags: ["Macallan", "Whiskey", "Rare", "Single Malt"],
        coverImage: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=1000&auto=format&fit=crop',
        images: ['https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=1000&auto=format&fit=crop'],
        startTime: now,
        endTime: tomorrow,
        status: 'live',
        isPublished: true,
        isFeatured: false,
        buyersPremium: 18,
      }
    ];

    const auctions = await Auction.insertMany(auctionsData);

    // Create Lots
    await Lot.insertMany([
      {
        auction: auctions[0]._id, client: client._id, category: categories[0]._id, lotNumber: 1, title: 'Sunset Over the Seine',
        description: 'A stunning oil painting capturing the golden light of sunset reflecting on the Seine river.',
        startingBid: 500000, reservePrice: 1500000, estimateLow: 1500000, estimateHigh: 2500000, bidIncrement: 50000,
        conditionRating: 'excellent', artist: 'Claude Monet', origin: 'France', yearCreated: '1885',
        status: 'active', currentBid: 850000, totalBids: 8,
        images: [{ url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5', order: 0 }]
      },
      {
        auction: auctions[1]._id, client: client._id, category: categories[1]._id, lotNumber: 1, title: 'Patek Philippe Nautilus 5711',
        description: 'The iconic steel sports watch with 18k white gold hour markers.',
        startingBid: 50000, reservePrice: 120000, estimateLow: 120000, estimateHigh: 180000, bidIncrement: 5000,
        conditionRating: 'mint', artist: 'Patek Philippe', origin: 'Switzerland', yearCreated: '2021',
        status: 'active', currentBid: 145000, totalBids: 12,
        images: [{ url: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49', order: 0 }]
      },
      {
        auction: auctions[2]._id, client: client._id, category: categories[3]._id, lotNumber: 1, title: 'Rolls-Royce Silver Ghost Barker Tourer',
        description: 'The world-famous "Silver Ghost" model in exceptional touring configuration.',
        startingBid: 250000, reservePrice: 550000, estimateLow: 550000, estimateHigh: 850000, bidIncrement: 10000,
        conditionRating: 'excellent', artist: 'Rolls-Royce', origin: 'UK', yearCreated: '1924',
        status: 'pending', totalBids: 0,
        images: [{ url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70', order: 0 }]
      }
    ]);

    // Create Settings
    await Setting.insertMany([
      { key: 'siteName', value: 'Augeo Auctions', category: 'general' },
      { key: 'siteDescription', value: 'Premium Auction Marketplace', category: 'general' },
      { key: 'defaultBuyersPremium', value: 15, category: 'auction' },
    ]);

    // Pages
    await Page.insertMany([
      { title: 'About Augeo', slug: 'about', type: 'about', isPublished: true, content: '<h2>About Augeo</h2>' },
      { title: 'Terms & Conditions', slug: 'terms', type: 'terms', isPublished: true, content: '<h2>Terms</h2>' },
    ]);

    console.log('Seeding complete');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();