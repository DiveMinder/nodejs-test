require('dotenv').config();
const express = require('express');
const path = require('path');
const indexRouter = require('./routes/index');
const { handleGetFacilitySignups, handleGetElearningCodes } = require('./functions/webhooks');

const app = express();
const PORT = 3000;

// Middleware for parsing JSON bodies
app.use(express.json());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Webhook endpoint for "Get Facility Signups"
app.post('/webhook/get-facility-signups', handleGetFacilitySignups);

// Webhook endpoint for "Get E-Learning Codes"
app.post('/webhook/get-elearning-codes', handleGetElearningCodes);

// Use the router for handling routes
app.use('/', indexRouter);

// Catch-all route for handling 404 errors
app.use((req, res, next) => {
    res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
  });

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
