import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { FileMatcher } from './matcher';
import { rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const TEST_DIR = join(process.cwd(), 'test-files');

/**
 * Create test files for matching
 */
async function createTestFiles() {
  await mkdir(TEST_DIR, { recursive: true });

  const files = [
    'src/models/user.ts',
    'src/models/product.ts',
    'src/models/order.ts',
    'src/models/user.test.ts',
    'src/models/product.spec.ts',

    'src/dto/user.dto.ts',
    'src/dto/product.dto.ts',
    'src/dto/user.dto.test.ts',

    'src/draft/temp.ts',
    'src/draft/experimental.ts',

    'src/models/domain/entity.ts',
    'src/models/domain/value-object.ts',

    'src/utils/helper.js',
    'src/utils/types.d.ts',

    'index.ts',
    'config.ts',
  ];

  for (const file of files) {
    const filePath = join(TEST_DIR, file);
    const dir = join(filePath, '..');
    await mkdir(dir, { recursive: true });
    await Bun.write(filePath, `// ${file}`);
  }
}

describe('FileMatcher', () => {
  beforeEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
    await createTestFiles();
    // Change to test directory for relative glob patterns
    process.chdir(TEST_DIR);
  });

  afterEach(async () => {
    process.chdir(join(TEST_DIR, '..'));
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  describe('constructor', () => {
    test('should create instance with include patterns', () => {
      const matcher = new FileMatcher({
        include: ['src/**/*.ts'],
      });

      expect(matcher).toBeDefined();
      expect(matcher).toBeInstanceOf(FileMatcher);
    });

    test('should create instance with include and exclude patterns', () => {
      const matcher = new FileMatcher({
        include: ['src/**/*.ts'],
        exclude: ['**/*.test.ts'],
      });

      expect(matcher).toBeDefined();
    });
  });

  describe('find', () => {
    describe('basic patterns', () => {
      test('should find files matching single include pattern', async () => {
        const matcher = new FileMatcher({
          include: ['src/models/*.ts'],
        });

        const files = await matcher.find();

        expect(files).toContain('src/models/user.ts');
        expect(files).toContain('src/models/product.ts');
        expect(files).toContain('src/models/order.ts');
        expect(files.length).toBeGreaterThan(0);
      });

      test('should find files matching glob pattern', async () => {
        const matcher = new FileMatcher({
          include: ['src/**/*.ts'],
        });

        const files = await matcher.find();

        expect(files).toContain('src/models/user.ts');
        expect(files).toContain('src/dto/user.dto.ts');
        expect(files).toContain('src/models/domain/entity.ts');
      });

      test('should handle multiple include patterns', async () => {
        const matcher = new FileMatcher({
          include: ['src/models/*.ts', 'src/dto/*.ts'],
        });

        const files = await matcher.find();

        expect(files).toContain('src/models/user.ts');
        expect(files).toContain('src/dto/user.dto.ts');
        // Should not include nested files
        expect(files).not.toContain('src/models/domain/entity.ts');
      });

      test('should exclude files matching exclude pattern', async () => {
        const matcher = new FileMatcher({
          include: ['src/**/*.ts'],
          exclude: ['**/*.test.ts'],
        });

        const files = await matcher.find();

        expect(files).toContain('src/models/user.ts');
        expect(files).not.toContain('src/models/user.test.ts');
        expect(files).not.toContain('src/dto/user.dto.test.ts');
      });

      test('should exclude files matching multiple exclude patterns', async () => {
        const matcher = new FileMatcher({
          include: ['src/**/*.ts'],
          exclude: ['**/*.test.ts', '**/*.spec.ts'],
        });

        const files = await matcher.find();

        expect(files).toContain('src/models/user.ts');
        expect(files).not.toContain('src/models/user.test.ts');
        expect(files).not.toContain('src/models/product.spec.ts');
      });
    });

    describe('negative patterns', () => {
      test('should handle negative pattern in include', async () => {
        const matcher = new FileMatcher({
          include: ['src/**/*.ts', '!src/**/*.test.ts'],
        });

        const files = await matcher.find();

        expect(files).toContain('src/models/user.ts');
        expect(files).not.toContain('src/models/user.test.ts');
        expect(files).not.toContain('src/dto/user.dto.test.ts');
      });

      test('should handle multiple negative patterns', async () => {
        const matcher = new FileMatcher({
          include: ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/*.spec.ts'],
        });

        const files = await matcher.find();

        expect(files).toContain('src/models/user.ts');
        expect(files).not.toContain('src/models/user.test.ts');
        expect(files).not.toContain('src/models/product.spec.ts');
      });

      test('should handle negative pattern for directory', async () => {
        const matcher = new FileMatcher({
          include: ['src/**/*.ts', '!src/draft/**'],
        });

        const files = await matcher.find();

        expect(files).toContain('src/models/user.ts');
        expect(files).not.toContain('src/draft/temp.ts');
        expect(files).not.toContain('src/draft/experimental.ts');
      });

      test('should combine negative patterns with exclude', async () => {
        const matcher = new FileMatcher({
          include: ['src/**/*.ts', '!src/draft/**'],
          exclude: ['**/*.test.ts'],
        });

        const files = await matcher.find();

        expect(files).toContain('src/models/user.ts');
        expect(files).not.toContain('src/draft/temp.ts');
        expect(files).not.toContain('src/models/user.test.ts');
      });
    });

    describe('result properties', () => {
      test('should return sorted results', async () => {
        const matcher = new FileMatcher({
          include: ['src/models/*.ts'],
          exclude: ['**/*.test.ts', '**/*.spec.ts'],
        });

        const files = await matcher.find();
        const sortedFiles = [...files].sort();

        expect(files).toEqual(sortedFiles);
      });

      test('should remove duplicates', async () => {
        const matcher = new FileMatcher({
          include: ['src/models/*.ts', 'src/models/user.ts'],
        });

        const files = await matcher.find();
        const uniqueFiles = Array.from(new Set(files));

        expect(files).toEqual(uniqueFiles);
      });

      test('should return empty array when no files match', async () => {
        const matcher = new FileMatcher({
          include: ['non-existent/**/*.ts'],
        });

        const files = await matcher.find();

        expect(files).toEqual([]);
      });

      test('should return empty array when all files are excluded', async () => {
        const matcher = new FileMatcher({
          include: ['src/models/*.ts'],
          exclude: ['src/models/*.ts'],
        });

        const files = await matcher.find();

        expect(files).toEqual([]);
      });
    });

    describe('file extensions', () => {
      test('should match different file extensions', async () => {
        const matcher = new FileMatcher({
          include: ['src/**/*.js'],
        });

        const files = await matcher.find();

        expect(files).toContain('src/utils/helper.js');
        expect(files).not.toContain('src/models/user.ts');
      });

      test('should match multiple extensions', async () => {
        const matcher = new FileMatcher({
          include: ['src/**/*.ts', 'src/**/*.js'],
        });

        const files = await matcher.find();

        expect(files).toContain('src/models/user.ts');
        expect(files).toContain('src/utils/helper.js');
      });

      test('should exclude .d.ts files when specified', async () => {
        const matcher = new FileMatcher({
          include: ['src/**/*.ts'],
          exclude: ['**/*.d.ts'],
        });

        const files = await matcher.find();

        expect(files).toContain('src/models/user.ts');
        expect(files).not.toContain('src/utils/types.d.ts');
      });
    });

    describe('nested directories', () => {
      test('should find files in nested directories with **', async () => {
        const matcher = new FileMatcher({
          include: ['src/**/*.ts'],
        });

        const files = await matcher.find();

        expect(files).toContain('src/models/domain/entity.ts');
        expect(files).toContain('src/models/domain/value-object.ts');
      });

      test('should not find nested files with single *', async () => {
        const matcher = new FileMatcher({
          include: ['src/models/*.ts'],
        });

        const files = await matcher.find();

        expect(files).toContain('src/models/user.ts');
        expect(files).not.toContain('src/models/domain/entity.ts');
      });
    });

    describe('real-world scenarios', () => {
      test('should find all TypeScript files except tests', async () => {
        const matcher = new FileMatcher({
          include: ['src/**/*.ts'],
          exclude: ['**/*.test.ts', '**/*.spec.ts'],
        });

        const files = await matcher.find();

        expect(files).toContain('src/models/user.ts');
        expect(files).toContain('src/dto/user.dto.ts');
        expect(files).not.toContain('src/models/user.test.ts');
        expect(files).not.toContain('src/models/product.spec.ts');
      });

      test('should find model files excluding draft', async () => {
        const matcher = new FileMatcher({
          include: ['src/**/*.ts', '!src/draft/**'],
          exclude: ['**/*.test.ts', '**/*.spec.ts'],
        });

        const files = await matcher.find();

        expect(files).toContain('src/models/user.ts');
        expect(files).not.toContain('src/draft/temp.ts');
        expect(files).not.toContain('src/models/user.test.ts');
      });

      test('should find DTO files only', async () => {
        const matcher = new FileMatcher({
          include: ['src/dto/**/*.ts'],
          exclude: ['**/*.test.ts'],
        });

        const files = await matcher.find();

        expect(files).toContain('src/dto/user.dto.ts');
        expect(files).toContain('src/dto/product.dto.ts');
        expect(files).not.toContain('src/models/user.ts');
        expect(files).not.toContain('src/dto/user.dto.test.ts');
      });

      test('should find root level TypeScript files', async () => {
        const matcher = new FileMatcher({
          include: ['*.ts'],
        });

        const files = await matcher.find();

        expect(files).toContain('index.ts');
        expect(files).toContain('config.ts');
        expect(files).not.toContain('src/models/user.ts');
      });
    });

    describe('edge cases', () => {
      test('should handle pattern with no matches', async () => {
        const matcher = new FileMatcher({
          include: ['does-not-exist/**/*.ts'],
        });

        const files = await matcher.find();

        expect(files).toEqual([]);
      });

      test('should handle empty include array gracefully', async () => {
        const matcher = new FileMatcher({
          include: [],
        });

        const files = await matcher.find();

        expect(files).toEqual([]);
      });

      test('should handle only negative patterns', async () => {
        const matcher = new FileMatcher({
          include: ['!src/**/*.test.ts'],
        });

        const files = await matcher.find();

        expect(files).toEqual([]);
      });

      test('should handle exclude without include matches', async () => {
        const matcher = new FileMatcher({
          include: ['non-existent/**/*.ts'],
          exclude: ['**/*.test.ts'],
        });

        const files = await matcher.find();

        expect(files).toEqual([]);
      });
    });
  });
});
