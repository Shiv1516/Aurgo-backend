const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Auction = require('./models/Auction');
const Lot = require('./models/Lot');
const Category = require('./models/Category');

async function checkDB() {
  try {
    const uri = process.env.MONGO_URI ? process.env.MONGO_URI.replace('localhost', '127.0.0.1') : 'mongodb://127.0.0.1:27017/augeo-auction';
    console.log('Connecting to:', uri);
    await mongoose.connect(uri);
    console.log('Connected to DB');

    const auctions = await Auction.find({
      $or: [
        { coverImage: /1527281405159/ },
        { images: /1527281405159/ }
      ]
    });
    console.log('Auctions with ID:', auctions.map(a => a.title));

    const lots = await Lot.find({
      'images.url': /1527281405159/
    });
    console.log('Lots with ID:', lots.map(l => l.title));

    const categories = await Category.find({
      image: /1527281405159/
    });
    console.log('Categories with ID:', categories.map(c => c.name));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDB();
