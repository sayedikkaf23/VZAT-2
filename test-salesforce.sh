#!/bin/bash

# Test script for Salesforce integration
# Run this script to test the Salesforce API integration

echo "🧪 Testing Salesforce Integration..."
echo ""

# Test Salesforce connection
echo "1. Testing Salesforce connection..."
curl -X POST http://localhost:3000/api/subscription/test/salesforce-connection \
  -H "Content-Type: application/json" \
  -w "\n\n"

echo "2. Testing Salesforce payment status update..."
curl -X PUT http://localhost:3000/api/subscription/test/salesforce-update \
  -H "Content-Type: application/json" \
  -d '{
    "quotepaymentId": "aAWdu0000004kvVGAQ",
    "amount": 87.50,
    "status": true,
    "transactionId": "8ac7a4a298502ef70198505a2b627bf6"
  }' \
  -w "\n\n"

echo "3. Testing failed payment status update..."
curl -X PUT http://localhost:3000/api/subscription/test/salesforce-update \
  -H "Content-Type: application/json" \
  -d '{
    "quotepaymentId": "aAWdu0000004kvVGAQ",
    "amount": 87.50,
    "status": false,
    "transactionId": "8ac7a4a298502ef70198505a2b627bf6"
  }' \
  -w "\n\n"

echo "4. Testing token cache clear..."
curl -X POST http://localhost:3000/api/subscription/test/salesforce-clear-cache \
  -H "Content-Type: application/json" \
  -w "\n\n"

echo "✅ All tests completed!"
echo ""
echo "💡 Check the server logs for detailed Salesforce API responses."
