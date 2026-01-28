import { type ClassDeclaration, Project, PropertyDeclaration, Type } from 'ts-morph';
import type { ParsedClass, Property, PropertyType } from '../types';

/**
 * Parse a Typescript class from a file and extract tis information
 *
 * @param filePath - Path to the Typescript file
 * @param className  - Name of the class to parse
 * @returns Parsed class information
 *
 * @example
 * ```typescript
 * const result = parseClass('src/dto/user.ts', 'User');
 * // Returns: ParsedClass with all properties extracted
 * ```
 */
export function parseClass(filePath: string, className: string): ParsedClass {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(filePath);

  const classDeclaration = sourceFile.getClass(className);
  if (!classDeclaration) {
    throw new Error(`Class '${className}' not found in file '${filePath}'`);
  }

  return {
    name: className,
    filePath,
    isExported: classDeclaration.isExported(),
    properties: parseProperties(classDeclaration),
  };
}

/**
 * Extract all properties from a class declaration
 */
function parseProperties(classDeclaration: ClassDeclaration): Property[] {
  const properties = classDeclaration.getProperties();

  return properties.map(parseProperty);
}

/**
 * Parse a single property declaration
 */
function parseProperty(property: PropertyDeclaration): Property {
  return {
    name: property.getName(),
    type: parserPropertyType(property.getType()),
    isOptional: property.hasQuestionToken() ?? false,
    isReadonly: property.isReadonly(),
    hasDefaultValue: property.hasInitializer(),
  };
}

/**
 * Parse Typescript type into our PropertyType structure
 *
 * This is the core type mapping logic that converts ts-morph's Type
 * into our custom PropertyType discriminated union.
 */
function parserPropertyType(type: Type): PropertyType {
  // #region Check Primitive types
  if (type.isString()) {
    return { kind: 'primitive', type: 'string' };
  }
  if (type.isNumber()) {
    return { kind: 'primitive', type: 'number' };
  }
  if (type.isBoolean()) {
    return { kind: 'primitive', type: 'boolean' };
  }
  // #endregion

  // #region Check Date type
  const typeText = type.getText();
  if (typeText === 'Date') {
    return { kind: 'primitive', type: 'Date' };
  }
  // #endregion

  // #region Check Array type
  if (type.isArray()) {
    const arrayElementType = type.getArrayElementTypeOrThrow();
    return { kind: 'array', elementType: parserPropertyType(arrayElementType) };
  }
  // #endregion

  // #region Check Union type
  if (type.isUnion()) {
    const unionTypes = type.getUnionTypes();
    return {
      kind: 'union',
      types: unionTypes.map(parserPropertyType),
    };
  }
  // #endregion

  // #region Check Literal type
  if (type.isLiteral()) {
    const literalValue = type.getLiteralValue();
    if (typeof literalValue === 'string' || typeof literalValue === 'number' || typeof literalValue === 'boolean') {
      return { kind: 'literal', value: literalValue };
    }
  }
  // #endregion

  // #region Check Object type (including type literals and interfaces)
  if (type.isObject()) {
    const properties = type.getProperties();
    return {
      kind: 'object',
      properties: properties.map((symbol) => {
        const [declaration] = symbol.getDeclarations();
        if (!declaration) {
          throw new Error(`No declaration found for property ${symbol.getName()}`);
        }

        let propertyType: Type;
        if ('getType' in declaration && typeof declaration.getType === 'function') {
          propertyType = declaration.getType();
        } else {
          throw new Error(`Cannot get type for property ${symbol.getName()}`);
        }

        return {
          name: symbol.getName(),
          type: parserPropertyType(propertyType),
          isOptional: symbol.isOptional() ?? false,
          isReadonly: false,
          hasDefaultValue: false,
        };
      }),
    };
  }
  // #endregion

  throw new Error(`Unsupported type: ${type.getText()}`);
}
