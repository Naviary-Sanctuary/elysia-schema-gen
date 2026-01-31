/**
 * Typescript property type information
 *
 * Uses Discriminated Union pattern for type-safe handling.
 * The `kind` field allows Typescript to narrow the type automatically.
 *
 * @example
 * ```typescript
 * function handleType(type: PropertyType) {
 *   if (type.kind === 'primitive') {
 *     console.log(type.type); // Typescript knows `type.type` exists
 *   } else if (type.kind === 'array') {
 *     console.log(type.elementType); // Typescript knows `type.elementType` exists
 *   }
 * }
 * ```
 */
export type PropertyType = PrimitiveType | ArrayType | ObjectType | UnionType | LiteralType;

/**
 * Primitive types (string, number, boolean, Date)
 *
 * @example
 * ```typescript
 * name: string -> { kind: 'primitive', type: 'string' }
 * age: number -> { kind: 'primitive', type: 'number' }
 * isActive: boolean -> { kind: 'primitive', type: 'boolean' }
 * createdAt: Date -> { kind: 'primitive', type: 'Date' }
 * ```
 */
export interface PrimitiveType {
  kind: 'primitive';
  type: 'string' | 'number' | 'boolean' | 'Date' | 'null' | 'undefined' | 'any';
}

/**
 * Literal types (specific values)
 *
 * @example
 * ```typescript
 * name: 'John' -> { kind: 'literal', value: 'John' }
 * age: 20 -> { kind: 'literal', value: 20 }
 * isActive: true -> { kind: 'literal', value: true }
 * ```
 */
export interface LiteralType {
  kind: 'literal';
  value: string | number | boolean;
}

/**
 * Represents a property extracted from a Typescript class
 *
 * @example
 * ```typescript
 * // Input class
 * class User {
 *   name: string;
 *   age?: number;
 *   tags: string[];
 * }
 *
 * // Extracted Property for 'age'
 * {
 *   name: 'age',
 *   type: { kind: 'primitive', type: 'number' },
 *   isOptional: true,
 *   isReadonly: false,
 *   hasDefaultValue: false
 * }
 * ```
 */
export interface Property {
  name: string;
  type: PropertyType;
  isOptional: boolean;
  isReadonly: boolean;
  hasDefaultValue: boolean;
}

/**
 * Array types
 *
 * The `elementType` is recursive, allowing nested arrays.
 *
 * @example
 * ```typescript
 * tags: string[]
 * → { kind: 'array', elementType: { kind: 'primitive', type: 'string' } }
 *
 * matrix: number[][]
 * → {
 *     kind: 'array',
 *     elementType: {
 *       kind: 'array',
 *       elementType: { kind: 'primitive', type: 'number' }
 *     }
 *   }
 * ```
 */
export interface ArrayType {
  kind: 'array';
  elementType: PropertyType;
}

/**
 * Object types (nested objects, interfaces)
 *
 * The `properties` field is recursive, allowing nested objects.
 *
 * @example
 * ```typescript
 * class User {
 *   address: {
 *     street: string;
 *     city: string;
 *   }
 * }
 *
 * // The 'address' property becomes:
 * {
 *   name: 'address',
 *   type: {
 *     kind: 'object',
 *     properties: [
 *       { name: 'street', type: { kind: 'primitive', type: 'string' }, ... },
 *       { name: 'city', type: { kind: 'primitive', type: 'string' }, ... }
 *     ]
 *   }
 * }
 * ```
 */
export interface ObjectType {
  kind: 'object';
  properties: Property[];
}

/**
 * Union types (A | B)
 *
 * @example
 * ```typescript
 * status: 'active' | 'inactive'
 * → {
 *     kind: 'union',
 *     types: [
 *       { kind: 'literal', value: 'active' },
 *       { kind: 'literal', value: 'inactive' }
 *     ]
 *   }
 *
 * value: string | number
 * → {
 *     kind: 'union',
 *     types: [
 *       { kind: 'primitive', type: 'string' },
 *       { kind: 'primitive', type: 'number' }
 *     ]
 *   }
 * ```
 */
export interface UnionType {
  kind: 'union';
  types: PropertyType[];
}
