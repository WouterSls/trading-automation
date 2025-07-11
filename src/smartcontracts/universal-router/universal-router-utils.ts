import { AbiCoder } from "ethers";
import {
  IPermitSingle,
  IPermitTransferFrom,
} from "./universal-router-types";

export function encodeSwapCommandInput(
  actions: string,
  encodedSwapParams: string,
  encodedSettleParams: string,
  encodedTakeParams: string,
) {
  const encodedSwapCommandInput = AbiCoder.defaultAbiCoder().encode(
    ["bytes", "bytes[]"],
    [actions, [encodedSwapParams, encodedSettleParams, encodedTakeParams]],
  );
  return encodedSwapCommandInput;
}

export function encodePermitSingleInput(permitSingle: IPermitSingle, signature: string) {
  const permitDetailsTuple = [
    permitSingle.details.token,
    permitSingle.details.amount,
    permitSingle.details.expiration,
    permitSingle.details.nonce,
  ] as const;
  const permitTuple = [permitDetailsTuple, permitSingle.spender, permitSingle.sigDeadline] as const;

  const encodedPermitInput = AbiCoder.defaultAbiCoder().encode(
    [
      "tuple(tuple(address token,uint160 amount,uint48 expiration,uint48 nonce) details,address spender,uint256 sigDeadline)", // PermitSingle
      "bytes", // signature
    ],
    [permitTuple, signature],
  );
  return encodedPermitInput;
}

export function encodePermitTransferFromInput(permitTransferFrom: IPermitTransferFrom) {
  const transferFromInput = AbiCoder.defaultAbiCoder().encode(
    ["address token", "address recipient", "uint256 amount"],
    [permitTransferFrom.token, permitTransferFrom.recipient, permitTransferFrom.amount],
  );
  return transferFromInput;
}
