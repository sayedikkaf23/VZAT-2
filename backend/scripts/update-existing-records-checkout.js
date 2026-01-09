/**
 * Script to update existing records with checkout_created_at and old_checkout_ids
 * This script updates records that have afs_checkout_id but are missing checkout_created_at
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

async function updateExistingRecords() {
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
    console.log('✅ Connected to MongoDB successfully\n');

    // Find all records with afs_checkout_id but missing checkout_created_at or old_checkout_ids
    const recordsToUpdate = await Vzat_Recurring_Data.find({
      afs_checkout_id: { $exists: true, $ne: null },
      $or: [
        { checkout_created_at: { $exists: false } },
        { checkout_created_at: null },
        { old_checkout_ids: { $exists: false } }
      ]
    });

    console.log(`📊 Found ${recordsToUpdate.length} records to update\n`);

    if (recordsToUpdate.length === 0) {
      console.log('✅ No records need updating. All records already have the required fields.');
      await mongoose.disconnect();
      process.exit(0);
    }

    let updatedCount = 0;
    let skippedCount = 0;

    for (const record of recordsToUpdate) {
      try {
        let checkoutCreatedAt;
        const updates = {};
        
        // Priority 1: Calculate from payment_link_expiry (30 minutes before)
        if (record.payment_link_expiry) {
          checkoutCreatedAt = new Date(record.payment_link_expiry.getTime() - 30 * 60 * 1000);
          console.log(`📅 Record ${record._id}: Using payment_link_expiry - 30 minutes`);
        }
        // Priority 2: Use subscription_created_date
        else if (record.subscription_created_date) {
          checkoutCreatedAt = new Date(record.subscription_created_date);
          console.log(`📅 Record ${record._id}: Using subscription_created_date`);
        }
        // Priority 3: Use CreatedDate field (parse the string date)
        else if (record.CreatedDate) {
          checkoutCreatedAt = new Date(record.CreatedDate);
          console.log(`📅 Record ${record._id}: Using CreatedDate`);
        }
        // Priority 4: Fallback to current date minus 30 minutes (assume it was created recently)
        else {
          checkoutCreatedAt = new Date(Date.now() - 30 * 60 * 1000);
          console.log(`📅 Record ${record._id}: Using fallback (current time - 30 minutes)`);
        }
        
        // Set checkout_created_at if it doesn't exist or is null
        if (!record.checkout_created_at) {
          updates.checkout_created_at = checkoutCreatedAt;
        }
        
        // Initialize old_checkout_ids if it doesn't exist
        if (!record.old_checkout_ids || !Array.isArray(record.old_checkout_ids)) {
          updates.old_checkout_ids = [];
        }
        
        // Only update if there are changes to make
        if (Object.keys(updates).length > 0) {
          await Vzat_Recurring_Data.findByIdAndUpdate(
            record._id,
            { $set: updates },
            { new: true }
          );

          updatedCount++;
          console.log(`✅ Updated record ${record._id}`);
          console.log(`   - quotepaymentId: ${record.quotepaymentId}`);
          console.log(`   - afs_checkout_id: ${record.afs_checkout_id}`);
          console.log(`   - checkout_created_at: ${checkoutCreatedAt.toISOString()}`);
          console.log(`   - old_checkout_ids: ${updates.old_checkout_ids ? 'initialized' : 'already exists'}\n`);
        } else {
          console.log(`⏭️  Record ${record._id} already has all required fields\n`);
        }
      } catch (error) {
        console.error(`❌ Error updating record ${record._id}:`, error.message);
        skippedCount++;
      }
    }

    console.log('\n📊 Update Summary:');
    console.log(`   ✅ Updated: ${updatedCount} records`);
    console.log(`   ⚠️  Skipped: ${skippedCount} records`);
    console.log(`   📋 Total processed: ${recordsToUpdate.length} records`);

  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  } finally {
    // Close MongoDB connection
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the update
updateExistingRecords();
