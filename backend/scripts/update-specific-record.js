/**
 * Script to update a specific record by _id
 * Usage: node update-specific-record.js <record_id>
 * Example: node update-specific-record.js 695f59c7ba8474ae1aa5f0b0
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';
import Vzat_Recurring_Data from "../model/VzatRecurringDataModel.js";

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.sandbox';
const envPath = path.resolve(__dirname, '..', envFile);
dotenv.config({ path: envPath });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function updateSpecificRecord(recordId) {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI is not defined in environment variables');
      process.exit(1);
    }
    
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB successfully\n');

    // Find the specific record - try by _id first, then by quotepaymentId, then by afs_checkout_id
    let record = null;
    
    // Try to find by _id (handle both string and ObjectId)
    if (mongoose.Types.ObjectId.isValid(recordId)) {
      try {
        record = await Vzat_Recurring_Data.findById(recordId);
        if (record) {
          console.log(`✅ Found record by _id`);
        }
      } catch (error) {
        console.log(`⚠️  _id lookup failed: ${error.message}`);
      }
    }
    
    // If not found by _id, try by quotepaymentId
    if (!record) {
      record = await Vzat_Recurring_Data.findOne({ quotepaymentId: recordId });
      if (record) {
        console.log(`✅ Found record by quotepaymentId`);
      }
    }
    
    // If still not found, try by afs_checkout_id
    if (!record) {
      record = await Vzat_Recurring_Data.findOne({ afs_checkout_id: recordId });
      if (record) {
        console.log(`✅ Found record by afs_checkout_id`);
      }
    }
    
    if (!record) {
      console.error(`\n❌ Record not found with:`);
      console.error(`   - _id: ${recordId}`);
      console.error(`   - quotepaymentId: ${recordId}`);
      console.error(`   - afs_checkout_id: ${recordId}`);
      console.error(`\n💡 Checking available records...`);
      
      // List a few sample records to help user
      const sampleRecords = await Vzat_Recurring_Data.find({}).limit(5).select('_id quotepaymentId afs_checkout_id');
      if (sampleRecords.length > 0) {
        console.error(`\n📋 Sample records in database:`);
        sampleRecords.forEach((r, i) => {
          console.error(`   ${i + 1}. _id: ${r._id}, quotepaymentId: ${r.quotepaymentId}, afs_checkout_id: ${r.afs_checkout_id || 'N/A'}`);
        });
      }
      
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`📋 Found record:`);
    console.log(`   - _id: ${record._id}`);
    console.log(`   - quotepaymentId: ${record.quotepaymentId}`);
    console.log(`   - afs_checkout_id: ${record.afs_checkout_id}`);
    console.log(`   - payment_link_expiry: ${record.payment_link_expiry}`);
    console.log(`   - Current checkout_created_at: ${record.checkout_created_at || 'MISSING'}`);
    console.log(`   - Current old_checkout_ids: ${record.old_checkout_ids ? 'EXISTS' : 'MISSING'}\n`);

    const updates = {};
    
    // Calculate checkout_created_at from payment_link_expiry (30 minutes before)
    if (!record.checkout_created_at && record.payment_link_expiry) {
      const checkoutCreatedAt = new Date(record.payment_link_expiry.getTime() - 30 * 60 * 1000);
      updates.checkout_created_at = checkoutCreatedAt;
      console.log(`📅 Will set checkout_created_at to: ${checkoutCreatedAt.toISOString()}`);
    } else if (!record.checkout_created_at) {
      // Fallback to subscription_created_date or current time
      const fallbackDate = record.subscription_created_date || new Date();
      updates.checkout_created_at = new Date(fallbackDate);
      console.log(`📅 Will set checkout_created_at to (fallback): ${updates.checkout_created_at.toISOString()}`);
    }
    
    // Initialize old_checkout_ids if missing
    if (!record.old_checkout_ids || !Array.isArray(record.old_checkout_ids)) {
      updates.old_checkout_ids = [];
      console.log(`📝 Will initialize old_checkout_ids as empty array`);
    }
    
    if (Object.keys(updates).length === 0) {
      console.log('✅ Record already has all required fields. No update needed.');
      await mongoose.disconnect();
      process.exit(0);
    }
    
    // Update the record
    const updatedRecord = await Vzat_Recurring_Data.findByIdAndUpdate(
      record._id,
      { $set: updates },
      { new: true }
    );
    
    console.log('\n✅ Record updated successfully!');
    console.log(`   - checkout_created_at: ${updatedRecord.checkout_created_at?.toISOString()}`);
    console.log(`   - old_checkout_ids: ${JSON.stringify(updatedRecord.old_checkout_ids)}`);
    
  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Get record ID from command line argument
const recordId = "695f59c7ba8474ae1aa5f0b0";

if (!recordId) {
  console.error('❌ Please provide a record _id as argument');
  console.error('Usage: node update-specific-record.js <record_id>');
  console.error('Example: node update-specific-record.js 695f59c7ba8474ae1aa5f0b0');
  process.exit(1);
}

updateSpecificRecord(recordId);
