const express = require("express");
const router = express.Router();

/* Get all events */
router.get("/", (req, res) => {
  res.json({ message: "Fetch all events" });
});

/* Get a single event */
router.get("/:id", (req, res) => {
  const id = req.params.id;
  res.json({ message: `Fetch event with id ${id}` });
});

/* Create a new event */
router.post("/", (req, res) => {
  const { title, description, date } = req.body;

  res.status(201).json({
    message: "Event created successfully",
    event: { title, description, date }
  });
});

/* Update an event */
router.put("/:id", (req, res) => {
  const id = req.params.id;

  res.json({
    message: `Event ${id} updated successfully`
  });
});

/* Delete an event */
router.delete("/:id", (req, res) => {
  const id = req.params.id;

  res.json({
    message: `Event ${id} deleted successfully`
  });
});

module.exports = router;