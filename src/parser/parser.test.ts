import { test, expect, describe } from 'bun:test';
import { Parser } from './parser';
import path from 'path';

const FIXTURES_DIR = path.resolve(process.cwd(), 'tests/fixtures');

describe('Parser', () => {
  const parser = new Parser();

  test('should parse simple class', () => {
    const filePath = path.join(FIXTURES_DIR, 'simple-class.ts');
    const result = parser.parseFile(filePath);

    expect(result).toHaveLength(1);
    const parsed = result[0];
    if (parsed) {
      expect(parsed.name).toBe('User');
      expect(parsed.properties).toHaveLength(5);

      expect(parsed.properties).toContainEqual({
        name: 'id',
        type: { kind: 'primitive', type: 'string' },
        isOptional: false,
        isReadonly: false,
        hasDefaultValue: false,
      });
    }
    expect.assertions(4);
  });

  test('should parse optional properties', () => {
    const filePath = path.join(FIXTURES_DIR, 'optional-properties.ts');
    const result = parser.parseFile(filePath);

    expect(result).toHaveLength(1);
    const parsed = result[0];
    if (parsed) {
      const description = parsed.properties.find((p) => p.name === 'description');
      expect(description?.isOptional).toBe(true);

      const id = parsed.properties.find((p) => p.name === 'id');
      expect(id?.isOptional).toBe(false);
    }
    expect.assertions(3);
  });

  test('should parse readonly properties', () => {
    const filePath = path.join(FIXTURES_DIR, 'readonly-properties.ts');
    const result = parser.parseFile(filePath);

    expect(result).toHaveLength(1);
    const parsed = result[0];
    if (parsed) {
      const id = parsed.properties.find((p) => p.name === 'id');
      expect(id?.isReadonly).toBe(true);

      const name = parsed.properties.find((p) => p.name === 'name');
      expect(name?.isReadonly).toBe(false);
    }
    expect.assertions(3);
  });

  test('should parse default values', () => {
    const filePath = path.join(FIXTURES_DIR, 'default-values.ts');
    const result = parser.parseFile(filePath);

    expect(result).toHaveLength(1);
    const parsed = result[0];
    if (parsed) {
      const host = parsed.properties.find((p) => p.name === 'host');
      expect(host?.hasDefaultValue).toBe(true);

      const name = parsed.properties.find((p) => p.name === 'name');
      expect(name?.hasDefaultValue).toBe(false);
    }
    expect.assertions(3);
  });

  test('should parse array properties', () => {
    const filePath = path.join(FIXTURES_DIR, 'array-properties.ts');
    const result = parser.parseFile(filePath);

    expect(result).toHaveLength(1);
    const parsed = result[0];
    if (parsed) {
      const tags = parsed.properties.find((p) => p.name === 'tags');
      expect(tags?.type).toEqual({
        kind: 'array',
        elementType: { kind: 'primitive', type: 'string' },
      });
    }
    expect.assertions(2);
  });

  test('should parse union types and literal values', () => {
    const filePath = path.join(FIXTURES_DIR, 'union-types.ts');
    const result = parser.parseFile(filePath);

    expect(result).toHaveLength(1);
    const parsed = result[0];
    if (parsed) {
      const status = parsed.properties.find((p) => p.name === 'status');
      expect(status?.type.kind).toBe('union');
      if (status?.type.kind === 'union') {
        const types = status.type.types;
        expect(types).toContainEqual({ kind: 'literal', value: 'pending' });
        expect(types).toContainEqual({ kind: 'literal', value: 'active' });
        expect(types).toContainEqual({ kind: 'literal', value: 'completed' });
      }

      const priority = parsed.properties.find((p) => p.name === 'priority');
      expect(priority?.type.kind).toBe('union');
      if (priority?.type.kind === 'union') {
        const types = priority.type.types;
        expect(types).toContainEqual({ kind: 'literal', value: 1 });
        expect(types).toContainEqual({ kind: 'literal', value: 2 });
        expect(types).toContainEqual({ kind: 'literal', value: 3 });
      }
    }
    expect.assertions(9);
  });

  test('should parse nested objects', () => {
    const filePath = path.join(FIXTURES_DIR, 'nested-object.ts');
    const result = parser.parseFile(filePath);

    expect(result).toHaveLength(1);
    const parsed = result[0];
    if (parsed) {
      const address = parsed.properties.find((p) => p.name === 'address');
      expect(address?.type.kind).toBe('object');
      if (address?.type.kind === 'object') {
        const properties = address.type.properties;
        expect(properties).toContainEqual({
          name: 'street',
          type: { kind: 'primitive', type: 'string' },
          isOptional: false,
          isReadonly: false,
          hasDefaultValue: false,
        });
      }
    }
    expect.assertions(3);
  });
});
