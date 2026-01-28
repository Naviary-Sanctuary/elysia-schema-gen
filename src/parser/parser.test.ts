import { describe, expect, test } from 'bun:test';
import { parseClass } from './parser';
import type { Property } from '../types';

function findProperty(properties: Property[], propertyName: string): Property | undefined {
  return properties.find((property) => property.name === propertyName);
}

describe('Parser Test', () => {
  describe('parseClass', () => {
    const fixturePath = 'tests/fixtures';
    const simpleClassPath = `${fixturePath}/simple-class.ts`;
    const optionalClassPath = `${fixturePath}/optional-properties.ts`;
    const arrayClassPath = `${fixturePath}/array-properties.ts`;
    const nestedObjectClassPath = `${fixturePath}/nested-object.ts`;
    const readonlyClassPath = `${fixturePath}/readonly-properties.ts`;
    const defaultValuesClassPath = `${fixturePath}/default-values.ts`;
    const unionTypesClassPath = `${fixturePath}/union-types.ts`;

    describe('basic functionality', () => {
      test('should throw error if class not found', () => {
        expect(() => {
          parseClass(simpleClassPath, 'NonExistentClass');
        }).toThrow(`Class 'NonExistentClass' not found in file '${simpleClassPath}'`);
      });

      test('should detect exported classes', () => {
        const result = parseClass(simpleClassPath, 'User');
        expect(result.isExported).toBe(true);
      });

      test('should extract correct class name and file path', () => {
        const result = parseClass(simpleClassPath, 'User');
        expect(result.name).toBe('User');
        expect(result.filePath).toBe(simpleClassPath);
      });
    });

    describe('Parsing tests', () => {
      describe('Primitive types', () => {
        test('should parse string type', () => {
          const result = parseClass(simpleClassPath, 'User');
          const idProperty = findProperty(result.properties, 'id');

          expect(idProperty).toBeDefined();
          expect(idProperty?.type).toEqual({ kind: 'primitive', type: 'string' });
        });

        test('should parse number type', () => {
          const result = parseClass(simpleClassPath, 'User');
          const ageProperty = findProperty(result.properties, 'age');

          expect(ageProperty).toBeDefined();
          expect(ageProperty?.type).toEqual({ kind: 'primitive', type: 'number' });
        });

        test('should parse boolean type', () => {
          const result = parseClass(simpleClassPath, 'User');
          const isActiveProperty = findProperty(result.properties, 'isActive');

          expect(isActiveProperty).toBeDefined();
          expect(isActiveProperty?.type).toEqual({ kind: 'primitive', type: 'boolean' });
        });

        test('should parse Date type', () => {
          const result = parseClass(simpleClassPath, 'User');
          const createdAtProperty = findProperty(result.properties, 'createdAt');

          expect(createdAtProperty).toBeDefined();
          expect(createdAtProperty?.type).toEqual({ kind: 'primitive', type: 'Date' });
        });
      });

      describe('Optional properties', () => {
        test('should detect optional properties', () => {
          const result = parseClass(optionalClassPath, 'Product');

          const idProperty = findProperty(result.properties, 'id');
          expect(idProperty?.isOptional).toBe(false);

          const descriptionProperty = findProperty(result.properties, 'description');
          expect(descriptionProperty?.isOptional).toBe(true);

          const priceProperty = findProperty(result.properties, 'price');
          expect(priceProperty?.isOptional).toBe(false);
        });
      });

      describe('Array properties', () => {
        test('should parse string array', () => {
          const result = parseClass(arrayClassPath, 'Post');
          const tagsProperty = findProperty(result.properties, 'tags');

          expect(tagsProperty).toBeDefined();
          expect(tagsProperty?.type).toEqual({ kind: 'array', elementType: { kind: 'primitive', type: 'string' } });
        });

        test('should parse number array', () => {
          const result = parseClass(arrayClassPath, 'Post');
          const scoresProperty = findProperty(result.properties, 'scores');

          expect(scoresProperty).toBeDefined();
          expect(scoresProperty?.type).toEqual({ kind: 'array', elementType: { kind: 'primitive', type: 'number' } });
        });
      });

      describe('Nested objects', () => {
        test('should parse nested object type', () => {
          const result = parseClass(nestedObjectClassPath, 'UserProfile');

          const addressProperty = findProperty(result.properties, 'address');
          expect(addressProperty).toBeDefined();
          expect(addressProperty?.type.kind).toEqual('object');

          if (addressProperty?.type.kind === 'object') {
            const streetProperty = findProperty(addressProperty?.type.properties, 'street');
            expect(streetProperty).toBeDefined();
            expect(streetProperty?.type).toEqual({ kind: 'primitive', type: 'string' });

            const cityProperty = findProperty(addressProperty?.type.properties, 'city');
            expect(cityProperty).toBeDefined();
            expect(cityProperty?.type).toEqual({ kind: 'primitive', type: 'string' });

            const zipCodeProperty = findProperty(addressProperty?.type.properties, 'zipCode');
            expect(zipCodeProperty).toBeDefined();
            expect(zipCodeProperty?.type).toEqual({ kind: 'primitive', type: 'number' });
          }
        });
      });

      describe('Readonly properties', () => {
        test('should parse readonly properties', () => {
          const result = parseClass(readonlyClassPath, 'Entity');
          const nameProperty = findProperty(result.properties, 'name');
          expect(nameProperty).toBeDefined();
          expect(nameProperty?.isReadonly).toBe(false);

          const idProperty = findProperty(result.properties, 'id');
          expect(idProperty).toBeDefined();
          expect(idProperty?.isReadonly).toBe(true);
        });
      });

      describe('Default values', () => {
        test('should detect properties with default values', () => {
          const result = parseClass(defaultValuesClassPath, 'Config');
          const hostProperty = findProperty(result.properties, 'host');
          expect(hostProperty).toBeDefined();
          expect(hostProperty?.hasDefaultValue).toBe(true);

          const portProperty = findProperty(result.properties, 'port');
          expect(portProperty).toBeDefined();
          expect(portProperty?.hasDefaultValue).toBe(true);
        });
      });

      describe('Union types', () => {
        test('should parse number literal union types', () => {
          const result = parseClass(unionTypesClassPath, 'Task');

          const priorityProperty = findProperty(result.properties, 'priority');
          expect(priorityProperty).toBeDefined();
          expect(priorityProperty?.type).toEqual({
            kind: 'union',
            types: [
              { kind: 'literal', value: 1 },
              { kind: 'literal', value: 2 },
              { kind: 'literal', value: 3 },
            ],
          });
        });

        test('should parse string literal union types', () => {
          const result = parseClass(unionTypesClassPath, 'Task');
          const statusProperty = findProperty(result.properties, 'status');
          expect(statusProperty).toBeDefined();
          expect(statusProperty?.type).toEqual({
            kind: 'union',
            types: [
              { kind: 'literal', value: 'pending' },
              { kind: 'literal', value: 'active' },
              { kind: 'literal', value: 'completed' },
            ],
          });
        });
      });
    });

    describe('Complete class parsing', () => {
      test('should parse all properties correctly', () => {
        const result = parseClass(simpleClassPath, 'User');

        expect(result.properties.length).toBe(5);
        expect(result.properties).toEqual([
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
            isOptional: false,
            isReadonly: false,
            hasDefaultValue: false,
          },
          {
            name: 'isActive',
            type: { kind: 'primitive', type: 'boolean' },
            isOptional: false,
            isReadonly: false,
            hasDefaultValue: false,
          },
          {
            name: 'createdAt',
            type: { kind: 'primitive', type: 'Date' },
            isOptional: false,
            isReadonly: false,
            hasDefaultValue: false,
          },
        ]);
      });
    });
  });
});
