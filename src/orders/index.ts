/**
 * EIP-712 Order System
 * 
 * This module implements a complete EIP-712 based order system for non-custodial trading.
 * Users sign structured orders that can be executed by the backend while maintaining
 * full control over their assets.
 * 
 * Key Components:
 * - OrderSigner: Creates and verifies EIP-712 signatures
 * - OrderValidator: Validates orders and execution parameters  
 * - Types: Complete type definitions for orders and execution
 * 
 * Usage:
 * ```typescript
 * import { OrderSigner, OrderValidator } from './src/orders';
 * 
 * const signer = new OrderSigner(ChainType.BASE, contractAddress);
 * const signedOrder = await signer.createSignedOrder(wallet, params);
 * 
 * const validator = new OrderValidator();
 * const validation = await validator.validateSignedOrder(signedOrder);
 * ```
 */

// Core classes
export { OrderSigner } from './OrderSigner';
export { OrderValidator, OrderValidationError } from './OrderValidator';

// Type definitions
export * from './types/OrderTypes';

// Re-export commonly used types for convenience
export type {
  TradeOrder,
  SignedLimitOrder,
  ExecutionParams,
  EIP712Domain,
  Permit2Data,
  OrderWithStatus,
} from './types/OrderTypes';

export {
  OrderStatus,
  EIP712_TYPES,
  createDomain,
  generateOrderNonce,
} from './types/OrderTypes';

