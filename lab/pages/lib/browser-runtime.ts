import path from 'node:path';
import * as ts from 'typescript';
import { ROOT, assert, read } from './core.js';

export type BrowserRuntimeMode = 'classic' | 'module';

function diagnosticsText(diagnostics: readonly ts.Diagnostic[] | undefined): string {
  return (diagnostics ?? [])
    .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
    .join('\n');
}

export function transpileBrowserRuntime(relativePath: string, mode: BrowserRuntimeMode): string {
  const source = read(path.join(ROOT, relativePath));
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: mode === 'module' ? ts.ModuleKind.ES2022 : ts.ModuleKind.None,
      removeComments: false,
      alwaysStrict: false,
    },
    fileName: relativePath,
    reportDiagnostics: true,
  });

  const errors = diagnosticsText(result.diagnostics);
  assert(!errors, `Browser runtime transpile failed for ${relativePath}:\n${errors}`);
  const output = result.outputText.trim();
  assert(output.length > 0, `Browser runtime transpile produced no output: ${relativePath}`);

  if (mode === 'classic') {
    assert(!/^\s*(?:import|export)\b/m.test(output), `Classic runtime contains module syntax: ${relativePath}`);
    assert(!/["']use strict["']/.test(output), `Classic runtime contains a generated strict-mode directive: ${relativePath}`);
  }
  return output;
}
