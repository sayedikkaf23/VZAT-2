
// Environment configuration for different environments
const config = {
  development: {
    NODE_ENV: 'development',
    PORT: 3000,
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://annapahlevanyan_db_user:bT8gSpitN1AS6bLK@installments.3cbh6rx.mongodb.net/',
    
    // Frontend URL for redirects - using production URL for testing
    FRONTEND_URL: 'https://vzatnew.yeepeey.com',
    
    // AFS Payment Gateway Configuration (Production Environment)
    AFS_BASE_URL: 'https://eu-prod.oppwa.com',
    AFS_DOMAIN: 'https://eu-prod.oppwa.com',
    AFS_ENTITY_ID: process.env.AFS_ENTITY_ID,
    AFS_ACCESS_TOKEN: process.env.AFS_ACCESS_TOKEN,
    AFS_AUTHORIZATION: process.env.AFS_AUTHORIZATION ? `Bearer ${process.env.AFS_ACCESS_TOKEN}` : undefined,
    AFS_CURRENCY: 'AED',
    
    // Salesforce Configuration - Must be set via environment variables
    SALESFORCE_USERNAME: process.env.SALESFORCE_USERNAME,
    SALESFORCE_PASSWORD: process.env.SALESFORCE_PASSWORD,
    SALESFORCE_CLIENT_ID: process.env.SALESFORCE_CLIENT_ID,
    SALESFORCE_CLIENT_SECRET: process.env.SALESFORCE_CLIENT_SECRET,
    
    // Mailgun Configuration - Must be set via environment variables
    MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN || 'vz.ae',
    MAILGUN_API_KEY: process.env.MAILGUN_API_KEY,
  },
  
  production: {
    NODE_ENV: 'production',
    PORT: process.env.PORT || 3000,
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://annapahlevanyan_db_user:bT8gSpitN1AS6bLK@installments.3cbh6rx.mongodb.net/',
    
    // Frontend URL for redirects
    FRONTEND_URL: process.env.FRONTEND_URL || 'https://vzatnew.yeepeey.com',
    
    // AFS Payment Gateway Configuration (Production Environment)
    AFS_BASE_URL: process.env.AFS_BASE_URL || 'https://eu-prod.oppwa.com',
    AFS_DOMAIN: process.env.AFS_DOMAIN || 'https://eu-prod.oppwa.com',
    AFS_ENTITY_ID: process.env.AFS_ENTITY_ID,
    AFS_ACCESS_TOKEN: process.env.AFS_ACCESS_TOKEN,
    AFS_AUTHORIZATION: process.env.AFS_AUTHORIZATION ? `Bearer ${process.env.AFS_ACCESS_TOKEN}` : undefined,
    AFS_CURRENCY: process.env.AFS_CURRENCY || 'AED',
    
    // Salesforce Configuration - Must be set via environment variables
    SALESFORCE_USERNAME: process.env.SALESFORCE_USERNAME,
    SALESFORCE_PASSWORD: process.env.SALESFORCE_PASSWORD,
    SALESFORCE_CLIENT_ID: process.env.SALESFORCE_CLIENT_ID,
    SALESFORCE_CLIENT_SECRET: process.env.SALESFORCE_CLIENT_SECRET,
    
    // Mailgun Configuration - Must be set via environment variables
    MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN || 'vz.ae',
    MAILGUN_API_KEY: process.env.MAILGUN_API_KEY,
  }
};

// Get current environment or default to development
const currentEnv = process.env.NODE_ENV || 'development';

// Export the configuration for the current environment
export default config[currentEnv];

// Also set environment variables for backward compatibility
const envConfig = config[currentEnv];
Object.keys(envConfig).forEach(key => {
  if (!process.env[key]) {
    process.env[key] = envConfig[key];
  }
});

console.log(`🌍 Environment: ${currentEnv}`);
console.log(`🚀 Port: ${envConfig.PORT}`);
console.log(`💳 AFS Base URL: ${envConfig.AFS_BASE_URL}`);


