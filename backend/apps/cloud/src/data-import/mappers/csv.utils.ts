import { createReadStream } from 'fs'
import { pipeline } from 'stream/promises'
import { parse, Options } from 'csv-parse'

import { ImportError } from './mapper.interface'

export async function* readCsvRows(
  filePath: string,
  options: Options = {},
): AsyncIterable<Record<string, string>> {
  const input = createReadStream(filePath)
  const parser = parse({
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true,
    max_record_size: 1024 * 1024,
    ...options,
  })
  const completion = pipeline(input, parser).catch(() => {})

  try {
    for await (const row of parser) yield row
  } catch (error) {
    if (error instanceof ImportError) throw error
    throw new ImportError(
      'Could not read the import CSV. Please check the export and upload it again.',
    )
  } finally {
    input.destroy()
    parser.destroy()
    await completion
  }
}
