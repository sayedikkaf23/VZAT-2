// Environment configuration for different environments
const config = {
  development: {
    NODE_ENV: 'development',
    PORT: 3000,
    MONGODB_URI: 'mongodb+srv://saaral-naveen_31:Saaral%403112025@sneha.1kspldn.mongodb.net/vzat_sandbox',
    
    // Frontend URL for redirects - using production URL for testing
    FRONTEND_URL: 'https://vzatnew.yeepeey.com',
    
    // AFS Payment Gateway Configuration (Test Environment) - Registration specific
    AFS_BASE_URL: 'https://eu-test.oppwa.com',
    AFS_ENTITY_ID: '8ac7a4c797e1beca0197e482a8200127', // Registration-specific entity ID
    AFS_AUTHORIZATION: 'Bearer OGFjN2E0Yzk3ZDhkNDViZTAxN2Q4ZTk2Mzk3NjAyMGV8R3hQS0gyNjY5dA***REMOVED***', // Using production token for testing
    
    // External API Screening Configuration
    EXTERNAL_API_SCREENING_URL: 'https://saasuat.digiveri5.com:5040',
    SCREENING_USERNAME: 'VirtuUAT',
    SCREENING_PASSWORD: 'VirtuApiuat@123',
    SCREENING_COMPANYNAME: 'Virtuzone',
  },
  
  production: {
    NODE_ENV: 'production',
    PORT: process.env.PORT || 3000,
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://saaral-naveen_31:Saaral%403112025@sneha.1kspldn.mongodb.net/vzat_sandbox',
    
    // Frontend URL for redirects
    FRONTEND_URL: process.env.FRONTEND_URL || 'https://vzatnew.yeepeey.com',
    
    // AFS Payment Gateway Configuration (Production Environment)
    AFS_BASE_URL: process.env.AFS_BASE_URL || 'https://eu-test.oppwa.com',
    AFS_ENTITY_ID: process.env.AFS_ENTITY_ID || '8ac7a4c97d8d45be017d8e96389e020a',
    AFS_AUTHORIZATION: process.env.AFS_AUTHORIZATION || 'Bearer OGFjN2E0Yzk3ZDhkNDViZTAxN2Q4ZTk2Mzk3NjAyMGV8R3hQS0gyNjY5dA***REMOVED***',
    
    // External API Screening Configuration
    EXTERNAL_API_SCREENING_URL: process.env.EXTERNAL_API_SCREENING_URL || 'https://saasuat.digiveri5.com:5040',
    SCREENING_USERNAME: process.env.SCREENING_USERNAME || 'VirtuUAT',
    SCREENING_PASSWORD: process.env.SCREENING_PASSWORD || 'VirtuApiuat@123',
    SCREENING_COMPANYNAME: process.env.SCREENING_COMPANYNAME || 'Virtuzone',
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