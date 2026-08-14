import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: '.env.sandbox' });

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log('Collections:', collectionNames);

    // Let's search in all collections for the ID 'a9Xav000000FdSTEA0' or 'a9Xav000000FdST'
    const searchId = 'a9Xav000000FdSTEA0';
    console.log(`Searching for ID: ${searchId}...`);

    for (const colName of collectionNames) {
      const record = await db.collection(colName).findOne({
        $or: [
          { _id: searchId },
          { quotepaymentId: searchId },
          { OpportunityId: searchId },
          { QuoteId: searchId },
          { userEmailId: 'tyrone.pollastrini@virtuzone.com' },
          { opp_email: 'tyrone.pollastrini@virtuzone.com' },
          { contactEmail: 'tyrone.pollastrini@virtuzone.com' }
        ]
      });

      if (record) {
        console.log(`\n🎉 Found matching record in collection [${colName}]:`);
        console.log(JSON.stringify(record, null, 2));
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

run();
