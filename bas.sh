# Create directory structure
mkdir -p config controllers models middleware public/{css,js,img} routes utils views/{partials,layouts,auth,admin,load,project,user,dashboard}

# Create main application files
touch server.js app.js .env .gitignore

# Create config files
touch config/database.js config/auth.js config/config.js

# Create controllers
touch controllers/authController.js controllers/dashboardController.js controllers/loadController.js controllers/projectController.js controllers/userController.js

# Create models
touch models/User.js models/Project.js models/Load.js

# Create middleware
touch middleware/auth.js middleware/validators.js

# Create routes
touch routes/authRoutes.js routes/dashboardRoutes.js routes/loadRoutes.js routes/projectRoutes.js routes/userRoutes.js

# Create utils
touch utils/errorHandler.js utils/helpers.js utils/seeder.js

# Create CSS
touch public/css/style.css

# Create view files
touch views/layouts/main.ejs views/layouts/auth.ejs
touch views/partials/sidebar.ejs views/partials/messages.ejs
touch views/auth/login.ejs views/auth/register.ejs
touch views/dashboard/index.ejs
touch views/load/index.ejs views/load/create.ejs views/load/edit.ejs views/load/view.ejs views/load/packing-list.ejs
touch views/project/index.ejs views/project/create.ejs views/project/edit.ejs
touch views/user/index.ejs views/user/create.ejs views/user/edit.ejs
touch views/error.ejs views/index.ejs

# Create package.json
touch package.json

# Create readme
touch README.md