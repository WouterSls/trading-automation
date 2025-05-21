import { Request, Response } from "express";
import { paths, components } from "../generated/openapi";
import { BadRequestError, InternalServerError } from "../../lib/errors";

type TradeResponse = paths["/trades"]["post"]["responses"][200]["content"]["application/json"];
export type TradeDto = components["schemas"]["TradeDto"];
export type BuyTradeCreationDto = components["schemas"]["BuyTradeCreationDto"];
export type SellTradeCreationDto = components["schemas"]["SellTradeCreationDto"];

export class TraderController {
  public static async trade(req: Request, res: Response<TradeResponse>): Promise<void> {
    try {
      const tradeInfo: TradeDto = {
        walletAddress: "0x789...",
        tradeType: "SWAP",
      };

      res.json({
        message: "Trade executed successfully",
        tradeDto: tradeInfo,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new BadRequestError(error.message);
      } else {
        throw new InternalServerError("An unknown error occurred");
      }
    }
  }

  public static async tradeV2(req: Request, res: Response<TradeResponse>): Promise<void> {}

  public static async tradeV3(req: Request, res: Response<TradeResponse>): Promise<void> {}

  public static async tradeV4(req: Request, res: Response<TradeResponse>): Promise<void> {}
}
