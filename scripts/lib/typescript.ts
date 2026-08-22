import * as ts from 'typescript';
import { readProjectFile } from './files.js';

export function parseProjectSource(relativePath: string): ts.SourceFile {
  return ts.createSourceFile(
    relativePath,
    readProjectFile(relativePath),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}

export function stringLiteralUnionMembers(sourceFile: ts.SourceFile, typeName: string): Set<string> {
  const declaration = sourceFile.statements.find(
    (statement): statement is ts.TypeAliasDeclaration =>
      ts.isTypeAliasDeclaration(statement) && statement.name.text === typeName,
  );
  if (!declaration) return new Set();

  const nodes = ts.isUnionTypeNode(declaration.type) ? declaration.type.types : [declaration.type];
  return new Set(
    nodes.flatMap((node) => {
      if (!ts.isLiteralTypeNode(node) || !ts.isStringLiteral(node.literal)) return [];
      return [node.literal.text];
    }),
  );
}

export function hasDynamicImportTarget(sourceFile: ts.SourceFile, targetFragment: string): boolean {
  let found = false;

  const visit = (node: ts.Node): void => {
    if (found) return;
    if (
      ts.isCallExpression(node)
      && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && node.arguments.some((argument) => argument.getText(sourceFile).includes(targetFragment))
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return found;
}
