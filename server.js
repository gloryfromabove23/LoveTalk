const express = require('express');
const path = require('path');
const app = express();

// Render provides the port automatically via process.env.PORT
const PORT = process.env.PORT || 3000;

// This line tells the server to allow access to your CSS, JS, and Images
app.use(express.static(__dirname));

// This sends your index.html file to the browser when someone visits
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Love Talk is running on port ${PORT}`);
});
