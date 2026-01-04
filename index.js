require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

//? Middleware to connect server with client side
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.vc0smjx.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("SkilledHub - Online Learning Platform Server is Running...");
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db("skilledHubDB");
    const coursesCollection = db.collection("courses");
    const enrolledCollection = db.collection("enrolled");

    //? get api for get all the courses
    app.get("/courses", async (req, res) => {
      try {
        const {
          limit = 0,
          skip = 0,
          sort = "durationInWeeks",
          order = "desc",
          search = "",
          filter = "",
          price = "",
        } = req.query;
        //? sortOptions
        const sortOptions = {};
        sortOptions[sort || "durationInWeeks"] = order === "desc" ? -1 : 1;
        //? Query
        const query = {};
        //? Search by title (case-insensitive)
        if (search) {
          query.title = { $regex: search, $options: "i" };
        }
        //? Category filter (case-insensitive)
        if (filter) {
          query.category = { $regex: `^${filter}$`, $options: "i" };
        }
        //? Price filter (decimal range)
        if (price) {
          const [minPrice, maxPrice] = price.split("-").map(Number);

          query.price = {
            $gte: minPrice,
            $lte: maxPrice,
          };
        }
        //? sorted and paginated data
        const cursor = coursesCollection
          .find(query)
          .sort(sortOptions)
          .limit(Number(limit))
          .skip(Number(skip))
          .project({
            description: 0,
            instructor: 0,
            instructorId: 0,
            updatedAt: 0,
            createdAt: 0,
          });
        const result = await cursor.toArray();
        const totalCourses = await coursesCollection.countDocuments(query);
        res.status(200).json({
          status: true,
          message: "Get all the courses successful",
          length: result.length,
          totalCourses,
          result,
        });
      } catch (error) {
        res.status(500).json({
          status: false,
          message: "Failed to get all the courses",
          error: error.message,
        });
      }
    });

    //? get api for get popular courses by 8 featured data
    app.get("/popular-courses", async (req, res) => {
      const cursor = coursesCollection.find({ isFeatured: true }).limit(8);
      const result = await cursor.toArray();
      res.send(result);
    });

    //? get api for get single course from courses
    app.get("/courses/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await coursesCollection.findOne(query);
      res.send(result);
    });

    //? post api for create a post in the courses
    app.post("/courses", async (req, res) => {
      const newCourse = req.body;
      const result = await coursesCollection.insertOne(newCourse);
      res.send(result);
    });

    //? delete api for delete a data in the courses
    app.delete("/courses/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await coursesCollection.deleteOne(query);
      res.send(result);
    });

    //? patch api for update some data in the courses
    app.patch("/courses/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedCourse = req.body;
      const update = {
        $set: updatedCourse,
      };
      const options = {};
      const result = await coursesCollection.updateOne(query, update, options);
      res.send(result);
    });

    //? get api from using query email in my added courses
    app.get("/my-courses", async (req, res) => {
      const email = req.query.email;
      const query = {};
      if (email) {
        query["instructor.email"] = email;
      }
      const cursor = coursesCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    //? post api for my Enrolled courses in new db collection
    app.post("/my-enrolled", async (req, res) => {
      const enrolledCourse = req.body;
      const result = await enrolledCollection.insertOne(enrolledCourse);
      res.send(result);
    });

    //? get api for my Enrolled courses
    app.get("/my-enrolled", async (req, res) => {
      const email = req.query.email;
      const cursor = enrolledCollection.find({ enrolled_by: email });
      const result = await cursor.toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(
    `SkilledHub - Online Learning Platform is Running on Port: ${port}`
  );
});
