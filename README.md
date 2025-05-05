# Fleet Management System

A comprehensive fleet management system built with Node.js, Express, MongoDB, and EJS templates. This application helps manage truck loads, projects, users, and provides analytics for a logistics company.

![Fleet Management Dashboard](https://placeholder-image.com/dashboard.png)

## Features

- **User Authentication**: Secure login and role-based access control (Admin, Viewer, Loader)
- **Dashboard**: Overview of key metrics and recent loads
- **Load Management**: Create, edit, view, and delete truck loads
- **Project Management**: Manage projects and their association with loads
- **User Management**: Admin panel for managing system users
- **Loader Interface**: Dedicated interface for loading personnel to manage inventory and truck loads
- **Packing List Generation**: Generate and print packing lists for deliveries
- **Responsive Design**: Mobile-friendly interface
- **Data Validation**: Server-side validation for all data input

## Table of Contents


- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Local Development Setup](#local-development-setup)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Seed Initial Data](#seed-initial-data)
- [Deployment](#deployment)
  - [Deploying to Vercel](#deploying-to-vercel)
  - [MongoDB Atlas Setup](#mongodb-atlas-setup)
- [Project Guide](#project-guide)
  - [Project Structure](#project-structure)
  - [Key Components](#key-components)
  - [Authentication Flow](#authentication-flow)
  - [Role-Based Access](#role-based-access)
  - [User Interface](#user-interface)
- [Usage Guide](#usage-guide)
  - [Admin Role](#admin-role)
  - [Loader Role](#loader-role)
  - [Viewer Role](#viewer-role)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

## Prerequisites

- Node.js (v16.x or higher recommended)
- MongoDB (local or Atlas connection)
- npm or yarn
- Git

## Installation

### Local Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/fleet-management.git
   cd fleet-management
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory (see [Environment Variables](#environment-variables) section).

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Access the application:
   ```
   http://localhost:3000
   ```

### Environment Variables

Create a `.env` file in the root directory with the following content:

```
# Environment
NODE_ENV=development

# Server
PORT=3000

# MongoDB
MONGO_URI=mongodb://localhost:27017/fleet_management

# Session
SESSION_SECRET=your_session_secret_change_this_in_production

# Application
APP_NAME=Fleet Management System
COMPANY_NAME=Desa Systems
```

For production, make sure to change:
- `NODE_ENV` to `production`
- `MONGO_URI` to your production MongoDB connection string
- `SESSION_SECRET` to a strong random string

### Database Setup

#### Local MongoDB Setup:

1. Install MongoDB on your local machine if not already installed:
   - [MongoDB Installation Guide](https://docs.mongodb.com/manual/installation/)

2. Start MongoDB:
   ```bash
   mongod --dbpath /path/to/data/directory
   ```

3. The application will automatically create the necessary collections.

### Seed Initial Data

Run the database seeder to populate initial data:

```bash
npm run seed
```

This will create:
- Default admin user (username: `admin`, password: `admin123`)
- Sample projects
- Sample loads with truck and skid data

⚠️ **Important**: Change the default admin password after first login in production.

## Deployment

### Deploying to Vercel

1. Create a Vercel account if you don't have one:
   - [Vercel Signup](https://vercel.com/signup)

2. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

3. Login to Vercel:
   ```bash
   vercel login
   ```

4. Prepare for deployment by updating the `vercel.json` file:
   ```json
   {
     "version": 2,
     "builds": [
       { "src": "server.js", "use": "@vercel/node" }
     ],
     "routes": [
       { "src": "/(.*)", "dest": "server.js" }
     ],
     "env": {
       "NODE_ENV": "production"
     }
   }
   ```

5. Set up environment variables in Vercel:
   - Go to your Vercel dashboard
   - Select your project
   - Go to Settings > Environment Variables
   - Add all the required environment variables (as specified in [Environment Variables](#environment-variables))

6. Deploy to Vercel:
   ```bash
   vercel --prod
   ```

7. After deployment, Vercel will provide a URL to access your application.

### MongoDB Atlas Setup

For production deployment, use MongoDB Atlas:

1. Create a MongoDB Atlas account:
   - [MongoDB Atlas Signup](https://www.mongodb.com/cloud/atlas/register)

2. Create a new cluster.

3. Set up database access:
   - Create a database user with appropriate permissions
   - Whitelist your application's IP address or use `0.0.0.0/0` for unrestricted access (not recommended for high-security applications)

4. Get your connection string:
   - Go to Clusters > Connect > Connect Your Application
   - Copy the connection string
   - Replace `<password>` with your database user's password
   - Add this URI to your Vercel environment variables

5. Test the connection before full deployment.

## Project Guide

### Project Structure

```
fleet-management/
├── config/               # Configuration files
│   ├── database.js       # MongoDB connection
│   ├── auth.js           # Passport.js authentication
│   └── config.js         # General app configuration
├── controllers/          # Request handlers
│   ├── authController.js
│   ├── dashboardController.js
│   ├── loadController.js
│   ├── loaderController.js
│   ├── projectController.js
│   └── userController.js
├── middleware/           # Custom middleware
│   ├── auth.js           # Authentication middleware
│   └── validators.js     # Input validation
├── models/               # MongoDB schemas
│   ├── User.js
│   ├── Project.js
│   └── Load.js
├── public/               # Static assets
│   ├── css/
│   ├── js/
│   └── img/
├── routes/               # Express routes
│   ├── authRoutes.js
│   ├── dashboardRoutes.js
│   ├── loadRoutes.js
│   ├── loaderRoutes.js
│   ├── projectRoutes.js
│   └── userRoutes.js
├── utils/                # Utility functions
│   ├── errorHandler.js
│   ├── helpers.js
│   └── seeder.js
├── views/                # EJS templates
│   ├── admin/
│   ├── auth/
│   ├── dashboard/
│   ├── layouts/
│   ├── loader/
│   ├── partials/
│   └── ...
├── app.js                # Express app setup
├── server.js             # Server entry point
└── package.json          # Project dependencies
```

### Key Components

1. **Authentication System**: Uses Passport.js with local strategy for username/password authentication.

2. **Role-Based Access Control**: Three user roles with different permissions:
   - **Admin**: Full access to all features
   - **Loader**: Access to loader interface for inventory and truck load management
   - **Viewer**: Read-only access to the dashboard and reports

3. **Database Models**:
   - **User**: Stores user information and authentication details
   - **Project**: Manages project data including code, name, and status
   - **Load**: Complex model that stores truck information, skids, and packing lists

4. **Views**:
   - **Admin Dashboard**: For system administration
   - **Loader Interface**: Specialized interface for loading personnel
   - **Responsive Design**: Adapts to desktop and mobile devices

### Authentication Flow

1. User navigates to login page
2. User enters credentials
3. Passport.js authenticates user against the database
4. On successful authentication:
   - User session is created
   - Last login time is updated
   - User is redirected to the appropriate dashboard based on role
5. On failed authentication:
   - Error message is displayed
   - User remains on login page

### Role-Based Access

The system implements role-based access control through middleware:

```javascript
// Admin access
router.use('/users', ensureAuthenticated, ensureAdmin);

// Loader access
router.use('/loader', ensureAuthenticated, ensureLoader);

// Viewer access (read-only)
router.get('/dashboard', ensureAuthenticated);
```

### User Interface

The application has three main interfaces:

1. **Admin Interface**: Full access to all features
   - User management
   - Project management
   - Load management
   - System settings

2. **Loader Interface**: Specialized interface for loading personnel
   - Inventory management
   - Truck load entry
   - Packing list generation

3. **Viewer Interface**: Read-only dashboard
   - View loads
   - View projects
   - Generate reports

## Usage Guide

### Admin Role

Admins have full access to all features:

1. **User Management**:
   - Create, edit, and delete users
   - Assign roles and permissions
   - Reset passwords

2. **Project Management**:
   - Create, edit, and delete projects
   - Manage project status

3. **Load Management**:
   - Create, edit, and delete loads
   - View all load details
   - Generate reports

### Loader Role

Loaders have access to inventory and truck load management:

1. **Inventory Management**:
   - Add skids to inventory
   - Edit inventory skids
   - Delete inventory skids

2. **Truck Load Management**:
   - Enter truck information
   - Add skids to truck load
   - Generate packing lists
   - Track load status

### Viewer Role

Viewers have read-only access:

1. **Dashboard**:
   - View key metrics
   - View recent loads

2. **Reports**:
   - View load reports
   - View project reports

## API Documentation

The application provides several API endpoints for integration with other systems:

- **Authentication**: `/api/auth`
- **Projects**: `/api/projects`
- **Loads**: `/api/loads`
- **Users**: `/api/users`

Refer to the API documentation for detailed information on available endpoints and request/response formats.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

[MIT License](LICENSE)

---

© 2025 Desa Systems. All rights reserved.