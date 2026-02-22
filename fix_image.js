const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Auction = require('./models/Auction');

async function fixImage() {
  try {
    const uri = process.env.MONGO_URI ? process.env.MONGO_URI.replace('localhost', '127.0.0.1') : 'mongodb://127.0.0.1:27017/augeo-auction';
    await mongoose.connect(uri);
    console.log('Connected to DB');

    const brokenId = '1527281405159';
    const replacementUrl = 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=1000&auto=format&fit=crop';

    const result = await Auction.updateMany(
      { coverImage: new RegExp(brokenId) },
      { $set: { coverImage: replacementUrl } }
    );
    console.log('Updated auctions coverImage:', result.modifiedCount);

    const resultImages = await Auction.updateMany(
      { images: new RegExp(brokenId) },
      { $set: { "images.$[elem]": replacementUrl } },
      { arrayFilters: [{ "elem": new RegExp(brokenId) }] }
    );
    console.log('Updated auctions images array:', resultImages.modifiedCount);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixImage();
