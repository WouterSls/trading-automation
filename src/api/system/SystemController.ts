import { Request, Response } from "express";
import { paths } from "../generated/openapi";

type HealthResponse = paths["/system/health"]["get"]["responses"]["200"]["content"]["application/json"];

export class SystemController {
  public static health(req: Request, res: Response<HealthResponse>): void {
    try {
      // According to your OpenAPI spec, this should return a string, not an object
      res.json("System status: Active" as HealthResponse);
      
      // Alternative if you want to keep your current response format:
      // You would need to update your OpenAPI spec to match this structure
      // res.json({
      //   message: "System status: Active",
      // } as unknown as HealthResponse);
    } catch (error: unknown) {
      if (error instanceof Error) {
        const errorMessage = error.message;
        // Implement error handling with your error classes
      } else {
        // Handle unknown errors
      }
      throw error;
    }
  }
}

