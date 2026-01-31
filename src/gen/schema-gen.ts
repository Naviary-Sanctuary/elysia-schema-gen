import { FileMatcher, FileWriter } from '../files';
import { TypeBoxGenerator, type SchemaGenerator } from '../generator';
import { Parser } from '../parser';
import type { Config, GenerateResult, MappingRule, SchemaGenerationResult, SchemaGenOptions } from '@types';

export class SchemaGen {
  private readonly generator: SchemaGenerator;
  private readonly config: Config;
  private readonly options: SchemaGenOptions;
  private readonly parser: Parser;

  constructor(config: Config, options: SchemaGenOptions = {}) {
    this.config = config;
    this.options = options;
    this.parser = new Parser({ tsConfigPath: config.tsConfigPath });
    this.generator = this.createGenerator();
  }

  /**
   * Create appropriate schema generator based on config
   *
   * Factory method that instantiates the correct generator
   * based on the configuration's generator type.
   *
   * @returns Schema generator instance
   * @throws Error if generator type is unsupported
   */
  private createGenerator(): SchemaGenerator {
    switch (this.config.generator) {
      case 'elysia':
        return new TypeBoxGenerator('elysia');
      case 'typebox':
        return new TypeBoxGenerator('typebox');
      default:
        const _exhaustive: never = this.config.generator;
        throw new Error(`Unsupported generator: ${_exhaustive}`);
    }
  }

  async run(): Promise<GenerateResult> {
    const schemaGenerationResults = await Promise.all(
      this.config.mappings.map(async (mapping) => await this.processMapping(mapping)),
    ).then((results) => results.flat());

    const filesProcessed = new Set(schemaGenerationResults.map((r) => r.sourcePath)).size;
    const schemasGenerated = schemaGenerationResults.length;
    const filesCreated = schemaGenerationResults.filter((r) => r.created).length;
    const filesOverwritten = schemaGenerationResults.filter((r) => !r.created).length;

    const result: GenerateResult = {
      schemas: schemaGenerationResults,
      filesProcessed,
      schemasGenerated,
      filesCreated,
      filesOverwritten,
    };
    this.options.onProgress?.({ type: 'complete', result });

    return result;
  }

  private async processMapping(mapping: MappingRule): Promise<SchemaGenerationResult[]> {
    const matcher = new FileMatcher({
      include: mapping.include,
      exclude: this.config.exclude,
    });

    const files = await matcher.find();

    this.options.onProgress?.({ type: 'start', totalFiles: files.length });

    const writer = new FileWriter({
      pattern: mapping.output.pattern,
      mode: this.config.mode,
    });

    const results = await Promise.all(
      files.map((file, index) =>
        this.processFile({ filePath: file, sequence: index + 1, total: files.length, writer }),
      ),
    ).then((results) => results.flat());

    return results;
  }

  private async processFile({
    filePath,
    sequence,
    total,
    writer,
  }: {
    filePath: string;
    sequence: number;
    total: number;
    writer: FileWriter;
  }): Promise<SchemaGenerationResult[]> {
    this.options.onProgress?.({ type: 'file-processing', filePath, current: sequence, total });

    const parsedClasses = this.parser.parseFile(filePath);

    const schemas = parsedClasses.map((parsedClass) => ({
      code: this.generator.generate(parsedClass),
      sourcePath: filePath,
      schemaName: this.generator.generateSchemaName(parsedClass.name),
    }));

    const writeResults = await writer.write(schemas);

    const results = schemas
      .map((schema, i) => {
        const writeResult = writeResults[i];
        if (!writeResult) return null;

        return {
          sourcePath: schema.sourcePath,
          outputPath: writeResult.filePath,
          schemaName: schema.schemaName,
          created: writeResult.created,
        };
      })
      .filter((result): result is SchemaGenerationResult => result !== null);

    this.options.onProgress?.({ type: 'file-complete', filePath, schemasGenerated: results.length });

    return results;
  }
}
