const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());

require("dotenv").config();

const port = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(port, () => {
  console.log("Server is running on port ", port);
});

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.PASSWORD}@cluster0.iidrxjp.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  const userCollection = client
    .db("Construction-Application")
    .collection("users");

  app.get("/getUser", async (req, res) => {
    const userId = req.query.id;
    console.log(userId);

    const result = await userCollection.findOne({ userId });

    if (result) {
      res.send({
        status: 1,
        userInfo: result,
      });
    } else {
      res.send({
        status: 0,
      });
    }
  });
}

run().catch(console.dir);
