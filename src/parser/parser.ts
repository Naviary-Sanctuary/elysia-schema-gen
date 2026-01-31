import { type ClassDeclaration, Project, PropertyDeclaration, Type } from 'ts-morph';
import type { ParsedClass, Property, PropertyType } from '../types';

/**
 * TypeScript class parser
 *
 * Parses TypeScript classes and extracts type information for schema generation.
 *
 * @example
 * ```typescript
 * const parser = new Parser();
 *
 * // Recommended: Parse entire file automatically
 * const classes = parser.parseFile('src/dto/user.ts');
 * // → [UserDTO, UserCreateDTO, UserUpdateDTO, ...]
 *
 * // All classes are ready for schema generation
 * for (const parsedClass of classes) {
 *   const schema = generator.generate(parsedClass);
 * }
 * ```
 */
export class Parser {
  private readonly project: Project;

  constructor(config?: { tsConfigPath?: string }) {
    this.project = new Project({
      tsConfigFilePath: config?.tsConfigPath ?? 'tsconfig.json',
    });
  }

  /**
   * Parse all exported classes from a TypeScript file
   *
   * **This is the primary API method.** It automatically discovers and parses
   * all exported classes in a file, so you don't need to know class names in advance.
   *
   * @param filePath - Path to the TypeScript file
   * @returns Array of parsed classes (only exported classes)
   *
   * @example
   * ```typescript
   * const parser = new Parser();
   *
   * // Automatically find and parse all exported classes
   * const classes = parser.parseFile('src/dto/user.ts');
   *
   * // Use with FileMatcher for batch processing
   * const matcher = new FileMatcher({ include: ['src/**\/*.ts'] });
   * const files = await matcher.find();
   *
   * const allClasses = files.flatMap(file => parser.parseFile(file));
   * // → All classes from all matched files
   * ```
   */
  parseFile(filePath: string): ParsedClass[] {
    const sourceFile = this.project.addSourceFileAtPath(filePath);
    sourceFile.getReferencedSourceFiles().forEach((ref) => {
      if (!this.project.getSourceFile(ref.getFilePath())) {
        this.project.addSourceFileAtPath(ref.getFilePath());
      }
    });

    const classes = sourceFile.getClasses();

    return classes
      .filter((classDeclaration) => classDeclaration.isExported())
      .map((classDeclaration) => {
        const className = classDeclaration.getName();
        if (!className) {
          throw new Error(`Found anonymous class in file '${filePath}'`);
        }

        return {
          name: className,
          filePath,
          isExported: true,
          properties: this.parseProperties(classDeclaration),
        };
      });
  }

  /**
   * Extract all properties from a class declaration
   *
   * @param classDeclaration - The class declaration to extract properties from
   * @returns Array of parsed properties
   */
  private parseProperties(classDeclaration: ClassDeclaration): Property[] {
    const properties = classDeclaration.getProperties();

    return properties.map((property) => this.parseProperty(property));
  }

  /**
   * Parse a single property declaration
   *
   * @param property - The property declaration to parse
   * @returns Parsed property information
   */
  private parseProperty(property: PropertyDeclaration): Property {
    return {
      name: property.getName(),
      type: this.parsePropertyType(property.getType()),
      isOptional: property.hasQuestionToken() ?? false,
      isReadonly: property.isReadonly(),
      hasDefaultValue: property.hasInitializer(),
    };
  }

  /**
   * Parse TypeScript type into our PropertyType structure
   *
   * This is the core type mapping logic that converts ts-morph's Type
   * into our custom PropertyType discriminated union.
   *
   * @param type - The TypeScript type to parse
   * @returns Parsed property type
   */
  private parsePropertyType(type: Type): PropertyType {
    const aliasSymbol = type.getAliasSymbol();
    if (aliasSymbol) {
      const compilerSymbol = aliasSymbol.compilerSymbol as any;

      if (compilerSymbol.links?.declaredType) {
        const declaredType = compilerSymbol.links.declaredType;
        const context = (type as any)._context;
        const wrappedType = context.compilerFactory.getType(declaredType);

        return this.parsePropertyType(wrappedType);
      }
    }

    // #region Check Primitive types
    if (type.isAny()) {
      return { kind: 'primitive', type: 'any' };
    }
    if (type.isNull()) {
      return { kind: 'primitive', type: 'null' };
    }
    if (type.isUndefined()) {
      return { kind: 'primitive', type: 'undefined' };
    }
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
      return { kind: 'array', elementType: this.parsePropertyType(arrayElementType) };
    }
    // #endregion

    // #region Check Union type
    if (type.isUnion()) {
      const unionTypes = type.getUnionTypes();
      return {
        kind: 'union',
        types: unionTypes.map((t) => this.parsePropertyType(t)),
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
            type: this.parsePropertyType(propertyType),
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
}
