## Environment Configuration

### Backend `.env`

Create `.env.sandbox` for development and `.env.production` for production. Required keys:

```
MONGODB_URI=mongodb+srv://...
FRONTEND_URL=http://localhost:4200
BACKEND_URL=http://localhost:3000

# AFS
AFS_BASE_URL=https://...afs...
AFS_ENTITY_ID=...
AFS_AUTHORIZATION=Bearer ...
```

Optional:
- `PORT` (default 3000)

### Frontend environments

`frontend/src/environments/environment.ts`:

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000'
};
```

`frontend/src/environments/environment.prod.ts`:

```ts
export const environment = {
  production: true,
  apiUrl: 'https://<backend-host>'
};
```

Ensure CORS in `backend/app.js` allows your frontend origin.


