import cac from 'cac';
import pc from 'picocolors';
import { ConfigLoader } from './config';
import { SchemaGen } from './gen/schema-gen';
import { ConfigNotFoundError, ConfigParseError, ConfigValidationError } from './libs/errors';

const cli = cac('schema-gen');

// #region Init Command
cli.command('init', 'Create a default config file').action(async () => {
  try {
    const configPath = 'schema-gen.config.json';
    if (await Bun.file(configPath).exists()) {
      console.log(pc.yellow('⚠ Config file already exists\n'));
      process.exit(0);
    }

    const defaultConfig = {
      mappings: [
        {
          include: ['src/**/*.ts'],
          output: {
            pattern: 'schemas/{filename}.schema.ts',
          },
        },
      ],
      generator: 'elysia',
      exclude: ['**/*.test.ts', '**/*.spec.ts'],
    };

    await Bun.write(configPath, JSON.stringify(defaultConfig, null, 2) + '\n');

    console.log(pc.green('✓ Created schema-gen.config.json'));
    console.log(pc.gray('\n  Next steps:'));
    console.log(pc.gray('  1. Edit schema-gen.config.json to configure your mappings'));
    console.log(pc.gray('  2. Run: schema-gen'));
  } catch (err) {
    handleError(err);
    process.exit(1);
  }
});
// #endregion

// #region Generate Command
cli
  .command('generate [config]', 'Generate schemas from classes')
  .option('-c, --config <path>', 'Path to the config file', {
    default: 'schema-gen.config.json',
  })
  .action(async (configPath: string) => {
    try {
      const loader = new ConfigLoader(configPath);
      const config = await loader.load();

      console.log(pc.cyan('-> Generating schemas...\n'));

      const gen = new SchemaGen(config);
      const result = await gen.run();

      console.log(pc.green('\n✓ Success!'));
      console.log(pc.cyan(`  Files processed:   ${result.filesProcessed}`));
      console.log(pc.cyan(`  Schemas generated: ${result.schemasGenerated}`));
      console.log(pc.cyan(`  Files created:     ${result.filesCreated}`));
      console.log(pc.cyan(`  Files overwritten: ${result.filesOverwritten}`));
    } catch (err) {
      handleError(err);
      process.exit(1);
    }
  });
// #endregion

// #region Help and Version
cli.help();

import packageJson from '../package.json';
cli.version(packageJson.version);
// #endregion

cli.parse();

// #region Helper Functions
function handleError(error: unknown): void {
  if (error instanceof ConfigNotFoundError) {
    console.error(pc.red('✗ Config file not found\n'));
    console.error(pc.gray('  Create a config file by running:'));
    console.error(pc.gray('  $ schema-gen init\n'));
  } else if (error instanceof ConfigParseError) {
    console.error(pc.red('✗ Invalid JSON in config file\n'));
    console.error(pc.gray(`  ${error.message}\n`));
  } else if (error instanceof ConfigValidationError) {
    console.error(pc.red('✗ Invalid configuration\n'));
    console.error(pc.gray(`  ${error.message}\n`));
  } else if (error instanceof Error) {
    console.error(pc.red('✗ Error\n'));
    console.error(pc.gray(`  ${error.message}\n`));

    // Stack trace는 개발 모드일 때만
    if (process.env.DEBUG) {
      console.error(pc.gray('\nStack trace:'));
      console.error(pc.gray(error.stack || 'No stack trace available'));
    }
  } else {
    console.error(pc.red('✗ Unexpected error\n'));
    console.error(error);
  }
}
// #endregion
