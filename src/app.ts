import express from "express";
import { httpEntry } from "@/handlers/httpEntry.handler";
import { notFoundHandler } from "@/handlers/notFound.handler";
import { errorHandler } from "@/handlers/error.handler";
import api from "@/api/v1";
const app = express();

app.use(express.json());
app.use(httpEntry);

// Routes
app.use("/api", api);

//not found error
app.use(notFoundHandler);

// Global error handler (should be after routes)
app.use(errorHandler);

export default app;
