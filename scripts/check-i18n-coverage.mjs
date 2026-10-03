import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const sourceRoot = path.resolve("client/src");
const englishPath = path.join(sourceRoot, "i18n-en.ts");
const englishFile = ts.createSourceFile(englishPath, fs.readFileSync(englishPath, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const englishKeys = new Set();
const missing = new Map();
const files = [];

function hasArabic(value) {
  return /[\u0600-\u06ff]/.test(value);
}

function collectEnglishKeys(node) {
  if (ts.isPropertyAssignment(node) && ts.isStringLiteral(node.name)) englishKeys.add(node.name.text);
  ts.forEachChild(node, collectEnglishKeys);
}

function collectFiles(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectFiles(filePath);
    else if (/\.(ts|tsx)$/.test(filePath) && filePath !== englishPath) files.push(filePath);
  }
}

function visitSource(node, sourceFile) {
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "translate") {
    const argument = node.arguments[0];
    if (argument && ts.isStringLiteral(argument) && hasArabic(argument.text) && !englishKeys.has(argument.text)) {
      const key = argument.text;
      const location = sourceFile.getLineAndCharacterOfPosition(argument.getStart(sourceFile)).line + 1;
      const file = path.relative(sourceRoot, sourceFile.fileName).split(path.sep).join("/");
      missing.set(key, `${file}:${location} :: ${key}`);
    }
  }
  ts.forEachChild(node, (child) => visitSource(child, sourceFile));
}

collectEnglishKeys(englishFile);
collectFiles(sourceRoot);
for (const filePath of files) {
  const source = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  visitSource(sourceFile, sourceFile);
}

console.log(`Missing English entries: ${missing.size}`);
console.log([...missing.values()].sort().join("\n"));