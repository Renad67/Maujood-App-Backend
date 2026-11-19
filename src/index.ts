import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { bootstrap } from './app.controller';

const app = express();
const PORT = process.env.PORT || 5000;

bootstrap(app)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Moujood Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  });

