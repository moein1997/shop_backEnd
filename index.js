const express = require('express'); // Import Express
const cors = require('cors'); // Import CORS middleware
const mysql = require('mysql2'); // Import MySQL client

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

app.get('/', (req, res) => {
  res.redirect('/api/products');
});

// Create an API endpoint to fetch products
app.get('/api/products', (req, res) => {
  const query = 'SELECT * FROM products'; // Query to fetch all products
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching products:', err.message);
      res.status(500).send('Internal Server Error');
    } else {
      res.json(results); // Send query results as JSON
    }
  });
});

// Start the server
const PORT = 5000; // You can change the port if needed
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});