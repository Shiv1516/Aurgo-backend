const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Auction = require('../models/Auction');
const Lot = require('../models/Lot');
const User = require('../models/User');
const Category = require('../models/Category');

async function verify() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.countDocuments();
    const auctions = await Auction.countDocuments();
    const lots = await Lot.countDocuments();
    const categories = await Category.countDocuments();
    
    console.log('Seeding Verification Results:');
    console.log('---------------------------');
    console.log(`Users:      ${users}`);
    console.log(`Auctions:   ${auctions}`);
    console.log(`Lots:        ${lots}`);
    console.log(`Categories: ${categories}`);
    console.log('---------------------------');
    
    // Sample auction
    const sampleAuction = await Auction.findOne().populate('category');
    if (sampleAuction) {
      console.log(`Sample Auction: ${sampleAuction.title} (${sampleAuction.category.name})`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
verify();
