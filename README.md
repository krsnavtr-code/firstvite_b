# Learning Management System (LMS) Backend

This is the backend for a Learning Management System (LMS) built with Node.js, Express, and MongoDB.

## Features

- User authentication (register/login)
- Role-based access control (Admin, Teacher, Student)
- Admin approval system for new users
- Course management
- User management
- File uploads

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MongoDB Atlas or local MongoDB instance

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=4002
   NODE_ENV=development
   MongoDBURI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRES_IN=90d
   JWT_COOKIE_EXPIRES_IN=90
   ```

## Running the Application

1. Start the development server:
   ```bash
   npm run dev
   ```
2. The server will be running at `http://localhost:4002`

## Setting Up Admin User

To create the initial admin user, run:
```bash
npm run setup:admin
```

This will create an admin user with the following credentials:
- Email: admin@lms.com
- Password: admin123

## API Documentation

### Authentication
- `POST /api/auth/register` - Register a new user (requires admin approval)
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get current user profile (protected)

### Admin Routes (requires admin role)
- `GET /api/admin/users` - Get all users
- `GET /api/admin/pending-users` - Get all pending users
- `PATCH /api/admin/approve-user/:id` - Approve a user
- `DELETE /api/admin/reject-user/:id` - Reject a user

## Environment Variables

- `PORT` - Port to run the server on (default: 4002)
- `NODE_ENV` - Environment (development/production)
- `MongoDBURI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT token generation
- `JWT_EXPIRES_IN` - JWT token expiration time
- `JWT_COOKIE_EXPIRES_IN` - JWT cookie expiration time in days
