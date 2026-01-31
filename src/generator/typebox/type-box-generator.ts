import type { ParsedClass, Property, PropertyType } from '@types';
import type { SchemaGenerator } from '../schema-generator';

/**
 * TypeBox schema generator
 *
 * Generates s TypeBox schema code from parsed TypeScript classes.
 * If you use elysia, Uses s built-in `t` from 'elysia' package instead of standalone TypeBox.
 * Uses typebox's `Type` from '@sinclair/typebox' package instead of standalone TypeBox.
 *
 * @see https://sinclairzx81.github.io/typebox/
 * @see https://elysiajs.com/essential/validation.html
 */
export class TypeBoxGenerator implements SchemaGenerator {
  private readonly type: 'typebox' | 'elysia';

  constructor(type: 'typebox' | 'elysia') {
    this.type = type;
  }

  /**
   * Check if this generator supports the given type
   */
  supports(type: string): boolean {
    return type === 'typebox' || type === 'elysia';
  }

  /**
   * Get required imports for TypeBox
   *
   * @returns Import statement for s `t` utility
   */
  getImports(): string[] {
    return this.type === 'typebox' ? ['import { Type as t } from "@sinclair/typebox"'] : ['import { t } from "elysia"'];
  }

  /**
   * Generate TypeBox schema code from a parsed class
   *
   * @param parsedClass - The parsed class information
   * @returns Generated schema code as a string
   *
   * @example
   * ```typescript
   * // Input:
   * {
   *   name: 'User',
   *   properties: [
   *     { name: 'id', type: { kind: 'primitive', type: 'string' }, isOptional: false }
   *   ]
   * }
   *
   * // Output:
   * import { t } from "elysia"
   *
   * export const userSchema = t.Object({
   *   id: t.String()
   * });
   * ```
   */
  generate(parsedClass: ParsedClass): string {
    const imports = this.getImports().join('\n');
    const schemaName = this.generateSchemaName(parsedClass.name);
    const properties = this.generateProperties(parsedClass.properties);

    return `${imports}\n\nexport const ${schemaName} = t.Object({ \n${properties} });`;
  }

  /**
   * Generate schema variable name from class name
   *
   * Converts PascalCase class name to camelCase with 'Schema' suffix.
   *
   * @param className - The class name in PascalCase
   * @returns Schema variable name in camelCase
   *
   * @example
   * ```typescript
   * generateSchemaName('User')         // 'userSchema'
   * generateSchemaName('UserResponse') // 'userResponseSchema'
   * ```
   */
  generateSchemaName(className: string): string {
    const camelCase = className.charAt(0).toLowerCase() + className.slice(1);
    return `${camelCase}Schema`;
  }

  /**
   * Generate all property definitions for t.Object()
   *
   * @param properties - Array of property information
   * @returns Comma-separated property definitions
   */
  private generateProperties(properties: Property[]): string {
    return properties.map((prop) => this.generateProperty(prop)).join(',\n');
  }

  /**
   * Generate a single property definition
   *
   * Wraps optional properties with t.Optional().
   *
   * @param property - Property information
   * @returns Property definition string
   *
   * @example
   * ```typescript
   * // Required property
   * { name: 'id', type: { kind: 'primitive', type: 'string' }, isOptional: false }
   * → "  id: t.String()"
   *
   * // Optional property
   * { name: 'age', type: { kind: 'primitive', type: 'number' }, isOptional: true }
   * → "  age: t.Optional(t.Number())"
   * ```
   */
  private generateProperty(property: Property): string {
    const typeCode = this.generateType(property.type);
    const code = property.isOptional ? `t.Optional(${typeCode})` : typeCode;
    return `  ${property.name}: ${code}`;
  }

  /**
   * Generate TypeBox type code from PropertyType
   *
   * Core mapping logic that converts PropertyType into s `t.*` calls.
   * Uses discriminated union pattern for type-safe handling.
   *
   * @param type - Property type information
   * @returns TypeBox code string
   */
  private generateType(type: PropertyType): string {
    switch (type.kind) {
      case 'primitive':
        return this.generatePrimitiveType(type.type);
      case 'array':
        return `t.Array(${this.generateType(type.elementType)})`;
      case 'object':
        return this.generateObjectType(type.properties);
      case 'union':
        return this.generateUnionType(type.types);
      case 'literal':
        return this.generateLiteralType(type.value);
      default:
        const _exhaustive: never = type;
        throw new Error(`Unsupported type: ${JSON.stringify(_exhaustive)}`);
    }
  }

