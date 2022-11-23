//libs
import express from 'express';
import cors from 'cors';
import users from './api/users.route.js';
//initialize express app
const app = express();
//apply middleware to express app
app.use(cors());
app.use(express.json());
//specify intial routes
app.use('/api/v1/users', users);
//fallback for non-existent routes
app.use('*', (req, res) => {
  res.status(404).send('This page does not exist!');
});

export default app;
