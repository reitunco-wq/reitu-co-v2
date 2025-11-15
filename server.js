const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

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
    return console.error('Error acquiring client', err.stack);
  }
  console.log('✅ Connected to Neon PostgreSQL database successfully!');
  release();
});

// Test route - to check if server is working
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Re!tu & Co Backend is running!',
    timestamp: new Date().toISOString()
  });
});

// Handle project submissions from homepage
app.post('/api/projects', async (req, res) => {
  console.log('📥 Received a project submission request');
  
  const {
    clientName,
    clientEmail,
    clientPhone,
    serviceType,
    budgetRange,
    timeline,
    projectDetails,
    references
  } = req.body;

  console.log('Client:', clientName);
  console.log('Email:', clientEmail);
  console.log('Service:', serviceType);

  // Basic validation
  if (!clientName || !clientEmail || !clientPhone || !serviceType || !budgetRange || !timeline || !projectDetails) {
    return res.status(400).json({
      success: false,
      message: 'Please fill in all required fields'
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO project_requests 
      (client_name, client_email, client_phone, service_type, budget_range, timeline, project_details, reference_links)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [clientName, clientEmail, clientPhone, serviceType, budgetRange, timeline, projectDetails, references || '']
    );
    
    console.log('✅ Project saved to database with ID:', result.rows[0].id);
    
    res.json({
      success: true,
      message: 'Project request submitted successfully! We will contact you within 24 hours.',
      projectId: result.rows[0].id
    });
  } catch (error) {
    console.error('❌ Database error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save project to database'
    });
  }
});

// Handle contact form submissions
app.post('/api/contact', async (req, res) => {
  console.log('📥 Received a contact submission request');
  
  const {
    name,
    email,
    subject,
    message
  } = req.body;

  console.log('Name:', name);
  console.log('Email:', email);
  console.log('Subject:', subject);

  // Basic validation
  if (!name || !email || !subject || !message) {
    return res.status(400).json({
      success: false,
      message: 'All required fields must be filled'
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO contact_submissions 
      (name, email, subject, message)
      VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, email, subject, message]
    );

    console.log('✅ Contact form saved to database with ID:', result.rows[0].id);
    
    res.json({
      success: true,
      message: 'Message sent successfully! We will get back to you soon.',
      submissionId: result.rows[0].id
    });
  } catch (error) {
    console.error('❌ Database error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save contact form to database'
    });
  }
});

// Admin login
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password required'
    });
  }

  try {
    const result = await pool.query('SELECT * FROM admin_users WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = result.rows[0];
    
    // Simple password check (password: admin123)
    if (password === user.password_hash) {
      res.json({
        success: true,
        message: 'Login successful',
        user: { id: user.id, username: user.username }
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Get all project requests for admin
app.get('/api/admin/projects', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM project_requests ORDER BY submitted_at DESC');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects'
    });
  }
});

// Get all contact submissions for admin
app.get('/api/admin/contacts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM contact_submissions ORDER BY submitted_at DESC');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contacts'
    });
  }
});

// Get artworks for portfolio
app.get('/api/artworks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM artworks WHERE is_active = true ORDER BY created_at DESC');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching artworks:', error);
    res.status(500).json({
      success: false,
      error: 'Database error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Re!tu & Co server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
