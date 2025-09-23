#!/usr/bin/env node

/**
 * Validation script to check consistency between Solidity and TypeScript types
 * Run this in CI/CD or before deployment to catch type mismatches
 */

const fs = require("fs");
const path = require("path");

// Configuration
const SOLIDITY_FILE = path.join(__dirname, "../smart-contracts/src/libraries/ExecutorValidation.sol");
const TYPESCRIPT_FILE = path.join(__dirname, "../evm-trading-engine/src/lib/generated-solidity-types.ts");

class TypeValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  // Parse Solidity struct
  parseStruct(content, structName) {
    const structRegex = new RegExp(
      `struct\\s+${structName}\\s*\\{([^}]+)\\}`,
      "s"
    );
    const match = content.match(structRegex);

    if (!match) return null;

    const structBody = match[1];
    const fields = [];

    const fieldRegex = /([\w.\[\]]+)\s+(\w+);/g;
    let fieldMatch;

    while ((fieldMatch = fieldRegex.exec(structBody)) !== null) {
      const [, type, name] = fieldMatch;
      fields.push({ name, type });
    }

    return { name: structName, fields };
  }

  // Parse TypeScript interface
  parseInterface(content, interfaceName) {
    const interfaceRegex = new RegExp(
      `interface\\s+${interfaceName}\\s*\\{([^}]+)\\}`,
      "s"
    );
    const match = content.match(interfaceRegex);

    if (!match) return null;

    const interfaceBody = match[1];
    const fields = [];

    // Parse TypeScript interface fields (more complex due to comments, etc.)
    const lines = interfaceBody.split("\n");
    for (const line of lines) {
      const fieldMatch = line.match(/^\s*(\w+):\s*([^;]+);?\s*(?:\/\/.*)?$/);
      if (fieldMatch) {
        const [, name, type] = fieldMatch;
        fields.push({ name, type: type.trim() });
      }
    }

    return { name: interfaceName, fields };
  }

  // Parse EIP712 type definition
  parseEIP712Types(content, typeName) {
    const typeRegex = new RegExp(`${typeName}:\\s*\\[([^\\]]+)\\]`, "s");
    const match = content.match(typeRegex);

    if (!match) return null;

    const typeBody = match[1];
    const fields = [];

    // Parse EIP712 type fields
    const fieldRegex = /\{\s*name:\s*"(\w+)",\s*type:\s*"([^"]+)"\s*\}/g;
    let fieldMatch;

    while ((fieldMatch = fieldRegex.exec(typeBody)) !== null) {
      const [, name, type] = fieldMatch;
      fields.push({ name, type });
    }

    return { name: typeName, fields };
  }

  // Validate field consistency
  validateFields(solidityStruct, tsInterface, eip712Type, structName) {
    console.log(`\n🔍 Validating ${structName}...`);

    if (!solidityStruct) {
      this.errors.push(`❌ Solidity struct ${structName} not found`);
      return;
    }

    if (!tsInterface) {
      this.errors.push(`❌ TypeScript interface for ${structName} not found`);
      return;
    }

    // Check field count
    if (solidityStruct.fields.length !== tsInterface.fields.length) {
      this.warnings.push(
        `⚠️  Field count mismatch in ${structName}: Solidity(${solidityStruct.fields.length}) vs TypeScript(${tsInterface.fields.length})`
      );
    }

    // Check each Solidity field exists in TypeScript
    for (const solField of solidityStruct.fields) {
      const tsField = tsInterface.fields.find((f) => f.name === solField.name);

      if (!tsField) {
        this.errors.push(
          `❌ Field '${solField.name}' missing in TypeScript interface ${structName}`
        );
        continue;
      }

      // Validate type compatibility
      if (!this.areTypesCompatible(solField.type, tsField.type)) {
        this.errors.push(
          `❌ Type mismatch for '${solField.name}': Solidity(${solField.type}) vs TypeScript(${tsField.type})`
        );
      }
    }

    // Validate EIP712 types if provided
    if (eip712Type) {
      console.log(`  📝 Checking EIP712 types...`);

      for (const solField of solidityStruct.fields) {
        const eipField = eip712Type.fields.find(
          (f) => f.name === solField.name
        );

        if (!eipField) {
          this.errors.push(
            `❌ Field '${solField.name}' missing in EIP712 type definition`
          );
          continue;
        }

        // For enums, EIP712 should use uint8, not the enum name
        const expectedEipType = solField.type.includes(".") ? "uint8" : solField.type;
        if (expectedEipType !== eipField.type) {
          this.errors.push(
            `❌ EIP712 type mismatch for '${solField.name}': Solidity(${solField.type}) vs EIP712(${eipField.type}) - expected ${expectedEipType}`
          );
        }
      }
    }
  }

  // Check if Solidity and TypeScript types are compatible
  areTypesCompatible(solidityType, tsType) {
    // Clean up TypeScript type (remove array brackets, comments, etc.)
    const cleanTsType = tsType.replace(/\s*\/\/.*$/, "").trim();

    // Define compatibility mappings
    const compatibilityMap = {
      address: ["string"],
      uint256: ["string", "number"],
      uint128: ["string", "number"],
      uint64: ["string", "number"],
      uint32: ["string", "number"],
      uint16: ["string", "number"],
      uint8: ["string", "number"],
      bool: ["boolean"],
      bytes: ["string"],
      string: ["string"],
      // Add enum support - enums are represented as numbers in TypeScript
      "Types.Protocol": ["number", "Protocol"],
    };

    // Handle arrays
    if (solidityType.endsWith("[]")) {
      const baseType = solidityType.slice(0, -2);
      const expectedTsTypes = compatibilityMap[baseType] || [baseType];

      return expectedTsTypes.some(
        (expectedType) => cleanTsType === `${expectedType}[]`
      );
    }

    // Handle enum types (e.g., "Types.Protocol")
    if (solidityType.includes(".")) {
      const expectedTsTypes = compatibilityMap[solidityType] || [solidityType];
      return expectedTsTypes.includes(cleanTsType);
    }

    // Handle regular types
    const expectedTsTypes = compatibilityMap[solidityType] || [solidityType];
    return expectedTsTypes.includes(cleanTsType);
  }

  // Validate type hash constants
  validateTypeHash(solidityContent, tsContent) {
    console.log(`\n🔍 Validating type hashes...`);

    // Extract Solidity type hash
    const solTypeHashMatch = solidityContent.match(
      /ORDER_TYPEHASH\s*=\s*keccak256\(\s*"([^"]+)"/
    );

    if (!solTypeHashMatch) {
      this.warnings.push(`⚠️  Could not find ORDER_TYPEHASH in Solidity`);
      return;
    }

    const solTypeHash = solTypeHashMatch[1];
    console.log(`  Solidity type hash: ${solTypeHash}`);

    // Check if TypeScript has matching hash (this is more complex, so just warn)
    this.warnings.push(
      `⚠️  Manual verification needed: Ensure EIP712 types match Solidity type hash`
    );
  }

  // Main validation function
  async validate() {
    console.log(
      "🔍 Validating type consistency between Solidity and TypeScript...\n"
    );

    try {
      // Read files
      const solidityContent = fs.readFileSync(SOLIDITY_FILE, "utf8");
      const typescriptContent = fs.readFileSync(TYPESCRIPT_FILE, "utf8");

      // Parse structures
      const solidityOrder = this.parseStruct(
        solidityContent,
        "SignedOrder"
      );
      const tsOrder = this.parseInterface(typescriptContent, "SignedOrder");
      const eip712Order = this.parseEIP712Types(
        typescriptContent,
        "SignedOrder"
      );

      // Validate main order structure
      this.validateFields(
        solidityOrder,
        tsOrder,
        eip712Order,
        "SignedOrder"
      );

      // Validate type hashes
      this.validateTypeHash(solidityContent, typescriptContent);

      // Report results
      console.log("\n📊 Validation Results:");
      console.log("=====================");

      if (this.errors.length === 0 && this.warnings.length === 0) {
        console.log("✅ All types are consistent!");
        return true;
      }

      if (this.errors.length > 0) {
        console.log("\n❌ ERRORS (must fix):");
        this.errors.forEach((error) => console.log(`  ${error}`));
      }

      if (this.warnings.length > 0) {
        console.log("\n⚠️  WARNINGS (should review):");
        this.warnings.forEach((warning) => console.log(`  ${warning}`));
      }

      console.log(
        `\n📈 Summary: ${this.errors.length} errors, ${this.warnings.length} warnings`
      );

      return this.errors.length === 0;
    } catch (error) {
      console.error("❌ Validation failed:", error);
      return false;
    }
  }
}

async function main() {
  const validator = new TypeValidator();
  const success = await validator.validate();

  if (!success) {
    console.log("\n💡 Suggestions:");
    console.log("1. Run `npm run generate-types` to create consistent types");
    console.log("2. Update existing interfaces to match generated types");
    console.log("3. Ensure EIP712 types match Solidity struct definitions");

    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { TypeValidator };
