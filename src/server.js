require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { listenToQueue } = require('./sqsListener');
const paymentsRouter = require('./routes/payments');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

app.use(express.json());

// Healthcheck
app.get('/health', (req, res) => {
  res.send('Billing Service is running');
});

// Rutas
app.use('/api', paymentsRouter);

// Escuchar SQS
listenToQueue();

app.listen(port, () => {
  console.log(`Billing Service listening at http://localhost:${port}`);
});
