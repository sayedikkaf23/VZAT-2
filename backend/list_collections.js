import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`📊 Found ${collections.length} collections:`);

    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`  - ${col.name}: ${count} documents`);
    }

  } catch (error) {
    console.error('❌ Error listing collections:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected');
  }
}

run();
