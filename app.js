const express = require('express');
const path = require('path');
const indexRouter = require('./routes/index');
const { handleSyncUsers } = require('./functions/webhooks');

const app = express();
const PORT = 3000;

// Middleware for parsing JSON bodies
app.use(express.json());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Webhook endpoint for "Sync Users"
app.post('/webhook/sync-users', handleSyncUsers);

// Use the router for handling routes
app.use('/', indexRouter);

// Catch-all route for handling 404 errors
app.use((req, res, next) => {
    res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
  });

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
