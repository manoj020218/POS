import type { ReceiptPrinterProfile } from './printer-profile.js';

const printerColumns = {
  '58mm': 32,
  '80mm': 48
} as const;

const normalizeWhitespace = (value: string) => value.trim().replace(/\s+/g, ' ');

const splitLongWord = (word: string, width: number) => {
  const parts: string[] = [];

  for (let index = 0; index < word.length; index += width) {
    parts.push(word.slice(index, index + width));
  }

  return parts;
};

export const getPrinterColumns = (profile: ReceiptPrinterProfile) => printerColumns[profile.paperWidth];

export const createDividerLine = (profile: ReceiptPrinterProfile) =>
  '-'.repeat(getPrinterColumns(profile));

export const wrapText = (value: string, width: number) => {
  const paragraphs = value
    .split('\n')
    .map((line) => normalizeWhitespace(line))
    .filter((line, index, lines) => line.length > 0 || lines.length === 1);

  return paragraphs.flatMap((paragraph) => {
    if (paragraph.length === 0) {
      return [''];
    }

    const words = paragraph.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (word.length > width) {
        if (currentLine.length > 0) {
          lines.push(currentLine);
          currentLine = '';
        }

        lines.push(...splitLongWord(word, width));
        continue;
      }

      const nextLine = currentLine.length === 0 ? word : `${currentLine} ${word}`;

      if (nextLine.length > width) {
        lines.push(currentLine);
        currentLine = word;
        continue;
      }

      currentLine = nextLine;
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines;
  });
};

export const formatColumns = (left: string, right: string, width: number) => {
  const rightText = normalizeWhitespace(right);

  if (rightText.length === 0) {
    return wrapText(left, width);
  }

  const maxLeftWidth = Math.max(width - rightText.length - 1, 8);
  const leftLines = wrapText(left, maxLeftWidth);
  const lastLeftLine = leftLines.pop() ?? '';
  const padding = Math.max(width - lastLeftLine.length - rightText.length, 1);

  return [...leftLines, `${lastLeftLine}${' '.repeat(padding)}${rightText}`];
};
