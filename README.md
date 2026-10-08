# Task Management REST API

A RESTful Task Management API built using Node.js, Express.js, and PostgreSQL.

## Features

- User registration and login
- Password hashing using bcrypt
- JWT authentication
- Protected profile endpoint
- Create, read, update, and delete tasks
- PostgreSQL JOIN queries
- Search and filtering
- Pagination and sorting
- Dashboard statistics
- Overdue task count
- Basic validation and error handling

## Technologies Used

- Node.js
- Express.js
- PostgreSQL
- pg
- bcryptjs
- jsonwebtoken
- dotenv
- Postman

## Project Setup

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd task-management-api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
DB_USER=your_postgres_username
DB_HOST=localhost
DB_NAME=your_database_name
DB_PASSWORD=your_postgres_password
DB_PORT=5432
JWT_SECRET=your_secret_key
```

Replace the example values with your own local PostgreSQL credentials.

### 4. Create the database

Create a PostgreSQL database and set up the `users`, `projects`, and `tasks` tables.

### 5. Start the server

```bash
node ./src/server.js
```

The API runs at:

`http://localhost:3000`

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Check API |
| GET | `/db-test` | Test database connection |
| POST | `/register` | Register user |
| POST | `/login` | Login |
| GET | `/profile` | Get authenticated user's profile |
| GET | `/tasks` | Get tasks |
| GET | `/tasks/:id` | Get one task |
| POST | `/tasks` | Create task |
| PUT | `/tasks/:id` | Update task |
| DELETE | `/tasks/:id` | Delete task |
| GET | `/dashboard` | Get task statistics |

## Search, Filtering, Pagination, and Sorting

Examples:

```text
GET /tasks?status=pending
GET /tasks?search=Login
GET /tasks?project_id=1
GET /tasks?page=1&limit=5
GET /tasks?sortBy=id&order=desc
GET /tasks?status=pending&page=1&limit=5&sortBy=due_date&order=asc
```

Supported sorting fields: `id`, `title`, `status`, and `due_date`.

## Authentication

Login to receive a JWT token. For the protected profile endpoint, use:

`Authorization: Bearer YOUR_TOKEN`

## Dashboard

The dashboard provides:

- Total tasks
- Completed tasks
- Pending tasks
- Overdue tasks

## Postman Collection

Import `Task Management API.postman_collection.json` into Postman to test the API endpoints.

## Security

Do not commit your `.env` file, database passwords, or JWT secrets.

## Author

Your Name
