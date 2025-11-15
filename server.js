// Import required modules
const express = require('express');
const mysql = require('config');
const cors = require('cors');

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - these help our server understand requests
app.use(cors()); // Allows frontend to communicate with backend
app.use(express.json()); // Allows server to understand JSON data

// MySQL Database Connection
// ✅ FIXED PASSWORD LINE - UPDATE THIS
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', 
    password: '#reIT07*', // ← CHANGE THIS TO YOUR ACTUAL PASSWORD
    database: 'retu_co'
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.log('❌ Error connecting to MySQL:', err);
    } else {
        console.log('✅ Connected to MySQL database successfully!');
    }
});

// Test route - to check if server is working
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Re!tu & Co Backend is running!',
        timestamp: new Date().toISOString()
    });
});

// Handle form submissions from homepage
app.post('/api/projects', (req, res) => {
    console.log('📥 Received a project submission request');
    
    // Get data from the request body
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

    // Log the received data (for debugging)
    console.log('Client:', clientName);
    console.log('Email:', clientEmail);
    console.log('Service:', serviceType);

    // Basic validation - check if required fields are filled
    if (!clientName || !clientEmail || !clientPhone || !serviceType || !budgetRange || !timeline || !projectDetails) {
        return res.status(400).json({
            success: false,
            message: 'Please fill in all required fields'
        });
    }

    // ✅ FIXED SQL QUERY - changed "references" to "reference_links"
    const sqlQuery = `
        INSERT INTO project_requests 
        (client_name, client_email, client_phone, service_type, budget_range, timeline, project_details, reference_links)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Execute the query
    db.execute(
        sqlQuery,
        [clientName, clientEmail, clientPhone, serviceType, budgetRange, timeline, projectDetails, references || ''],
        (error, results) => {
            if (error) {
                console.error('❌ Database error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to save project to database'
                });
            }

            console.log('✅ Project saved to database with ID:', results.insertId);
            
            // Send success response back to frontend
            res.json({
                success: true,
                message: 'Project request submitted successfully! We will contact you within 24 hours.',
                projectId: results.insertId
            });
        }
    );
});

// Handle contact form submissions
app.post('/api/contact', (req, res) => {
    console.log('📥 Received a contact submission request');
    
    // Get data from the request body
    const {
        name,
        email,
        subject,
        message
    } = req.body;

    // Log the received data (for debugging)
    console.log('Name:', name);
    console.log('Email:', email);
    console.log('Subject:', subject);

    // Basic validation - check if required fields are filled
    if (!name || !email || !subject || !message) {
        return res.status(400).json({
            success: false,
            message: 'All required fields must be filled'
        });
    }

    // SQL query to insert data into database
    const sqlQuery = `
        INSERT INTO contact_submissions 
        (name, email, subject, message)
        VALUES (?, ?, ?, ?)
    `;

    // Execute the query
    db.execute(
        sqlQuery,
        [name, email, subject, message],
        (error, results) => {
            if (error) {
                console.error('❌ Database error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to save contact form to database'
                });
            }

            console.log('✅ Contact form saved to database with ID:', results.insertId);
            
            // Send success response back to frontend
            res.json({
                success: true,
                message: 'Message sent successfully! We will get back to you soon.',
                submissionId: results.insertId
            });
        }
    );
});

// Admin login
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Username and password required'
        });
    }

    const query = 'SELECT * FROM admin_users WHERE username = ?';
    
    db.execute(query, [username], (error, results) => {
        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({
                success: false,
                message: 'Login failed'
            });
        }

        if (results.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const user = results[0];
        
        // In a real app, use bcrypt for password hashing
        // For now, we'll use simple comparison (password: admin123)
        if (password === 'admin123') {
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
    });
});

// Updated artwork creation endpoint
app.post('/api/artworks', (req, res) => {
    const { 
        title, category, description, technologies, 
        media_type, image_url, video_url, website_url, prototype_url 
    } = req.body;

    if (!title || !category || !description) {
        return res.status(400).json({
            success: false,
            message: 'Title, category, and description are required'
        });
    }

    const sqlQuery = `
        INSERT INTO artworks 
        (title, category, description, technologies, media_type, image_url, video_url, website_url, prototype_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.execute(
        sqlQuery,
        [title, category, description, JSON.stringify(technologies), media_type, image_url, video_url, website_url, prototype_url],
        (error, results) => {
            if (error) {
                console.error('Database error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create artwork'
                });
            }

            res.status(201).json({
                success: true,
                message: 'Artwork created successfully',
                artworkId: results.insertId
            });
        }
    );
});

// File upload endpoint (for hosting files on your server)
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/portfolio/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = {
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/webp': 'webp',
            'video/mp4': 'mp4',
            'video/webm': 'webm',
            'application/pdf': 'pdf'
        };
        
        if (allowedTypes[file.mimetype]) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'), false);
        }
    }
});

// Upload file endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No file uploaded'
        });
    }

    res.json({
        success: true,
        message: 'File uploaded successfully',
        file: {
            name: req.file.originalname,
            path: req.file.path,
            size: req.file.size,
            type: req.file.mimetype
        }
    });
});


// Get all contact submissions for admin
app.get('/api/admin/contacts', (req, res) => {
    const query = 'SELECT * FROM contact_submissions ORDER BY submitted_at DESC';
    
    db.execute(query, (error, results) => {
        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch contacts'
            });
        }

        res.json({
            success: true,
            data: results
        });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Re!tu & Co server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});