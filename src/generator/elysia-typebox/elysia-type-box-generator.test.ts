import { describe, expect, test } from 'bun:test';
import { ElysiaTypeBoxGenerator } from './elysia-type-box-generator';
import type { ParsedClass } from '@types';

describe('ElysiaTypeBoxGenerator Test', () => {
  const generator = new ElysiaTypeBoxGenerator();

  describe('supports Test', () => {
    test('should support typebox', () => {
      expect(generator.supports('typebox')).toBe(true);
    });

    test('should not support other types', () => {
      expect(generator.supports('zod')).toBe(false);
      expect(generator.supports('yup')).toBe(false);
      expect(generator.supports('class-validator')).toBe(false);
    });
  });

  describe('getImports Test', () => {
    test('should return elysia typeBox import statement', () => {
      expect(generator.getImports()).toEqual(['import { t } from "elysia"']);
    });
  });

  describe('generate Test', () => {
    describe('schema name', () => {
      test('should convert PascalCase to camelCase with schema suffix', () => {
        const parsedClass: ParsedClass = {
          name: 'UserResponse',
          filePath: 'test.ts',
          isExported: true,
          properties: [],
        };

        const result = generator.generate(parsedClass);

        expect(result).toContain('userResponseSchema');
      });
    });

    describe('Primitive types', () => {
      test('should generate string type', () => {
        const parsedClass: ParsedClass = {
          name: 'User',
          filePath: 'test.ts',
          isExported: true,
          properties: [
            {
              name: 'id',
              type: { kind: 'primitive', type: 'string' },
              isOptional: false,
              isReadonly: false,
              hasDefaultValue: false,
            },
          ],
        };

        const result = generator.generate(parsedClass);
        expect(result).toContain('t.String()');
      });

      test('should generate number type', () => {
        const parsedClass: ParsedClass = {
          name: 'User',
          filePath: 'test.ts',
          isExported: true,
          properties: [
            {
              name: 'age',
              type: { kind: 'primitive', type: 'number' },
              isOptional: false,
              isReadonly: false,
              hasDefaultValue: false,
            },
          ],
        };

        const result = generator.generate(parsedClass);
        expect(result).toContain('t.Number()');
      });

      test('should generate boolean type', () => {
        const parsedClass: ParsedClass = {
          name: 'User',
          filePath: 'test.ts',
          isExported: true,
          properties: [
            {
              name: 'isActive',
              type: { kind: 'primitive', type: 'boolean' },
              isOptional: false,
              isReadonly: false,
              hasDefaultValue: false,
            },
          ],
        };

        const result = generator.generate(parsedClass);
        expect(result).toContain('t.Boolean()');
      });

      test('should generate Date type', () => {
        const parsedClass: ParsedClass = {
          name: 'User',
          filePath: 'test.ts',
          isExported: true,
          properties: [
            {
              name: 'createdAt',
              type: { kind: 'primitive', type: 'Date' },
              isOptional: false,
              isReadonly: false,
              hasDefaultValue: false,
            },
          ],
        };

        const result = generator.generate(parsedClass);
        expect(result).toContain('t.Date()');
      });
    });

    describe('optional properties', () => {
      test('should wrap optional properties in t.Optional()', () => {
        const parsedClass: ParsedClass = {
          name: 'User',
          filePath: 'test.ts',
          isExported: true,
          properties: [
            {
              name: 'age',
              type: { kind: 'primitive', type: 'number' },
              isOptional: true,
              isReadonly: false,
              hasDefaultValue: false,
            },
          ],
        };

        const result = generator.generate(parsedClass);
        expect(result).toContain('t.Optional(t.Number())');
      });

      test('should not wrap non-optional properties in t.Optional()', () => {
        const parsedClass: ParsedClass = {
          name: 'User',
          filePath: 'test.ts',
          isExported: true,
          properties: [
            {
              name: 'age',
              type: { kind: 'primitive', type: 'number' },
              isOptional: true,
              isReadonly: false,
              hasDefaultValue: false,
            },
            {
              name: 'id',
              type: { kind: 'primitive', type: 'string' },
              isOptional: false,
              isReadonly: false,
              hasDefaultValue: false,
            },
          ],
        };

        const result = generator.generate(parsedClass);
        expect(result).toContain('age: t.Optional(t.Number())');
        expect(result).toContain('id: t.String()');
      });
    });
    describe('array types', () => {
      test('should generate string array', () => {
        const parsedClass: ParsedClass = {
          name: 'User',
          filePath: 'test.ts',
          isExported: true,
          properties: [
            {
              name: 'tags',
              type: { kind: 'array', elementType: { kind: 'primitive', type: 'string' } },
              isOptional: false,
              isReadonly: false,
              hasDefaultValue: false,
            },
          ],
        };

        const result = generator.generate(parsedClass);
        expect(result).toContain('t.Array(t.String())');
      });

      test('should generate number array', () => {
        const parsedClass: ParsedClass = {
          name: 'User',
          filePath: 'test.ts',
          isExported: true,
          properties: [
            {
              name: 'scores',
              type: { kind: 'array', elementType: { kind: 'primitive', type: 'number' } },
              isOptional: false,
              isReadonly: false,
              hasDefaultValue: false,
            },
          ],
        };

        const result = generator.generate(parsedClass);
        expect(result).toContain('t.Array(t.Number())');
      });

      test('should generate nested array', () => {
        const parsedClass: ParsedClass = {
          name: 'User',
          filePath: 'test.ts',
          isExported: true,
          properties: [
            {
              name: 'matrix',
              type: {
                kind: 'array',
                elementType: { kind: 'array', elementType: { kind: 'primitive', type: 'number' } },
              },
              isOptional: false,
              isReadonly: false,
              hasDefaultValue: false,
            },
          ],
        };

        const result = generator.generate(parsedClass);
        expect(result).toContain('t.Array(t.Array(t.Number()))');
      });
    });

    describe('object types', () => {
      test('should generate nested object', () => {
        const parsedClass: ParsedClass = {
          name: 'User',
          filePath: 'test.ts',
          isExported: true,
          properties: [
            {
              name: 'address',
              type: {
                kind: 'object',
                properties: [
                  {
                    name: 'street',
                    type: { kind: 'primitive', type: 'string' },
                    isOptional: false,
                    isReadonly: false,
                    hasDefaultValue: false,
                  },
                  {
                    name: 'city',
                    type: { kind: 'primitive', type: 'string' },
                    isOptional: false,
                    isReadonly: false,
                    hasDefaultValue: false,
                  },
                ],
              },
              isOptional: false,
              isReadonly: false,
              hasDefaultValue: false,
            },
          ],
        };

        const result = generator.generate(parsedClass);
        expect(result).toContain(
          't.Object({ \n  address: t.Object({\n  street: t.String(),\n  city: t.String()\n}) })',
        );
      });
    });

    describe('union types', () => {
      test('should generate string literal union type', () => {
        const parsedClass: ParsedClass = {
          name: 'User',
          filePath: 'test.ts',
          isExported: true,
          properties: [
            {
              name: 'status',
              type: {
                kind: 'union',
                types: [
                  { kind: 'literal', value: 'active' },
                  { kind: 'literal', value: 'inactive' },
                ],
              },
              isOptional: false,
              isReadonly: false,
              hasDefaultValue: false,
            },
            {
              name: 'id',
              type: { kind: 'primitive', type: 'string' },
              isOptional: false,
              isReadonly: false,
              hasDefaultValue: false,
            },
          ],
        };

        const result = generator.generate(parsedClass);
        expect(result).toContain("t.Union([t.Literal('active'), t.Literal('inactive')])");
      });

      test('should generate number literal union type', () => {
        const parsedClass: ParsedClass = {
          name: 'User',
          filePath: 'test.ts',
          isExported: true,
          properties: [
            {
              name: 'priority',
              type: {
                kind: 'union',
                types: [
                  { kind: 'literal', value: 1 },
                  { kind: 'literal', value: 2 },
                  { kind: 'literal', value: 3 },
                ],
              },
              isOptional: false,
              isReadonly: false,
              hasDefaultValue: false,
            },
          ],
        };

        const result = generator.generate(parsedClass);
        expect(result).toContain('t.Union([t.Literal(1), t.Literal(2), t.Literal(3)])');
      });
    });

    describe('literal types', () => {
      test('should generate string literal type', () => {
        const parsedClass: ParsedClass = {
          name: 'User',
          filePath: 'test.ts',
          isExported: true,
          properties: [
            {
              name: 'status',
              type: { kind: 'literal', value: 'active' },
              isOptional: false,
              isReadonly: false,
              hasDefaultValue: false,
            },
          ],
        };

        const result = generator.generate(parsedClass);
        expect(result).toContain("t.Literal('active')");
      });

      test('should generate number literal type', () => {
        const parsedClass: ParsedClass = {
          name: 'User',
          filePath: 'test.ts',
          isExported: true,
          properties: [
            {
              name: 'priority',
              type: { kind: 'literal', value: 1 },
              isOptional: false,
              isReadonly: false,
              hasDefaultValue: false,
            },
          ],
        };

        const result = generator.generate(parsedClass);
        expect(result).toContain('t.Literal(1)');
      });

      test('should generate boolean literal type', () => {
        const parsedClass: ParsedClass = {
          name: 'User',
          filePath: 'test.ts',
          isExported: true,
          properties: [
            {
              name: 'isActive',
              type: { kind: 'literal', value: true },
              isOptional: false,
              isReadonly: false,
              hasDefaultValue: false,
            },
          ],
        };

        const result = generator.generate(parsedClass);
        expect(result).toContain('t.Literal(true)');
      });
    });

    describe('complete schema', () => {
      test('should generate complete schema with all features', () => {
        const parsedClass: ParsedClass = {
          name: 'User',
          filePath: 'test.ts',
          isExported: true,
          properties: [
            {
              name: 'id',
              type: { kind: 'primitive', type: 'string' },
              isOptional: false,
              isReadonly: false,
              hasDefaultValue: false,
            },
            {
              name: 'name',
              type: { kind: 'primitive', type: 'string' },
              isOptional: false,
              isReadonly: false,
              hasDefaultValue: false,
            },
            {
              name: 'age',
              type: { kind: 'primitive', type: 'number' },
              isOptional: true,
              isReadonly: false,
              hasDefaultValue: false,
            },
            {
              name: 'tags',
              type: {
                kind: 'array',
                elementType: { kind: 'primitive', type: 'string' },
              },
              isOptional: false,
              isReadonly: false,
              hasDefaultValue: false,
            },
          ],
        };

        const result = generator.generate(parsedClass);
        expect(result).toEqual(`import { t } from "elysia"

export const userSchema = t.Object({ 
  id: t.String(),
  name: t.String(),
  age: t.Optional(t.Number()),
  tags: t.Array(t.String()) });`);
      });
    });
  });
});
