const express = require("express");
const pool = require("./db/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authenticateToken = require("./middleware/authMiddleware");

const app = express();

const PORT = 3000;

// JSON data receive karne ke liye
app.use(express.json());


// ==========================================
// HOME ROUTE
// ==========================================

app.get("/", (req, res) => {
  res.json({
    message: "Task Management API is working!"
  });
});


// ==========================================
// DATABASE TEST
// ==========================================

app.get("/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      message: "Database connected successfully!",
      time: result.rows[0].now
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Database connection failed"
    });
  }
});


// ==========================================
// REGISTER
// ==========================================

app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required"
      });
    }

    // Check existing email
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "Email already registered"
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      `
      INSERT INTO users (name, email, password)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, created_at;
      `,
      [name, email, hashedPassword]
    );

    res.status(201).json({
      message: "User registered successfully",
      user: result.rows[0]
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to register user"
    });
  }
});


// ==========================================
// LOGIN
// ==========================================

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    // Find user
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const user = result.rows[0];

    // Check password
    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h"
      }
    );

    res.json({
      message: "Login successful",
      token: token
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Login failed"
    });
  }
});


// ==========================================
// PROTECTED PROFILE
// ==========================================

app.get("/profile", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id, name, email, created_at
      FROM users
      WHERE id = $1
      `,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json({
      message: "Protected route accessed successfully",
      user: result.rows[0]
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch profile"
    });
  }
});
// ==========================================
// DASHBOARD
// ==========================================

app.get("/dashboard", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) AS total_tasks,
        COUNT(*) FILTER (
          WHERE status = 'completed'
        ) AS completed_tasks,
        COUNT(*) FILTER (
          WHERE status = 'pending'
        ) AS pending_tasks,
        COUNT(*) FILTER (
          WHERE due_date < CURRENT_DATE
          AND status != 'completed'
        ) AS overdue_tasks
      FROM tasks;
    `);

    res.json({
      message: "Dashboard data fetched successfully",
      dashboard: result.rows[0]
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch dashboard"
    });
  }
});

// ==========================================
// GET ALL TASKS
// SEARCH + FILTERING
// ==========================================

// ==========================================
// GET ALL TASKS
// SEARCH + FILTERING + PAGINATION + SORTING
// ==========================================

app.get("/tasks", async (req, res) => {
  try {
    const {
      status,
      search,
      project_id,
      assigned_to,
      page = 1,
      limit = 5,
      sortBy = "id",
      order = "asc"
    } = req.query;

    // Pagination
    const pageNumber = Math.max(parseInt(page) || 1, 1);
    const limitNumber = Math.max(parseInt(limit) || 5, 1);

    const offset = (pageNumber - 1) * limitNumber;

    // Allowed sorting columns
    const allowedSortColumns = {
      id: "tasks.id",
      title: "tasks.title",
      status: "tasks.status",
      due_date: "tasks.due_date"
    };

    const sortColumn =
      allowedSortColumns[sortBy] || "tasks.id";

    const sortOrder =
      order.toLowerCase() === "desc" ? "DESC" : "ASC";

    let query = `
      SELECT
        tasks.id,
        tasks.title,
        tasks.description,
        tasks.status,
        projects.name AS project_name,
        users.name AS assigned_to,
        tasks.due_date
      FROM tasks
      LEFT JOIN projects
        ON tasks.project_id = projects.id
      LEFT JOIN users
        ON tasks.assigned_to = users.id
    `;

    const conditions = [];
    const values = [];

    // Status filter
    if (status) {
      values.push(status);
      conditions.push(`tasks.status = $${values.length}`);
    }

    // Search
    if (search) {
      values.push(`%${search}%`);

      conditions.push(`
        (
          tasks.title ILIKE $${values.length}
          OR tasks.description ILIKE $${values.length}
        )
      `);
    }

    // Project filter
    if (project_id) {
      values.push(project_id);

      conditions.push(
        `tasks.project_id = $${values.length}`
      );
    }

    // Assigned user filter
    if (assigned_to) {
      values.push(assigned_to);

      conditions.push(
        `tasks.assigned_to = $${values.length}`
      );
    }

    // WHERE
    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(" AND ");
    }

    // Sorting
    query += `
      ORDER BY ${sortColumn} ${sortOrder}
    `;

    // Pagination
    values.push(limitNumber);
    query += ` LIMIT $${values.length}`;

    values.push(offset);
    query += ` OFFSET $${values.length}`;

    const result = await pool.query(query, values);

    res.json({
      page: pageNumber,
      limit: limitNumber,
      sortBy: sortBy,
      order: sortOrder.toLowerCase(),
      tasks: result.rows
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch tasks"
    });
  }
});

// ==========================================
// GET SINGLE TASK
// ==========================================

app.get("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        tasks.id,
        tasks.title,
        tasks.description,
        tasks.status,
        projects.name AS project_name,
        users.name AS assigned_to,
        tasks.due_date
      FROM tasks
      LEFT JOIN projects
        ON tasks.project_id = projects.id
      LEFT JOIN users
        ON tasks.assigned_to = users.id
      WHERE tasks.id = $1;
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Task not found"
      });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch task"
    });
  }
});


// ==========================================
// CREATE TASK
// ==========================================

app.post("/tasks", async (req, res) => {
  try {
    const {
      title,
      description,
      status,
      project_id,
      assigned_to,
      due_date
    } = req.body;

    // Validation
    if (!title) {
      return res.status(400).json({
        message: "Title is required"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO tasks
      (
        title,
        description,
        status,
        project_id,
        assigned_to,
        due_date
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
      `,
      [
        title,
        description,
        status || "pending",
        project_id,
        assigned_to,
        due_date
      ]
    );

    res.status(201).json({
      message: "Task created successfully",
      task: result.rows[0]
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to create task"
    });
  }
});


// ==========================================
// UPDATE TASK
// ==========================================

app.put("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title,
      description,
      status,
      project_id,
      assigned_to,
      due_date
    } = req.body;

    // Validation
    if (!title) {
      return res.status(400).json({
        message: "Title is required"
      });
    }

    const result = await pool.query(
      `
      UPDATE tasks
      SET
        title = $1,
        description = $2,
        status = $3,
        project_id = $4,
        assigned_to = $5,
        due_date = $6
      WHERE id = $7
      RETURNING *;
      `,
      [
        title,
        description,
        status,
        project_id,
        assigned_to,
        due_date,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Task not found"
      });
    }

    res.json({
      message: "Task updated successfully",
      task: result.rows[0]
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to update task"
    });
  }
});


// ==========================================
// DELETE TASK
// ==========================================

app.delete("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM tasks
      WHERE id = $1
      RETURNING *;
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Task not found"
      });
    }

    res.json({
      message: "Task deleted successfully",
      task: result.rows[0]
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to delete task"
    });
  }
});


// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );
});