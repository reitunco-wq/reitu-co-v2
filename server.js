const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..'))); // Serve static files from root

// Neon PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error acquiring client', err.stack);
  } else {
    console.log('✅ Connected to Neon PostgreSQL database successfully!');
  }
  if (release) release();
});

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../home.html'));
});

app.get('/services', (req, res) => {
  res.sendFile(path.join(__dirname, '../services.html'));
});

app.get('/portfolio', (req, res) => {
  res.sendFile(path.join(__dirname, '../portfolio.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, '../contact.html'));
});

// API Routes (keep your existing API routes here)
app.post('/api/projects', async (req, res) => {
  // Your existing project submission code
  const { clientName, clientEmail, clientPhone, serviceType, budgetRange, timeline, projectDetails, references } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO project_requests (client_name, client_email, client_phone, service_type, budget_range, timeline, project_details, reference_links) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [clientName, clientEmail, clientPhone, serviceType, budgetRange, timeline, projectDetails, references || '']
    );
    
    res.json({
      success: true,
      message: 'Project request submitted successfully!',
      projectId: result.rows[0].id
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save project'
    });
  }
});

// Add your other API routes here (contact, admin, etc.)

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
