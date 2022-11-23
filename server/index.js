//libs
import app from './server.js';
import mongodb from 'mongodb';
import dotenv from 'dotenv';
//configure environment variables with dotenv
dotenv.config();
//access mongo client
const MongoClient = mongodb.MongoClient;
//setup port from environment variable
const port = process.env.PORT || 5000;
//connect to mongo client
MongoClient.connect(process.env.MONGO_URI, {
  maxPoolSize: 50,
  wtimeoutMS: 2500,
})
  .catch((err) => console.log(err.stack))
  .then(async (client) =>
    app.listen(port, () => console.log(`Server listening on port: ${port}`)),
  );
