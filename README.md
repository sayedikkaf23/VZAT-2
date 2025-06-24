## Running the Backend

### Environment Setup

- Create two environment files in the backend folder:
  - `.env.sandbox` for sandbox/development
  - `.env.production` for production

Each file should contain your MongoDB connection string:
```
MONGODB_URI=your_mongodb_connection_string
```

### Starting the Server

- **Sandbox (default):**
  ```
  node app.js
  ```
- **Production:**
  ```
  NODE_ENV=production node app.js
  ```

The server will automatically use the correct MongoDB URI based on the environment.