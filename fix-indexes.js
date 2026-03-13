const mongoose = require("mongoose");
require("dotenv").config({ path: "/home/shivnilay/Downloads/augeo-backend/.env" });

async function fixIndexes() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI, { dbName: "test" });
    console.log("Connected.");
    
    const db = mongoose.connection.db;
    const watchlistsCollection = db.collection("watchlists");
    
    const indexes = await watchlistsCollection.indexes();
    console.log("Current indexes:", indexes.map(i => i.name));
    
    if (indexes.some(i => i.name === 'user_1_auction_1')) {
      console.log("Dropping user_1_auction_1...");
      await watchlistsCollection.dropIndex('user_1_auction_1');
    }
    
    if (indexes.some(i => i.name === 'user_1_lot_1')) {
      console.log("Dropping user_1_lot_1...");
      await watchlistsCollection.dropIndex('user_1_lot_1');
    }
    
    console.log("Indexes dropped. Mongoose will recreate them with partialFilterExpression if models are loaded.");
    // Force Mongoose to sync indexes based on the updated schema
    const Watchlist = require("./models/Watchlist");
    await Watchlist.syncIndexes();
    console.log("Synchronized new indexes:");
    const newIndexes = await watchlistsCollection.indexes();
    console.dir(newIndexes, { depth: null });

    console.log("Done.");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    mongoose.disconnect();
  }
}

fixIndexes();
