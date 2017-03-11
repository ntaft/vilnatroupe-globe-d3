const express = require('express');
const logger = require('morgan');
const path = require('path');

const vtData = require('./data/vt-geo-v2.json');
const mapData = require('./data/world-110m.v1.json');

const app = express();

const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, './')));

app.get('/', (req, res) => {
  res.sendFile('index.html');
});

app.get('/vt_data', (req, res) => {
  res.json(vtData);
});

app.get('/map_data', (req, res) => {
  res.json(mapData);
})

app.listen(port, () => console.log('listening on port', port))
