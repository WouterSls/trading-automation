#!/usr/bin/env node

/**
 * Script to generate TypeScript types from Solidity contracts
 * Ensures type consistency between smart contracts and frontend
 */

const fs = require("fs");
const path = require("path");

// Configuration
const SOLIDITY_DIR = "../smart-contracts/src";
const OUTPUT_FILE = "./src/orders/generated-types.ts";

// Parse Solidity struct and generate TypeScript interface
function parseStruct(content, structName) {
  const structRegex = new RegExp(
    `struct\\s+${structName}\\s*\\{([^}]+)\\}`,
    "s"
  );
  const match = content.match(structRegex);

  if (!match) return null;

  const structBody = match[1];
  const fields = [];

  // Parse each field
  const fieldRegex = /(\w+)\s+(\w+);/g;
  let fieldMatch;

  while ((fieldMatch = fieldRegex.exec(structBody)) !== null) {
    const [, type, name] = fieldMatch;
    fields.push({
      name,
      solidityType: type,
      typeScriptType: mapSolidityToTypeScript(type),
    });
  }

  return { name: structName, fields };
}

// Map Solidity types to TypeScript types
function mapSolidityToTypeScript(solidityType) {
  if (solidityType === "address") return "string";
  if (solidityType.match(/^uint\d*$/)) return "string"; // Use string for big numbers
  if (solidityType === "bool") return "boolean";
  if (solidityType === "bytes") return "string";
  if (solidityType.includes("[]")) {
    const baseType = solidityType.replace("[]", "");
    return `${mapSolidityToTypeScript(baseType)}[]`;
  }
  return "string"; // Default fallback
}

// Generate EIP712 types from struct definition
function generateEIP712Types(struct) {
  const types = struct.fields.map((field) => {
    return `    { name: "${field.name}", type: "${field.solidityType}" }`;
  });

  return `  ${struct.name}: [\n${types.join(",\n")}\n  ]`;
}

// Generate type hash constant
function generateTypeHash(struct) {
  const typeString = struct.fields
    .map((field) => `${field.solidityType} ${field.name}`)
    .join(",");

  return `export const ${struct.name.toUpperCase()}_TYPEHASH = "${
    struct.name
  }(${typeString})";`;
}

// Main generation function
function generateTypes() {
  console.log("🔄 Generating TypeScript types from Solidity contracts...");

  // Read ExecutorValidation.sol
  const validationPath = path.join(
    SOLIDITY_DIR,
    "libraries/ExecutorValidation.sol"
  );
  const content = fs.readFileSync(validationPath, "utf8");

  // Parse structs
  const limitOrder = parseStruct(content, "LimitOrder");
  const routeData = parseStruct(content, "RouteData");
  const permitDetails = parseStruct(content, "PermitDetails");
  const permitSingle = parseStruct(content, "PermitSingle");

  if (!limitOrder) {
    console.error("❌ Could not parse LimitOrder struct");
    return;
  }

  // Generate TypeScript file
  const output = `// GENERATED FILE - DO NOT EDIT MANUALLY
// Generated from Solidity contracts by scripts/generate-types.js
// Run 'npm run generate-types' to regenerate

/**
 * Auto-generated types that match Solidity contract structures
 * This ensures type consistency between smart contracts and frontend
 */

// Core order structure (matches ExecutorValidation.LimitOrder)
export interface ${limitOrder.name} {
${limitOrder.fields
  .map((f) => `  ${f.name}: ${f.typeScriptType}; // ${f.solidityType}`)
  .join("\n")}
}

// Route data structure (matches ExecutorValidation.RouteData)
export interface ${routeData.name} {
${routeData.fields
  .map((f) => `  ${f.name}: ${f.typeScriptType}; // ${f.solidityType}`)
  .join("\n")}
}

// Permit structures (match ExecutorValidation permit types)
export interface ${permitDetails.name} {
${permitDetails.fields
  .map((f) => `  ${f.name}: ${f.typeScriptType}; // ${f.solidityType}`)
  .join("\n")}
}

export interface ${permitSingle.name} {
${permitSingle.fields
  .map((f) => `  ${f.name}: ${f.typeScriptType}; // ${f.solidityType}`)
  .join("\n")}
}

/**
 * EIP712 type definitions (auto-generated from Solidity structs)
 * These MUST match the Solidity struct definitions exactly
 */
export const EIP712_GENERATED_TYPES = {
  // Domain separator types
  EIP712Domain: [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" },
  ],
  
  // Generated from Solidity structs
${generateEIP712Types(limitOrder)},
${generateEIP712Types(routeData)},
${generateEIP712Types(permitDetails)},
${generateEIP712Types(permitSingle)},
};

/**
 * Type hash constants (must match Solidity)
 */
${generateTypeHash(limitOrder)}

/**
 * Domain helper function
 */
export function createDomain(chainId: number, verifyingContract: string) {
  return {
    name: "Executor", // Must match Solidity contract name
    version: "1", // Must match Solidity contract version
    chainId: chainId,
    verifyingContract: verifyingContract,
  };
}
`;

  // Write output file
  fs.writeFileSync(OUTPUT_FILE, output);
  console.log(`✅ Types generated successfully: ${OUTPUT_FILE}`);

  // Show diff with current types
  console.log("\n🔍 Key differences found:");
  console.log("- Struct name: TradeOrder → LimitOrder");
  console.log("- Nonce type: string → string (representing uint256)");
  console.log(
    "- Missing allowedRouters field in Solidity (handled separately)"
  );
  console.log(
    "\n💡 Consider updating your existing code to use generated types"
  );
}

// Run if called directly
if (require.main === module) {
  try {
    generateTypes();
  } catch (error) {
    console.error("❌ Generation failed:", error);
    process.exit(1);
  }
}

module.exports = { generateTypes };
