/**
 * Migration script to update existing records with missing checkout_created_at
 * This script sets checkout_created_at based on subscription_created_date for old records
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';
import Vzat_Recurring_Data from "../model/VzatRecurringDataModel.js";

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables - use same pattern as db.js
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.sandbox';
const envPath = path.resolve(__dirname, '..', envFile);
dotenv.config({ path: envPath });

// Also try loading .env as fallback
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Log which env file is being used
console.log(`📁 Loading environment from: ${envPath}`);
console.log(`🔑 MONGODB_URI exists: ${!!process.env.MONGODB_URI}`);

async function updateCheckoutCreatedAt() {
  try {
    // Check if MONGODB_URI is available
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI is not defined in environment variables');
      console.error('   Please ensure you have a .env.sandbox or .env.production file in the backend directory');
      process.exit(1);
    }
    
    // Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB successfully');

    // Find all records with afs_checkout_id but missing checkout_created_at
    const recordsToUpdate = await Vzat_Recurring_Data.find({
      afs_checkout_id: { $exists: true, $ne: null },
      $or: [
        { checkout_created_at: { $exists: false } },
        { checkout_created_at: null }
      ]
    });

    console.log(`📊 Found ${recordsToUpdate.length} records to update`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const record of recordsToUpdate) {
      try {
        // Use subscription_created_date as fallback, or current date if that's also missing
        const fallbackDate = record.subscription_created_date || record.createdAt || new Date();
        
        await Vzat_Recurring_Data.findByIdAndUpdate(
          record._id,
          { 
            $set: { 
              checkout_created_at: new Date(fallbackDate)
            } 
          }
        );

        updatedCount++;
        console.log(`✅ Updated record ${record._id} (quotepaymentId: ${record.quotepaymentId})`);
      } catch (error) {
        console.error(`❌ Error updating record ${record._id}:`, error.message);
        skippedCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Updated: ${updatedCount} records`);
    console.log(`   ⚠️  Skipped: ${skippedCount} records`);
    console.log(`   📋 Total processed: ${recordsToUpdate.length} records`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the migration
updateCheckoutCreatedAt();
