const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

const bookmarksPath = path.join(__dirname, '../public/data/bookmarks.json');
const categoriesPath = path.join(__dirname, '../public/data/categories.json');

// API to get bookmarks
app.get('/api/bookmarks', (req, res) => {
  if (fs.existsSync(bookmarksPath)) {
    const data = fs.readFileSync(bookmarksPath, 'utf8');
    res.json(JSON.parse(data));
  } else {
    res.json([]);
  }
});

// API to save bookmarks
app.post('/api/bookmarks', (req, res) => {
  const bookmarks = req.body;
  if (!Array.isArray(bookmarks)) {
    return res.status(400).json({ error: 'Invalid data format' });
  }
  fs.writeFileSync(bookmarksPath, JSON.stringify(bookmarks, null, 2));
  res.json({ success: true, count: bookmarks.length });
});

// API to get categories
app.get('/api/categories', (req, res) => {
    if (fs.existsSync(categoriesPath)) {
        const data = fs.readFileSync(categoriesPath, 'utf8');
        res.json(JSON.parse(data));
    } else {
        res.json({});
    }
});

// API to save categories
app.post('/api/categories', (req, res) => {
    const categories = req.body;
    if (typeof categories !== 'object' || Array.isArray(categories)) {
        return res.status(400).json({ error: 'Invalid data format' });
    }
    fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2));
    res.json({ success: true });
});

// Serve admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle 404
app.use((req, res, next) => {
    res.status(404).sendFile(path.join(__dirname, '../404.html'));
});

app.listen(port, () => {
  console.log(`Admin server running at http://localhost:${port}/admin`);
  console.log(`Site preview at http://localhost:${port}`);
});
