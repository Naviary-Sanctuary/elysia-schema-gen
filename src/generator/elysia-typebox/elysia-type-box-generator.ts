import type { ParsedClass, Property, PropertyType } from '@types';
import type { SchemaGenerator } from '../schema-generator';

/**
 * Elysia TypeBox schema generator
 *
 * Generates TypeBox schema code from parsed Typescript classes.
 *
 * @see https://github.com/sinclairzx81/typebox
 */
export class ElysiaTypeBoxGenerator implements SchemaGenerator {
  supports(type: string): boolean {
    return type === 'typebox';
  }

  getImports(): string[] {
    return ['import { t } from "elysia"'];
  }

  generate(parsedClass: ParsedClass): string {
    const imports = this.getImports().join('\n');
    const schemaName = this.generateSchemaName(parsedClass.name);
    const properties = this.generateProperties(parsedClass.properties);

    return `${imports}\n\nexport const ${schemaName} = t.Object({ \n${properties} });`;
  }

  private generateSchemaName(className: string): string {
    const camelCase = className.charAt(0).toLowerCase() + className.slice(1);
    return `${camelCase}Schema`;
  }

  private generateProperties(properties: Property[]): string {
    return properties.map((prop) => this.generateProperty(prop)).join(',\n');
  }

  private generateProperty(property: Property): string {
    const typeCode = this.generateType(property.type);
    const code = property.isOptional ? `t.Optional(${typeCode})` : typeCode;
    return `  ${property.name}: ${code}`;
  }

  private generateType(type: PropertyType): string {
    switch (type.kind) {
      case 'primitive':
        return this.generatePrimitiveType(type.type);
      case 'array':
        return `t.Array(${this.generateType(type.elementType)})`;
      case 'object':
        return this.generateObjectType(type.properties);
      case 'union':
        return this.generateUnionType(type.types);
      case 'literal':
        return this.generateLiteralType(type.value);
      default:
        const _exhaustive: never = type;
        throw new Error(`Unsupported type: ${JSON.stringify(_exhaustive)}`);
    }
  }

  private generatePrimitiveType(type: 'string' | 'number' | 'boolean' | 'Date'): string {
    switch (type) {
      case 'string':
        return 't.String()';
      case 'number':
        return 't.Number()';
      case 'boolean':
        return 't.Boolean()';
      case 'Date':
        return 't.Date()';
      default:
        const _exhaustive: never = type;
        throw new Error(`Unsupported primitive type: ${JSON.stringify(_exhaustive)}`);
    }
  }

  private generateObjectType(properties: Property[]): string {
    const props = properties.map((prop) => this.generateProperty(prop)).join(',\n');
    return `t.Object({\n${props}\n})`;
  }

  private generateUnionType(types: PropertyType[]): string {
    const typeCodes = types.map((t) => this.generateType(t)).join(', ');
    return `t.Union([${typeCodes}])`;
  }

  private generateLiteralType(value: string | number | boolean): string {
    if (typeof value === 'string') {
      return `t.Literal('${value}')`;
    }
    return `t.Literal(${value})`;
  }
}
