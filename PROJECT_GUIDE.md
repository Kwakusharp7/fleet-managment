# Fleet Management System - Project Guide

This guide provides a detailed overview of the Fleet Management System architecture, key components, and customization options. It's intended for developers who need to understand, maintain, or extend the application.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Design Patterns](#design-patterns)
- [Database Schema](#database-schema)
- [Authentication & Authorization](#authentication--authorization)
- [User Interface](#user-interface)
- [Controller Logic](#controller-logic)
- [API Endpoints](#api-endpoints)
- [Error Handling](#error-handling)
- [Customization Guide](#customization-guide)
- [Common Issues & Solutions](#common-issues--solutions)
- [Performance Considerations](#performance-considerations)
- [Security Best Practices](#security-best-practices)

## Architecture Overview

The Fleet Management System follows a traditional Model-View-Controller (MVC) architecture:

- **Models**: MongoDB schemas defining the data structure
- **Views**: EJS templates rendering the user interface
- **Controllers**: JavaScript functions handling business logic

The application uses:

- **Express.js**: Web framework
- **MongoDB**: Database
- **Passport.js**: Authentication
- **EJS**: Templating engine
- **Bootstrap**: CSS framework (customized)

### System Components

![Architecture Diagram](https://placeholder-image.com/architecture.png)

1. **Web Server Layer**: Express.js handling HTTP requests
2. **Authentication Layer**: Passport.js providing authentication
3. **Business Logic Layer**: Controllers implementing application logic
4. **Data Access Layer**: Mongoose models interfacing with MongoDB
5. **Presentation Layer**: EJS templates rendering the UI

## Design Patterns

The application uses several common design patterns:

1. **Singleton Pattern**: Database connection
2. **Factory Pattern**: Error handling
3. **Middleware Pattern**: Authentication and validation
4. **Repository Pattern**: Data access abstraction
5. **Observer Pattern**: Event handling

### Example: Middleware Pattern

```javascript
// Authentication middleware
exports.ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error_msg', 'Please log in to access this page');
  res.redirect('/login');
};

// Role-based middleware
exports.ensureAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'Admin') {
    return next();
  }
  req.flash('error_msg', 'You must have admin privileges to access this page');
  res.redirect('/dashboard');
};
```

## Database Schema

### User Schema

```javascript
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  role: {
    type: String,
    enum: ['Admin', 'Viewer', 'Loader'],
    default: 'Viewer'
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  lastLogin: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});
```

### Project Schema

```javascript
const ProjectSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Project code is required'],
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  address: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});
```

### Load Schema

```javascript
const LoadSchema = new mongoose.Schema({
  truckId: {
    type: String,
    required: [true, 'Truck ID is required'],
    trim: true
  },
  projectCode: {
    type: String,
    required: [true, 'Project code is required'],
    trim: true,
    ref: 'Project'
  },
  dateEntered: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Planned', 'Loaded', 'Delivered'],
    default: 'Planned'
  },
  truckInfo: {
    type: TruckInfoSchema,
    required: [true, 'Truck information is required']
  },
  skids: {
    type: [SkidSchema],
    default: []
  },
  packingList: {
    type: PackingListSchema,
    default: {}
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  }
});
```

## Authentication & Authorization

### Authentication Flow

1. **Login Request**: User submits username and password
2. **Verification**: Passport.js verifies credentials against database
3. **Session Creation**: On success, a session is created
4. **Authorization**: User is granted access based on role

### Authorization Middleware

The application uses role-based middleware:

```javascript
// routes/projectRoutes.js
router.get('/', ensureAuthenticated, projectController.getProjects);
router.post('/', ensureAuthenticated, ensureAdmin, projectController.createProject);
```

### Session Management

Sessions are stored in MongoDB:

```javascript
app.use(session({
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: config.db.uri,
    ttl: 14 * 24 * 60 * 60 // 14 days
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: config.session.duration
  }
}));
```

## User Interface

### Layout Structure

The application uses three main layouts:

1. **Main Layout**: Admin and viewer interfaces
2. **Loader Layout**: Specialized interface for loading personnel
3. **Auth Layout**: Login and registration pages

### Components

Key UI components include:

- **Sidebar Navigation**: Quick access to main sections
- **Data Tables**: Display and manage data
- **Forms**: Input and validation
- **Modal Dialogs**: Confirmation and quick edits
- **Status Badges**: Visual indicators for status

### Responsive Design

The UI adapts to different screen sizes:

```css
@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    height: auto;
    position: relative;
  }
  
  .main-content {
    margin-left: 0;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
```

## Controller Logic

### Controller Structure

Each controller follows a similar pattern:

1. **Input Validation**: Validate request data
2. **Database Operation**: Perform CRUD operations
3. **Response Formatting**: Format and send response
4. **Error Handling**: Catch and handle errors

### Example Controller Function

```javascript
// Get all projects
exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find().sort({ code: 1 });
    
    res.render('project/index', {
      title: 'Project Management',
      projects
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error retrieving projects');
    res.redirect('/dashboard');
  }
};
```

## API Endpoints

The application provides RESTful API endpoints:

### Authentication

- `POST /api/auth/login`: Authenticate user
- `GET /api/auth/logout`: Log out user

### Projects

- `GET /api/projects`: Get all projects
- `POST /api/projects`: Create a project
- `GET /api/projects/:id`: Get project by ID
- `PUT /api/projects/:id`: Update project
- `DELETE /api/projects/:id`: Delete project

### Loads

- `GET /api/loads`: Get all loads
- `POST /api/loads`: Create a load
- `GET /api/loads/:id`: Get load by ID
- `PUT /api/loads/:id`: Update load
- `DELETE /api/loads/:id`: Delete load

## Error Handling

The application uses a centralized error handling system:

```javascript
// Global error handler middleware
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  
  if (process.env.NODE_ENV === 'development') {
    handleDevError(err, req, res);
  } else {
    handleProdError(err, req, res);
  }
};

// Not found handler
const notFoundHandler = (req, res, next) => {
  const err = new AppError(`Can't find ${req.originalUrl} on this server!`, 404);
  next(err);
};
```

## Customization Guide

### Adding a New Role

1. Update the User schema:
   ```javascript
   role: {
     type: String,
     enum: ['Admin', 'Viewer', 'Loader', 'NewRole'],
     default: 'Viewer'
   }
   ```

2. Create a new middleware function:
   ```javascript
   exports.ensureNewRole = (req, res, next) => {
     if (req.isAuthenticated() && req.user.role === 'NewRole') {
       return next();
     }
     req.flash('error_msg', 'Unauthorized');
     res.redirect('/dashboard');
   };
   ```

3. Create new routes and views for the role.

### Adding a New Feature

1. Define the data model (if needed)
2. Create controller functions
3. Add routes
4. Create view templates
5. Update navigation

### Customizing the UI

The application uses custom CSS with variables:

```css
:root {
  --primary-blue: #0056b3;
  --secondary-blue: #007bff;
  --light-gray: #f8f9fa;
  --medium-gray: #e9ecef;
  --dark-gray: #343a40;
  /* ... */
}
```

To change the theme:
1. Update the CSS variables
2. Customize the layout templates
3. Modify component styles

## Common Issues & Solutions

### Authentication Issues

**Issue**: User cannot log in despite correct credentials.
**Solution**: Check that the user status is 'Active' and the password hash is correct.

### Database Connection

**Issue**: Application fails to connect to MongoDB.
**Solution**: Verify that the MongoDB connection string is correct and the database server is running.

### Session Expiry

**Issue**: Users are frequently logged out.
**Solution**: Increase the session TTL in the session configuration.

## Performance Considerations

### Database Indexing

The application uses indexes for frequently queried fields:

```javascript
ProjectSchema.index({ code: 'text', name: 'text' });
LoadSchema.index({ truckId: 'text' });
```

### Query Optimization

Complex queries are optimized using MongoDB aggregation:

```javascript
const inventorySkids = await Load.aggregate([
  { $match: { projectCode: projectId, status: 'Planned' } },
  { $unwind: '$skids' },
  { $match: { 'skids.isInventory': true } },
  { $project: {
      _id: 0,
      skidId: '$skids.id',
      width: '$skids.width',
      length: '$skids.length',
      weight: '$skids.weight',
      description: '$skids.description'
    }
  },
  { $sort: { skidId: 1 } }
]);
```

### Caching

Consider implementing caching for frequently accessed data:

```javascript
const cache = require('memory-cache');

// Cache the projects list
const getProjects = async () => {
  const cachedProjects = cache.get('projects');
  if (cachedProjects) {
    return cachedProjects;
  }
  
  const projects = await Project.find().sort({ code: 1 });
  cache.put('projects', projects, 60 * 1000); // Cache for 1 minute
  return projects;
};
```

## Security Best Practices

### Password Hashing

Passwords are hashed using bcrypt:

```javascript
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
```

### Input Validation

All user input is validated using express-validator:

```javascript
exports.validateProject = [
  check('code')
    .notEmpty().withMessage('Project code is required')
    .trim()
    .escape()
    .isLength({ max: 20 }).withMessage('Project code cannot exceed 20 characters'),
  
  check('name')
    .notEmpty().withMessage('Project name is required')
    .trim()
    .escape()
    .isLength({ max: 100 }).withMessage('Project name cannot exceed 100 characters')
];
```

### HTTP Security Headers

Security headers are set using Helmet.js:

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "code.jquery.com", "cdn.jsdelivr.net", "cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "cdnjs.cloudflare.com"],
    },
  },
}));
```

### CSRF Protection

Consider adding CSRF protection:

```javascript
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

app.use(csrfProtection);
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});
```

---

This guide provides a comprehensive overview of the Fleet Management System architecture and components. For specific implementation details, refer to the codebase and inline documentation.