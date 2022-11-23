//libs
import express from 'express';
//initialize express router
const router = express.Router();
//GET request
router.route('/').get((req, res) => res.send('Hello World!'));

export default router;
