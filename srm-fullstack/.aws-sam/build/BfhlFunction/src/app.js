'use strict';

const express = require('express');
const cors = require('cors');
const { processData } = require('./processor');

const app = express();

app.use(cors());
app.use(express.json());

app.post('/bfhl', (req, res) => {
  const { data } = req.body || {};
  const result = processData(Array.isArray(data) ? data : []);
  res.json(result);
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

module.exports = app;
