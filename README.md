# HRMS NestJS Backend

A modern Human Resource Management System backend built with NestJS, Prisma, and PostgreSQL.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control (Admin/Employee)
- **Employee Management**: Complete CRUD operations for employee data
- **Attendance System**: Check-in/out with automatic work hours calculation and status assignment
- **Leave Management**: Leave application, approval/rejection workflow with balance tracking
- **Salary Calculation**: Automated salary calculation based on attendance with deductions
- **Dashboard Analytics**: Comprehensive dashboards for both admin and employee views
- **API Documentation**: Auto-generated Swagger documentation

## Tech Stack

- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with Passport
- **Validation**: class-validator and class-transformer
- **Documentation**: Swagger/OpenAPI
- **Environment**: dotenv for configuration

## Business Logic

### Attendance System
- **Work Hours**: Calculated as CheckOut - CheckIn time
- **Status Assignment**:
  - Present: ≥4 hours
  - Half-Day: 2-4 hours
  - Absent: <2 hours
- **Attendance Percentage**: (Present Days + 0.5 × Half Days) / Working Days × 100

### Leave Management
- **Leave Balance**: Starts at 5 days per employee
- **Paid/Unpaid Logic**: Automatically calculated based on available balance
- **Approval Workflow**: Admin approval required with rejection reasons

### Salary Calculation
- **Base Calculation**: Monthly salary / Working days in month
- **Deductions**: Full day deduction for absent days, half day deduction for half days
- **Final Salary**: Base Salary - Deductions

## Installation

1. **Clone and navigate to the project**:
   ```bash
   cd nestjs-backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   Update the `.env` file with your database credentials and JWT secret.

4. **Set up PostgreSQL database**:
   - Create a PostgreSQL database
   - Update the `DATABASE_URL` in your `.env` file

5. **Generate Prisma client and run migrations**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

6. **Seed the database (optional)**:
   ```bash
   npx prisma db seed
   ```

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/hrms_db?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRE="7d"

# Application
PORT=5000
NODE_ENV="development"

# CORS
CORS_ORIGIN="http://localhost:3000"
```

## Running the Application

### Development
```bash
npm run start:dev
```

### Production
```bash
npm run build
npm run start:prod
```

The application will be available at:
- **API**: http://localhost:5000
- **Swagger Documentation**: http://localhost:5000/api/docs

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get current user profile

### Users (Admin only)
- `GET /api/users` - Get all users with pagination and filters
- `POST /api/users` - Create new user
- `GET /api/users/:id` - Get user by ID
- `PATCH /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user
- `GET /api/users/departments` - Get all departments

### Attendance
- `POST /api/attendance/check-in` - Check in for today
- `POST /api/attendance/check-out` - Check out for today
- `GET /api/attendance/today` - Get today's attendance
- `GET /api/attendance/history` - Get attendance history
- `GET /api/attendance/summary/:month/:year` - Get attendance summary
- `GET /api/attendance/all` - Get all attendance records (Admin only)

### Leaves
- `POST /api/leaves` - Apply for leave
- `GET /api/leaves` - Get leaves (filtered by role)
- `GET /api/leaves/balance` - Get leave balance
- `GET /api/leaves/:id` - Get leave by ID
- `PATCH /api/leaves/:id/approve` - Approve/reject leave (Admin only)
- `DELETE /api/leaves/:id` - Cancel leave request

### Salary
- `POST /api/salary/calculate/:userId` - Calculate salary for user (Admin only)
- `POST /api/salary/calculate-bulk` - Bulk salary calculation (Admin only)
- `GET /api/salary` - Get salary records (filtered by role)
- `GET /api/salary/summary` - Get salary summary (Admin only)
- `GET /api/salary/my-history` - Get current user salary history
- `GET /api/salary/:id` - Get salary record by ID

### Dashboard
- `GET /api/dashboard/admin` - Admin dashboard data (Admin only)
- `GET /api/dashboard/employee` - Employee dashboard data
- `GET /api/dashboard/departments` - Department statistics (Admin only)

## Database Schema

The application uses the following main entities:

- **User**: Employee information with role-based access
- **Attendance**: Daily attendance records with work hours and status
- **Leave**: Leave applications with approval workflow
- **Salary**: Monthly salary calculations based on attendance

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Admin and Employee roles with different permissions
- **Password Hashing**: bcryptjs for secure password storage
- **Input Validation**: Comprehensive validation using class-validator
- **CORS Configuration**: Configurable cross-origin resource sharing

## Development

### Database Operations
```bash
# Generate Prisma client
npx prisma generate

# Push schema changes to database
npx prisma db push

# View database in Prisma Studio
npx prisma studio

# Reset database
npx prisma db push --force-reset
```

### Code Quality
```bash
# Lint code
npm run lint

# Format code
npm run format

# Run tests
npm run test
```

## Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Set production environment variables**
3. **Run database migrations**
4. **Start the application**:
   ```bash
   npm run start:prod
   ```

## API Documentation

Once the application is running, visit http://localhost:5000/api/docs to access the interactive Swagger documentation where you can:

- View all available endpoints
- Test API calls directly from the browser
- See request/response schemas
- Understand authentication requirements

## Support

For issues and questions, please refer to the API documentation or check the application logs for detailed error messages.
