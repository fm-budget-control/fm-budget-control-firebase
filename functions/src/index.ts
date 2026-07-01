import { onRequest } from "firebase-functions/v2/https";
import express from "express";

const app = express();
app.use(express.json());

app.get("/test", (_req, res) => {
  res.send("Test from index");
});

export const api = onRequest(app);
