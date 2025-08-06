import express from 'express';
import { errorHandler } from './middlewares/errorHandler';
import config from './config/config';

const app = express();

app.use(express.json());

// Routes

// Global error handler (should be after routes)
app.use(errorHandler);

app.get('/', (req, res) => {
  res.status(200).send({message: 'Hello World!'});
})

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});