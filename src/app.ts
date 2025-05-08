import express from "express";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
//import cors from "cors";

import SystemRouter from "./api/system/SystemRouter";
import TradesRouter from "./api/trades/TradesRouter";

//import { errorHandler, notFoundHandler } from "./lib/middlewares";

const app = express();
const openApiSpec = YAML.load(path.join(__dirname, "./api/static/openapi.yaml"));

app.use(express.json());
//app.use(cors({ origin: "*" }));

app.use("/api/v1/system", SystemRouter);
app.use("/api/v1/trades", TradesRouter);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

//app.use(notFoundHandler);
//app.use(errorHandler);

export default app;
