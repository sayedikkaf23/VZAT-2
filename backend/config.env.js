// Environment configuration for MongoDB and API URLs
module.exports = {
  sandbox: {
    mongoURI: 'mongodb://localhost:27017/vzat_sandbox',
    apiUrl: 'http://localhost:3000/api'
  },
  production: {
    mongoURI: 'mongodb://localhost:27017/vzat_prod',
    apiUrl: 'https://your-production-domain.com/api'
  }
};
