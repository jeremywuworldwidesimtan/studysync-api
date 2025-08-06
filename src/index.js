const express = require('express');
const app = express();
const db = require('./db');
const routes = require('./routes');
const generative = require('./generativeRoutes');
const test = require('./testRoutes');

app.use(express.json());
app.use('/api', routes);
app.use('/api/generative', generative);
app.use('/api/test', test);

const PORT = process.env.PORT || 3420;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
