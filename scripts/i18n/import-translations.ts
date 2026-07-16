import { parseArgs } from 'node:util';
import {
  DEFAULT_HANDOFF_PATH,
  importTranslations,
  printImportReport,
  runScript,
  writeReportFile,
} from './translation-handoff';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      file: { type: 'string', default: DEFAULT_HANDOFF_PATH },
      'dry-run': { type: 'boolean', default: false },
    },
  });

  const file = values.file ?? DEFAULT_HANDOFF_PATH;

  const report = await importTranslations({
    file,
    dryRun: values['dry-run'] ?? false,
  });
  printImportReport(report);

  const reportPath = `${file}.import-report.json`;
  writeReportFile(reportPath, report);
  console.log(`\nReport written to ${reportPath}`);

  if (report.skipped.placeholder_mismatch.length > 0) {
    process.exit(1);
  }
}

runScript(main);
