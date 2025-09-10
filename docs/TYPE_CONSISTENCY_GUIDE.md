# Type Consistency Guide

This guide explains how to keep Solidity smart contract types synchronized with your TypeScript frontend implementation.

## Current Issues Identified

1. **Naming Inconsistency**: `TradeOrder` (TS) vs `LimitOrder` (Solidity)
2. **Field Mismatches**: `nonce` type differences, EIP712 field names
3. **Missing Fields**: `allowedRouters` only in TypeScript
4. **EIP712 Inconsistencies**: Type definitions don't match struct definitions

## Solution Approaches

### 🎯 **Approach 1: Automated Code Generation (Recommended)**

**Benefits:**

- ✅ Single source of truth (Solidity contracts)
- ✅ Automatic synchronization
- ✅ Prevents human error
- ✅ CI/CD integration

**Usage:**

```bash
# Generate types from Solidity contracts
npm run generate-types

# Validate existing types against contracts
npm run validate-types
```

**Generated Files:**

- `evm-trading-engine/src/orders/generated-types.ts` - Auto-generated TypeScript types

**Implementation:**

1. Modify your existing code to import from `generated-types.ts`
2. Run generation script whenever contracts change
3. Add to CI/CD pipeline for automated checks

### 🔧 **Approach 2: Manual Synchronization with Validation**

**Benefits:**

- ✅ Full control over type definitions
- ✅ Custom optimizations
- ✅ Validation catches inconsistencies

**Process:**

1. Update Solidity contracts
2. Manually update TypeScript types
3. Run validation script to check consistency
4. Fix any issues found

### 🔄 **Approach 3: Hybrid Approach (Best for Complex Projects)**

**Benefits:**

- ✅ Generated base types
- ✅ Custom extensions for frontend-specific needs
- ✅ Validation safety net

**Structure:**

```typescript
// Base generated types
import { LimitOrder as BaseLimitOrder } from "./generated-types";

// Frontend-specific extensions
export interface TradeOrderRequest extends BaseLimitOrder {
  allowedRouters: string[]; // Frontend-only field
  estimatedGas?: string; // Optional frontend metadata
}
```

## Current Type Mappings

### ✅ **After Code Generation:**

| Solidity Type | TypeScript Type | Notes                      |
| ------------- | --------------- | -------------------------- |
| `address`     | `string`        | Hex string                 |
| `uint256`     | `string`        | Use string for big numbers |
| `uint16`      | `string`        | Consistent with uint256    |
| `bool`        | `boolean`       | Direct mapping             |
| `bytes`       | `string`        | Hex string                 |

### 🔧 **EIP712 Types (Auto-Generated):**

```typescript
export const EIP712_GENERATED_TYPES = {
  LimitOrder: [
    { name: "maker", type: "address" },
    { name: "inputToken", type: "address" },
    { name: "outputToken", type: "address" },
    { name: "inputAmount", type: "uint256" },
    { name: "minAmountOut", type: "uint256" },
    { name: "maxSlippageBps", type: "uint256" },
    { name: "expiry", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
};
```

## Implementation Steps

### Step 1: Update Your Build Process

Add to `package.json`:

```json
{
  "scripts": {
    "generate-types": "node scripts/generate-types.js",
    "validate-types": "node scripts/validate-types.js",
    "prebuild": "npm run validate-types"
  }
}
```

### Step 2: Update Existing Code

Replace current imports:

```typescript
// OLD
import { TradeOrder, EIP712_TYPES } from "./order-types";

// NEW
import { LimitOrder, EIP712_GENERATED_TYPES } from "./generated-types";
```

### Step 3: Handle Frontend-Specific Fields

For fields like `allowedRouters` that don't exist in Solidity:

```typescript
// Create frontend-specific extensions
export interface TradeOrderRequest {
  // Core order (matches Solidity)
  order: LimitOrder;

  // Frontend-specific fields
  allowedRouters: string[];
  metadata?: {
    estimatedGas?: string;
    userNotes?: string;
  };
}
```

### Step 4: Update Order Creation

```typescript
// Before
const order: TradeOrder = { maker, inputToken, ... };

// After
const order: LimitOrder = { maker, inputToken, ... };
const orderRequest: TradeOrderRequest = {
  order,
  allowedRouters: [...],
  metadata: { ... }
};
```

## CI/CD Integration

### GitHub Actions Example:

```yaml
- name: Validate Types
  run: |
    npm run generate-types
    npm run validate-types

    # Check if generated files changed
    git diff --exit-code evm-trading-engine/src/orders/generated-types.ts || {
      echo "Generated types are out of sync! Run 'npm run generate-types'"
      exit 1
    }
```

### Pre-commit Hook:

```bash
#!/bin/sh
# .git/hooks/pre-commit
npm run validate-types || {
  echo "Type validation failed! Please fix inconsistencies."
  exit 1
}
```

## Best Practices

1. **🎯 Single Source of Truth**: Always use Solidity contracts as the authoritative source
2. **🔄 Automate Generation**: Run type generation in CI/CD
3. **✅ Validate Regularly**: Check consistency before deployment
4. **📝 Document Changes**: Comment any manual type modifications
5. **🔒 Version Control**: Commit generated types to track changes

## Troubleshooting

### Common Issues:

**Issue**: "Field missing in TypeScript interface"
**Solution**: Regenerate types or add missing field manually

**Issue**: "Type mismatch for nonce"
**Solution**: Use string consistently for all uint256 types

**Issue**: "EIP712 types don't match"
**Solution**: Use generated EIP712 types instead of manual definitions

### Need Help?

1. Check the validation output: `npm run validate-types`
2. Regenerate types: `npm run generate-types`
3. Compare generated vs current types
4. Update your code to use generated types

## Migration Checklist

- [ ] Run `npm run generate-types`
- [ ] Update imports to use generated types
- [ ] Handle frontend-specific fields separately
- [ ] Update EIP712 signing to use generated types
- [ ] Test order creation and validation
- [ ] Add type validation to CI/CD
- [ ] Update documentation

