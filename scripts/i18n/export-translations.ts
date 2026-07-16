import { parseArgs } from 'node:util';
import {
  buildExportSheets,
  DEFAULT_HANDOFF_PATH,
  parseCsvList,
  printExportReport,
  resolveNamespaces,
  resolveTargetLocales,
  runScript,
  writeReportFile,
  writeSpreadsheet,
} from './translation-handoff';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      out: { type: 'string', default: DEFAULT_HANDOFF_PATH },
      format: { type: 'string', default: 'xlsx' },
      locales: { type: 'string' },
      namespaces: { type: 'string' },
    },
  });

  const format: 'xlsx' | 'csv' = values.format === 'csv' ? 'csv' : 'xlsx';
  if (values.format !== 'xlsx' && values.format !== 'csv') {
    throw new Error('--format must be xlsx or csv');
  }

  let out = values.out ?? DEFAULT_HANDOFF_PATH;
  if (format === 'csv' && out.endsWith('.xlsx')) {
    out = out.replace(/\.xlsx$/i, '.csv');
  }

  const options = {
    out,
    format,
    locales: resolveTargetLocales(parseCsvList(values.locales)),
    namespaces: resolveNamespaces(parseCsvList(values.namespaces)),
  };

  const { sheets, report } = buildExportSheets(options);
  await writeSpreadsheet(sheets, options.out, options.format);

  const reportPath = `${options.out}.report.json`;
  writeReportFile(reportPath, report);

  printExportReport(report);
  console.log(`\nReport written to ${reportPath}`);
}

runScript(main);