  /**
   * Generate primitive type code
   *
   * Maps TypeScript primitive types to s TypeBox equivalents.
   *
   * @param type - Primitive type name
   * @returns TypeBox primitive type call
   *
   * @example
   * ```typescript
   * generatePrimitiveType('string')  → 't.String()'
   * generatePrimitiveType('number')  → 't.Number()'
   * generatePrimitiveType('boolean') → 't.Boolean()'
   * generatePrimitiveType('Date')    → 't.Date()'
   * ```
   */
  private generatePrimitiveType(type: 'string' | 'number' | 'boolean' | 'Date' | 'null' | 'undefined' | 'any'): string {
    switch (type) {
      case 'string':
        return 't.String()';
      case 'number':
        return 't.Number()';
      case 'boolean':
        return 't.Boolean()';
      case 'Date':
        return 't.Date()';
      case 'null':
        return 't.Null()';
      case 'undefined':
        return 't.Undefined()';
      case 'any':
        return 't.Any()';
      default:
        const _exhaustive: never = type;
        throw new Error(`Unsupported primitive type: ${JSON.stringify(_exhaustive)}`);
    }
  }

  /**
   * Generate object type code
   *
   * Creates nested t.Object() with recursively generated properties.
   *
   * @param properties - Object's property definitions
   * @returns TypeBox object type code
   *
   * @example
   * ```typescript
   * // Input:
   * [
   *   { name: 'street', type: { kind: 'primitive', type: 'string' }, ... },
   *   { name: 'city', type: { kind: 'primitive', type: 'string' }, ... }
   * ]
   *
   * // Output:
   * t.Object({
   *   street: t.String(),
   *   city: t.String()
   * })
   * ```
   */
  private generateObjectType(properties: Property[]): string {
    const props = properties.map((prop) => this.generateProperty(prop)).join(',\n');
    return `t.Object({\n${props}\n})`;
  }

  /**
   * Generate union type code
   *
   * Optimizes homogeneous literal unions to use t.UnionEnum().
   * Falls back to t.Union() for mixed or non-literal types.
   *
   * @param types - Array of union member types
   * @returns TypeBox union or union enum code
   *
   * @example
   * ```typescript
   * // All string literals → UnionEnum (optimized)
   * [{ kind: 'literal', value: 'a' }, { kind: 'literal', value: 'b' }]
   * → "t.UnionEnum(['a', 'b'])"
   *
   * // All number literals → UnionEnum (optimized)
   * [{ kind: 'literal', value: 1 }, { kind: 'literal', value: 2 }]
   * → "t.UnionEnum([1, 2])"
   *
   * // Mixed literal types → Union (fallback)
   * [{ kind: 'literal', value: 'a' }, { kind: 'literal', value: 1 }]
   * → "t.Union([t.Literal('a'), t.Literal(1)])"
   *
   * // Non-literal types → Union (fallback)
   * [{ kind: 'primitive', type: 'string' }, { kind: 'primitive', type: 'number' }]
   * → "t.Union([t.String(), t.Number()])"
   * ```
   */
  private generateUnionType(types: PropertyType[]): string {
    if (types.every((t) => t.kind === 'literal') && types.length > 0) {
      const literalValues = types.map((t) => t.value);
      if (literalValues.every((v) => typeof v === typeof literalValues[0])) {
        const values = literalValues.map((v) => (typeof v === 'string' ? `'${v}'` : String(v))).join(', ');
        return `t.UnionEnum([${values}])`;
      }
    }

    const typeCodes = types.map((t) => this.generateType(t)).join(', ');
    return `t.Union([${typeCodes}])`;
  }

  /**
   * Generate literal type code
   *
   * Creates t.Literal() with the specific value.
   *
   * @param value - Literal value (string, number, or boolean)
   * @returns TypeBox literal type code
   *
   * @example
   * ```typescript
   * generateLiteralType('active')  → "t.Literal('active')"
   * generateLiteralType(42)        → "t.Literal(42)"
   * generateLiteralType(true)      → "t.Literal(true)"
   * ```
   */
  private generateLiteralType(value: string | number | boolean): string {
    if (typeof value === 'string') {
      return `t.Literal('${value}')`;
    }
    return `t.Literal(${value})`;
  }
}
