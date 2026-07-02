import express from "express";

const app = express();
app.disable("x-powered-by");
app.use(express.json());

app.get("/test", (_req, res) => {
  res.send("Test from index");
});

export { app };
