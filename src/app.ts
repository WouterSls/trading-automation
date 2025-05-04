import express from "express";
//import swaggerUi from "swagger-ui-express";
//import YAML from "yamljs";
//import path from "path";
//import cors from "cors";

import { TradeRouter } from "./routes/TradeRouter";

//import { errorHandler, notFoundHandler } from "./lib/middlewares";

const app = express();
//const openApiSpec = YAML.load(path.join(__dirname, "./api/static/openapi.yaml"));

app.use(express.json());
//app.use(cors({ origin: "*" }));

app.use("/api/v1", webhookRoutes);

//app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

//app.use(notFoundHandler);
//app.use(errorHandler);

export default app;
