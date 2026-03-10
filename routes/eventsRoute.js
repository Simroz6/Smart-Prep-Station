const express = require("express");
const serverless = require("serverless-http"); // Wrap Express for serverless
const router = express.Router();
const app = express();

app.use(express.json());

// Routes
router.get("/", (req, res) => {
  res.json({ message: "Events API working" });
});

router.get("/:id", (req, res) => {
  res.json({ message: `Fetch event with id ${req.params.id}` });
});

router.post("/", (req, res) => {
  const { title, description, date } = req.body;
  res.status(201).json({
    message: "Event created",
    event: { title, description, date }
  });
});

router.put("/:id", (req, res) => {
  res.json({ message: `Event ${req.params.id} updated` });
});

router.delete("/:id", (req, res) => {
  res.json({ message: `Event ${req.params.id} deleted` });
});

// Mount router
app.use("/", router);

// Export as serverless function
module.exports = serverless(app);
