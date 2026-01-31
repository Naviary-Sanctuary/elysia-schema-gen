import { Glob } from 'bun';

/**
 * File matcher using glob patterns
 *
 * Finds files matching include patterns and excludes files matching exclude patterns.
 * Uses Bun's native Glob API
 *
 * @example
 * ```typescript
 * const matcher = new FileMatcher({
 *   include: ['src/**\/*.ts'],
 *   exclude: ['**\/*.test.ts']
 * })
 *
 * const files = await matcher.find();
 * // ->  ['src/models/user.ts', 'src/dto/product.ts', ...]
 * ```
 */
export class FileMatcher {
  private readonly include: string[];
  private readonly exclude: string[];

  constructor(config: { include: string[]; exclude?: string[] }) {
    this.include = config.include;
    this.exclude = config.exclude ?? [];
  }

  /**
   * Find all files matching the configured patterns
   *
   * @returns Array of file paths, sorted and deduplicated
   */
  async find(): Promise<string[]> {
    const includedFiles = await this.collectFiles();
    const filteredFiles = await this.filterFiles(includedFiles);

    return Array.from(new Set(filteredFiles)).sort();
  }

  /**
   *
   * @returns Collect files from include patterns
   *
   * Handles both positive patterns (e.g. 'src/**\/*.ts') and
   * negative patterns (e.g., '!src/**\/*.test.ts')
   *
   * @returns Array of file paths matching positive patterns, excluding negative patterns
   */
  private async collectFiles(): Promise<string[]> {
    const positivePatterns = this.include.filter((pattern) => !pattern.startsWith('!'));
    const negativePatterns = this.include
      .filter((pattern) => pattern.startsWith('!'))
      .map((pattern) => pattern.slice(1));

    const filesArrays = await Promise.all(positivePatterns.map((pattern) => this.scanPattern(pattern)));
    const files = filesArrays.flat();

    if (negativePatterns.length) {
      return await this.filterOutByPatterns(files, negativePatterns);
    }

    return files;
  }

  /**
   * Scan files matching a single glob pattern
   *
   * @param pattern - Glob pattern to scan
   * @returns Array of file paths matching the pattern
   */
  private async scanPattern(pattern: string): Promise<string[]> {
    const glob = new Glob(pattern);
    const files: string[] = [];

    for await (const file of glob.scan('.')) {
      files.push(file);
    }

    return files;
  }

  /**
   * Filter out files matching exclude patterns
   *
   * @param files - Files to filter
   * @returns Array of file paths that do NOT matching any exclude patterns
   */
  private async filterFiles(files: string[]): Promise<string[]> {
    if (this.exclude.length === 0) {
      return files;
    }

    return await this.filterOutByPatterns(files, this.exclude);
  }

  /**
   * Filter out files matching the given glob patterns
   *
   * @param files - Files to filter
   * @param patterns - Glob patterns to filter by
   * @returns Array of file paths that do NOT matching any of the given patterns
   */
  private async filterOutByPatterns(files: string[], patterns: string[]): Promise<string[]> {
    const matchingFileSets = await Promise.all(
      patterns.map(async (pattern) => {
        const matchingFiles = await this.scanPattern(pattern);
        return new Set(matchingFiles);
      }),
    );

    const allMatchingFiles = new Set(matchingFileSets.flatMap((fileSet) => Array.from(fileSet)));

    return files.filter((file) => !allMatchingFiles.has(file));
  }
}
