type NormalizeOptions = {
  trim?: boolean;
  collapseWhitespace?: boolean;
  toLowerCase?: boolean;
};

export function normalizeText(value: string, options: NormalizeOptions = {}) {
  const { trim = true, collapseWhitespace = true, toLowerCase = false } = options;
  let result = value;
  if (trim) {
    result = result.trim();
  }
  if (collapseWhitespace) {
    result = result.replace(/\s+/g, " ");
  }
  if (toLowerCase) {
    result = result.toLowerCase();
  }
  return result;
}

export function normalizeIdentifier(value: string) {
  return normalizeText(value, { trim: true, collapseWhitespace: true });
}

export function normalizeType(value: string) {
  return normalizeText(value, { trim: true, collapseWhitespace: true, toLowerCase: true });
}

export function isTypeMatch(value: string, expected: string) {
  return normalizeType(value) === normalizeType(expected);
}

export function extractQuotedText(value: string) {
  const trimmed = value.trim();
  if (trimmed.length < 2) return null;
  const quote = trimmed[0];
  if ((quote !== '"' && quote !== "'") || trimmed[trimmed.length - 1] !== quote) {
    return null;
  }
  return trimmed.slice(1, -1);
}

export function parsePrintCall(input: string) {
  const trimmed = input.trim();
  const match = trimmed.match(/^print\s*\((.*)\)\s*$/);
  if (!match) {
    return { ok: false, reason: "missingParensOrPrint", text: "" };
  }
  const inner = match[1].trim();
  const text = extractQuotedText(inner);
  if (text === null) {
    return { ok: false, reason: "missingQuotes", text: "" };
  }
  return { ok: true, reason: "", text };
}

export type TypedAssignment = {
  name: string;
  type: string;
  value: string;
};

export function parseTypedAssignment(input: string): TypedAssignment | null {
  const match = input.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)\s*$/);
  if (!match) return null;
  return { name: match[1], type: match[2], value: match[3] };
}

export function parseAssignment(input: string) {
  const match = input.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)\s*$/);
  if (!match) return null;
  return { name: match[1], value: match[2] };
}

export function extractInputQuestion(value: string, wrap: "input" | "intInput") {
  if (wrap === "input") {
    const match = value.match(/^input\s*\(\s*(.+)\s*\)\s*$/);
    if (!match) return null;
    return extractQuotedText(match[1]);
  }
  const match = value.match(/^int\s*\(\s*input\s*\(\s*(.+)\s*\)\s*\)\s*$/);
  if (!match) return null;
  return extractQuotedText(match[1]);
}

export type PlaceholderCheckResult = {
  state: "correct" | "nameErr" | "vergleichErr" | "bothErr";
};

export function checkComparisonPlaceholder(
  input: string,
  operator: string,
  expectedName: string,
  namePosition: "left" | "right",
): PlaceholderCheckResult {
  const normalized = normalizeText(input, { trim: true, collapseWhitespace: true });
  if (!normalized) {
    return { state: "bothErr" };
  }
  if (!normalized.includes(operator)) {
    return { state: "vergleichErr" };
  }
  const parts = normalized.split(operator);
  if (parts.length !== 2) {
    return { state: "vergleichErr" };
  }
  const left = parts[0].trim();
  const right = parts[1].trim();
  if (namePosition === "left") {
    if (right !== "") {
      return { state: "vergleichErr" };
    }
    if (left !== expectedName) {
      return { state: "nameErr" };
    }
  } else {
    if (left !== "") {
      return { state: "vergleichErr" };
    }
    if (right !== expectedName) {
      return { state: "nameErr" };
    }
  }
  return { state: "correct" };
}
