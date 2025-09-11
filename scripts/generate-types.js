#!/usr/bin/env node

/**
 * Script to generate TypeScript types from Solidity contracts
 * Ensures type consistency between smart contracts and frontend
 */

const fs = require("fs");
const path = require("path");

// Configuration
const SOLIDITY_DIR = path.join(__dirname, "../smart-contracts/src");
const OUTPUT_FILE = path.join(__dirname, "../evm-trading-engine/src/lib/generated-solidity-types.ts");

function parseStruct(content, structName) {
  const structRegex = new RegExp(
    `struct\\s+${structName}\\s*\\{([^}]+)\\}`,
    "s"
  );
  const match = content.match(structRegex);

  if (!match) return null;

  const structBody = match[1];
  const fields = [];

  // Parse each field - updated regex to handle enum types like "Types.Protocol"
  const fieldRegex = /([\w.]+)\s+(\w+);/g;
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

function mapSolidityToTypeScript(solidityType) {
  if (solidityType === "address") return "string";
  if (solidityType.match(/^uint\d*$/)) return "string"; // Use string for big numbers
  if (solidityType === "bool") return "boolean";
  if (solidityType === "bytes") return "string";
  
  // Handle enum types - they should be numbers in TypeScript
  if (solidityType.includes(".")) {
    // This is likely an enum like "Types.Protocol"
    return "number";
  }
  
  if (solidityType.includes("[]")) {
    const baseType = solidityType.replace("[]", "");
    return `${mapSolidityToTypeScript(baseType)}[]`;
  }
  return "string"; // Default fallback
}

function generateEIP712Types(struct) {
  const types = struct.fields.map((field) => {
    // Convert enum types to uint8 for EIP712
    const eip712Type = field.solidityType.includes(".") ? "uint8" : field.solidityType;
    return `    { name: "${field.name}", type: "${eip712Type}" }`;
  });

  return `  ${struct.name}: [\n${types.join(",\n")}\n  ]`;
}

function generateTypeHash(struct) {
  const typeString = struct.fields
    .map((field) => {
      // Convert enum types to uint8 for type hash
      const typeForHash = field.solidityType.includes(".") ? "uint8" : field.solidityType;
      return `${typeForHash} ${field.name}`;
    })
    .join(",");

  return `export const ${struct.name.toUpperCase()}_TYPEHASH = "${
    struct.name
  }(${typeString})";`;
}

// Parse enum from Solidity content
function parseEnum(content, enumName) {
  const enumRegex = new RegExp(
    `enum\\s+${enumName}\\s*\\{([^}]+)\\}`, 
    "s"
  );
  const match = content.match(enumRegex);
  
  if (!match) return null;
  
  const enumBody = match[1];
  const values = enumBody
    .split(',')
    .map(v => v.trim())
    .filter(v => v.length > 0);
    
  return { name: enumName, values };
}

// Generate TypeScript enum
function generateEnumTypeScript(enumDef) {
  const enumValues = enumDef.values.map((value, index) => 
    `  ${value} = ${index}`
  ).join(',\n');
  
  return `export enum ${enumDef.name} {\n${enumValues}\n}`;
}

function generateTypes() {
  console.log("🔄 Generating TypeScript types from Solidity contracts...");

  const validationPath = path.join(
    SOLIDITY_DIR,
    "libraries/ExecutorValidation.sol"
  );
  const typesPath = path.join(
    SOLIDITY_DIR,
    "libraries/Types.sol"
  );

  const validationContent = fs.readFileSync(validationPath, "utf8");
  const typesContent = fs.readFileSync(typesPath, "utf8");

  // Parse enums first
  const protocolEnum = parseEnum(typesContent, "Protocol");

  // Parse structs
  const order = parseStruct(validationContent, "Order");
  const routeData = parseStruct(validationContent, "RouteData");
  const permitDetails = parseStruct(validationContent, "PermitDetails");
  const permitSingle = parseStruct(validationContent, "PermitSingle");

  if (!order) {
    console.error("❌ Could not parse Order struct");
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

${protocolEnum ? generateEnumTypeScript(protocolEnum) + '\n' : ''}
// Core order structure (matches ExecutorValidation.LimitOrder)
export interface ${order.name} {
${order.fields
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
${generateEIP712Types(order)},
${generateEIP712Types(routeData)},
${generateEIP712Types(permitDetails)},
${generateEIP712Types(permitSingle)},
};

/**
 * Type hash constants (must match Solidity)
 */
${generateTypeHash(order)}

/**
 * Domain helper function
 */
export function createDomain(chainId: number, verifyingContract: string) {
  return {
    name: "EVM Trading Engine", // Must match Solidity contract name
    version: "1", // Must match Solidity contract version
    chainId: chainId,
    verifyingContract: verifyingContract,
  };
}
`;

  fs.writeFileSync(OUTPUT_FILE, output);
  console.log(`✅ Types generated successfully: ${OUTPUT_FILE}`);
}

if (require.main === module) {
  try {
    generateTypes();
  } catch (error) {
    console.error("❌ Generation failed:", error);
    process.exit(1);
  }
}

module.exports = { generateTypes };
