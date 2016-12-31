const express = require('express');
const logger = require('morgan');

const app = express();

const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.sendFile('/Users/ntaft/code/personal/vilnatroupe/vilnatroupe-globe-d3/public/index.html');
});

app.listen(port, () => console.log('listening on port', port))
