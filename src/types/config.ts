import type { SupportedGeneratorType } from './generator';

export const WRITE_MODES = ['separate', 'inline'] as const;
export type WriteModeType = (typeof WRITE_MODES)[number];

/**
 * Output pattern configuration
 */
export interface OutputPattern {
  /**
   * Output path pattern with template variables
   *
   * Available variables:
   * - {filename}: Filename without extension (e.g., 'user' from 'user.ts')
   * - {dirname}: Original directory path (e.g., 'src/models' from 'src/models/user.ts')
   * - {extension}: File extension (e.g., '.ts')
   * @example
   * // Pattern: "src/route/{filename}/schema.ts"
   * // Input:   src/models/user.ts
   * // Output:  src/route/user/schema.ts
   */
  pattern: string;
}

/**
 * Mapping rule for file processing
 *
 * Each mapping defines:
 * - Which files to process (include)
 * - Where to output the generated schema (output pattern)
 */
export interface MappingRule {
  /**
   * Glob patterns for file to include
   *
   * @example
   * ['src/dto/**\/*.ts', "src/models/**\/*.ts"]
   */
  include: string[];

  /**
   * Output pattern configuration
   */
  output: OutputPattern;
}

/**
 * Main configuration object
 */
export interface Config {
  /** Path to tsconfig.json file */
  tsConfigPath?: string;
  /**
   * Mapping rules
   *
   * Each rule defines which files to process and where to output the generated schema.
   * Rules are processed in order - first match wins.
   */
  mappings: MappingRule[];

  /**
   * Schema generator to use for this mapping
   */
  generator: SupportedGeneratorType;

  /**
   * Generation mode for this mapping (optional)
   *
   * If not specified, uses 'separate' mode as default.
   */
  mode?: WriteModeType;

  /**
   * exclude patterns (applied to all mappings)
   *
   * @example ["**\/*.test.ts", "**\/*.spec.ts"]
   */
  exclude?: string[];
}
