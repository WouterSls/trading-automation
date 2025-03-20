/**
 * Get Basescan api response data
 */
export interface GetAbiResponseData {
  status: string;
  message: string;
  result: string; // ABI
}

export interface GetContractCreationResponseData {
  status: string;
  message: string;
  result: ContractCreationResult[];
}

interface ContractCreationResult {
  contractAddress: string;
  contractCreator: string;
  txHash: string;
}

/**
 * Class result interface
 */
export interface GetAbiResult {
  isVerified: boolean;
  contractAbi: string;
  functionNames: string[];
}