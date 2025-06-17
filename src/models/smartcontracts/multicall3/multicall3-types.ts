export interface Call3 {
  target: string;
  allowFailure: boolean;
  callData: string;
}

// Ethers.js returns multicall results as tuples (arrays), not objects
// So we define it as a tuple type that can be accessed by index
// export type Call3Result = [boolean, string]; // [success, returnData]
// We map the result type to the object defined below in Multicall3 abstraction

export interface Call3Result {
  success: boolean;
  returnData: string;
}
