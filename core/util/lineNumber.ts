/// Add line number to input code.
export function addLineNumber(input: string): string {
  const lines = input.split("\n");
  const digit = Math.floor(Math.log10(lines.length)) + 1;
  return lines
    .map((line, index) => `${String(index + 1).padStart(digit, " ")} | ${line}`)
    .join("\n");
}

/// Remove line number (if exists) to input code.
export function removeLineNumber(input: string): string {
  return input.replace(/^\s*\d+\s*\|\s/gm, "");
}
