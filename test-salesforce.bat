@echo off
REM Test script for Salesforce integration
REM Run this script to test the Salesforce API integration

echo 🧪 Testing Salesforce Integration...
echo.

REM Test Salesforce connection
echo 1. Testing Salesforce connection...
curl -X POST http://localhost:3000/api/subscription/test/salesforce-connection ^
  -H "Content-Type: application/json"
echo.
echo.

echo 2. Testing Salesforce payment status update...
curl -X POST http://localhost:3000/api/subscription/test/salesforce-update ^
  -H "Content-Type: application/json" ^
  -d "{\"quotepaymentId\": \"aAWdu0000004kvVGAQ\", \"amount\": 87.50, \"status\": true, \"transactionId\": \"8ac7a4a298502ef70198505a2b627bf6\"}"
echo.
echo.

echo 3. Testing failed payment status update...
curl -X POST http://localhost:3000/api/subscription/test/salesforce-update ^
  -H "Content-Type: application/json" ^
  -d "{\"quotepaymentId\": \"aAWdu0000004kvVGAQ\", \"amount\": 87.50, \"status\": false, \"transactionId\": \"8ac7a4a298502ef70198505a2b627bf6\"}"
echo.
echo.

echo 4. Testing token cache clear...
curl -X POST http://localhost:3000/api/subscription/test/salesforce-clear-cache ^
  -H "Content-Type: application/json"
echo.
echo.

echo ✅ All tests completed!
echo.
echo 💡 Check the server logs for detailed Salesforce API responses.
pause
