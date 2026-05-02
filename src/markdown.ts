export type Heading = {
  level: number;
  text: string;
  line: number;
};

const headingPattern = /^(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/;
const fencePattern = /^[ \t]*(`{3,}|~{3,})/;

export function parseHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  const lines = markdown.split(/\r?\n/);
  let activeFence: string | undefined;

  lines.forEach((line, index) => {
    const fence = line.match(fencePattern);
    if (fence) {
      const marker = fence[1] ?? "";
      const fenceChar = marker[0];
      if (!activeFence) {
        activeFence = fenceChar;
      } else if (activeFence === fenceChar) {
        activeFence = undefined;
      }
      return;
    }

    if (activeFence) {
      return;
    }

    const match = line.match(headingPattern);
    if (!match) {
      return;
    }

    headings.push({
      level: match[1].length,
      text: (match[2] ?? "").trim().replace(/[ \t]+#+[ \t]*$/, "").trim(),
      line: index + 1,
    });
  });

  return headings;
}

export function filterIgnoredHeadings(headings: Heading[], ignoredTexts: string[]): Heading[] {
  if (ignoredTexts.length === 0) {
    return headings;
  }

  const ignored = new Set(ignoredTexts);
  return headings.filter((heading) => !ignored.has(heading.text));
}
