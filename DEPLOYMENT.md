# Construction ERP - Deployment Guide

This guide explains how to deploy the Construction ERP system online with MongoDB Atlas.

## System Overview

The Construction ERP system includes:
- **Frontend**: React SPA with TypeScript, TailwindCSS, and modern UI components
- **Backend**: Express.js API server with RESTful endpoints
- **Database**: MongoDB Atlas (cloud database)
- **Authentication**: Role-based access control (Foreman, Site Incharge, Admin)

## Deployment Options

### Option 1: Quick Deploy with Builder.io (Recommended)

This project is already set up to work with Builder.io's deployment platform:

1. **Connect to Netlify or Vercel**: Click [Connect to Netlify](#open-mcp-popover) or [Connect to Vercel](#open-mcp-popover) in the MCP integrations
2. **Set Environment Variables**: Configure the following variables in your hosting platform:
   ```
   NODE_ENV=production
   MONGODB_URI=your-mongodb-atlas-connection-string
   JWT_SECRET=your-secure-jwt-secret
   ```
3. **Deploy**: Push your code and the platform will automatically build and deploy

### Option 2: Manual Deployment

#### Prerequisites

1. **MongoDB Atlas Account**: Create a free account at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. **Hosting Provider**: Choose from Netlify, Vercel, Railway, Render, or any Node.js hosting provider

#### Step 1: Set Up MongoDB Atlas

1. Create a new cluster in MongoDB Atlas
2. Create a database user with read/write permissions
3. Whitelist your application's IP addresses (or use 0.0.0.0/0 for all IPs during development)
4. Get your connection string (format: `mongodb+srv://username:password@cluster.mongodb.net/constructerp`)

#### Step 2: Configure Environment Variables

Create a `.env` file with:

```env
NODE_ENV=production
PORT=8080
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/constructerp
JWT_SECRET=your-super-secure-jwt-secret-here
```

#### Step 3: Install Dependencies and Build

```bash
# Install dependencies
pnpm install

# Build the application
pnpm build

# Start the production server
pnpm start
```

#### Step 4: Deploy to Your Hosting Provider

**For Netlify:**
- Connect your GitHub repository
- Set build command: `pnpm build`
- Set publish directory: `dist/spa`
- Add environment variables in Netlify dashboard

**For Vercel:**
- Connect your GitHub repository
- Vercel will auto-detect the Node.js project
- Add environment variables in Vercel dashboard

**For Railway/Render:**
- Connect your GitHub repository
- Set start command: `pnpm start`
- Add environment variables in platform dashboard

## Database Setup

### Using MongoDB Atlas (Recommended)

The application is configured to work with MongoDB Atlas out of the box:

1. **Install MongoDB Driver** (if using real MongoDB):
   ```bash
   pnpm add mongodb
   ```

2. **Uncomment MongoDB Code**: In `server/database/connection.ts`, uncomment the MongoDB sections and comment out the in-memory storage

3. **Create Database Collections**: The following collections will be automatically created:
   - `users` - User accounts and roles
   - `attendanceRecords` - Attendance submissions and approvals
   - `workers` - Worker information
   - `sites` - Construction site information

### Sample Data

The system includes demo data for testing:
- **Demo Foreman**: username: `demo_foreman`, password: `demo123`
- **Demo Site Incharge**: username: `demo_site_incharge`, password: `demo123`
- **Demo Admin**: username: `demo_admin`, password: `demo123`

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (production/development) | Yes |
| `PORT` | Server port (default: 8080) | No |
| `MONGODB_URI` | MongoDB Atlas connection string | Yes* |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |

*Currently using in-memory storage for demo. Set MONGODB_URI to use real database.

## Security Considerations

1. **Use Strong JWT Secret**: Generate a secure random string for JWT_SECRET
2. **Configure CORS**: Update CORS settings in `server/index.ts` for production domains
3. **Environment Variables**: Never commit .env files with real credentials
4. **Database Security**: Use MongoDB Atlas IP whitelisting and strong passwords

## Monitoring and Logs

1. **Error Tracking**: Consider integrating [Connect to Sentry](#open-mcp-popover) for error monitoring
2. **Logs**: Most hosting providers provide built-in logging
3. **Performance**: Monitor API response times and database queries

## Scaling Considerations

1. **Database**: MongoDB Atlas auto-scales based on usage
2. **Hosting**: Most platforms provide auto-scaling options
3. **Caching**: Consider Redis for session storage in high-traffic scenarios

## Support

For deployment issues:
- Check the hosting provider's documentation
- Review application logs for errors
- Ensure all environment variables are set correctly
- Verify MongoDB Atlas connection and permissions

## Development vs Production

**Development Mode:**
- Uses in-memory storage for demo purposes
- Hot reload enabled
- Single port for frontend and backend

**Production Mode:**
- Uses MongoDB Atlas for data persistence
- Optimized builds and static file serving
- Environment-based configuration
