import type { ParsedClass } from '../types';

/**
 * Interface for schema generators
 *
 * This allows us to support multiple schema libraries (TypeBox, Zod, Yup, etc.)
 * by Implementing this interface for each library.
 */
export interface SchemaGenerator {
  /**
   * Generate schema code from a parsed class
   *
   * @param parsedClass -The parsed class information
   * @returns Generated schema code as a string
   *
   * @example
   * ```typescript
   * const generator = new TypeBoxGenerator();
   * const code = generator.generate(parsedClass);
   * // Returns: "export const userSchema = t.Object({ ... });"
   * ```
   */
  generate(parsedClass: ParsedClass): string;

  /**
   * Check if this generator supports a given schema type
   * @param type - The schema type to check
   * @returns True if the generator supports the type, false otherwise
   *
   * @example
   * ```typescript
   * const generator = new TypeBoxGenerator();
   * const supportsTypeBox = generator.supports('typebox');
   * // Returns: true
   * ```
   */
  supports(type: string): boolean;

  /**
   * Get required import statements for the generated schema
   *
   * @returns Array of import statements
   *
   * @example
   * ```typescript
   * const generator = new TypeBoxGenerator();
   * generator.getImports();
   * // Returns: ["import { Type as t } from '@sinclair/typebox';"]
   * ```
   */
  getImports(): string[];
}
