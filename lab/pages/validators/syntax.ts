import path from 'node:path';
import { SITE, nodeCheck, walk, type JavaScriptSyntaxMode } from '../lib/core.js';

interface SyntaxRoot {
  readonly directory: string;
  readonly mode: JavaScriptSyntaxMode;
}

const SYNTAX_ROOTS: readonly SyntaxRoot[] = [
  { directory: path.join(SITE, 'override'), mode: 'module' },
  { directory: path.join(SITE, '_pages'), mode: 'classic' },
];

export function validateJsSyntax(): void {
  for (const root of SYNTAX_ROOTS) {
    const files = walk(root.directory).filter((file) => file.endsWith('.js'));
    for (const file of files) nodeCheck(file, root.mode);
  }
}
