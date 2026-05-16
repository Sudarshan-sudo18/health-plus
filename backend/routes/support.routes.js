import { Router } from "express";
import { getSupportSettings } from "../controllers/support.controller.js";

export const supportRouter = Router();

supportRouter.get("/", getSupportSettings);
