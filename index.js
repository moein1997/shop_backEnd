const express = require('express'); // Import Express
const cors = require('cors'); // Import CORS middleware
const bcrypt = require('bcrypt'); // For password hashing
const mysql = require('mysql2'); // Import MySQL client

const nodemailer = require('nodemailer'); // For email verification
const twilio = require('twilio'); // For SMS verification

const app = express(); // Create an Express application

// Enable CORS for all origins (allow requests from React app)
app.use(cors());
app.use(express.json()); // Parse JSON payloads

// Set up MySQL connection
const db = mysql.createConnection({
  host: 'localhost', // Replace with your MySQL server host (e.g., localhost)
  user: 'root', // Replace with your MySQL username
  password: 'Moein1376', // Replace with your MySQL password
  database: 'shop', // Replace with your database name
});

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err.message);
  } else {
    console.log('Connected to MySQL!');
  }
});


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
      user: 'info.shop.electronic.mail@gmail.com',
      pass: 'Moein1376',
  },
});


const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID; // Use environment variables
const TWILIO_ACCOUNT_AUTHTOKEN = process.env.TWILIO_AUTH_TOKEN;

const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_ACCOUNT_AUTHTOKEN);




app.get('/', (req, res) => {
  res.redirect('/api/products');
});

// Create an API endpoint to fetch products
app.get('/api/products', (req, res) => {
  const query = 'SELECT * FROM products_with_category'; // Query to fetch all products
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching products:', err.message);
      res.status(500).send('Internal Server Error');
    } else {
      res.json(results); // Send query results as JSON
    }
  });
});






// Signup Endpoint
app.post('/signup', async (req, res) => {
  const { username, password, email, phone_number } = req.body;

  if (!username || !password || !email || !phone_number) {
    return res.status(400).json({ message: 'All fields are required!' });
  }

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into `users` table
    db.query(
      'INSERT INTO users (username, password, email, phone_number, is_verified) VALUES (?, ?, ?, ?, false)',
      [username, hashedPassword, email, phone_number],
      (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err });

        const userId = result.insertId;

        // Generate verification code
        const verificationCode = crypto.randomInt(100000, 999999).toString();
        const expirationTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes validity

        // Insert code into `verification_codes` table
        db.query(
          'INSERT INTO verification_codes (user_id, verification_code, expires_at) VALUES (?, ?, ?)',
          [userId, verificationCode, expirationTime],
          (err) => {
            if (err) return res.status(500).json({ message: 'Database error', error: err });

            // Send SMS using Twilio
            twilioClient.messages
              .create({
                body: `Your verification code is: ${verificationCode}`,
                from: 'YOUR_TWILIO_PHONE_NUMBER',
                to: phone_number,
              })
              .then(() => {
                res.status(200).json({
                  message: 'Signup successful! Verification code sent via SMS.',
                });
              })
              .catch((err) => {
                res.status(500).json({ message: 'Failed to send SMS', error: err });
              });
          }
        );
      }
    );
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});






// Verify Endpoint
app.post('/verify', (req, res) => {
  const { userId, verificationCode } = req.body;

  if (!userId || !verificationCode) {
    return res.status(400).json({ message: 'User ID and verification code are required!' });
  }

  db.query(
    'SELECT * FROM verification_codes WHERE user_id = ? AND verification_code = ? AND is_used = false AND expires_at > NOW()',
    [userId, verificationCode],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err });

      if (results.length === 0) {
        return res.status(400).json({ message: 'Invalid or expired verification code!' });
      }

      // Mark code as used and verify user
      db.query(
        'UPDATE verification_codes SET is_used = true WHERE id = ?',
        [results[0].id],
        (err) => {
          if (err) return res.status(500).json({ message: 'Database error', error: err });

          db.query(
            'UPDATE users SET is_verified = true WHERE id = ?',
            [userId],
            (err) => {
              if (err) return res.status(500).json({ message: 'Database error', error: err });

              res.status(200).json({ message: 'User verified successfully!' });
            }
          );
        }
      );
    }
  );
});






// Sign-In Endpoint
app.post('/api/signin', (req, res) => {
  const { username, password } = req.body;

  db.query(
      'SELECT * FROM users WHERE username = ?',
      [username],
      async (err, results) => {
          if (err) {
              res.status(500).json({ success: false, message: 'Server error.' });
          } else if (results.length === 0) {
              res.status(401).json({ success: false, message: 'Invalid username or password.' });
          } else {
              const isMatch = await bcrypt.compare(password, results[0].password);
              if (isMatch) {
                  res.status(200).json({ success: true, message: 'Login successful.' });
              } else {
                  res.status(401).json({ success: false, message: 'Invalid username or password.' });
              }
          }
      }
  );
});














// Start the server
const PORT = 5000; // You can change the port if needed
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});