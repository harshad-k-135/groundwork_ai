export function parseReport(markdown) {
  const text = (markdown || "").replace(/\r\n/g, "\n").trim();
  if (!text) {
    return { title: "", executiveSummary: "", findings: [], sources: [] };
  }

  const lines = text.split("\n");
  const titleLine = lines.find((line) => line.startsWith("# ")) || "# Research Report";
  const title = titleLine.replace(/^#\s*/, "").trim();

  const getBlock = (startMarker, endMarkers = []) => {
    const start = text.indexOf(startMarker);
    if (start === -1) {
      return "";
    }
    const from = start + startMarker.length;
    const tail = text.slice(from);
    let endOffset = tail.length;
    for (const marker of endMarkers) {
      const index = tail.indexOf(marker);
      if (index !== -1 && index < endOffset) {
        endOffset = index;
      }
    }
    return tail.slice(0, endOffset).trim();
  };

  const executiveSummary = getBlock("## Executive Summary", ["## Key Findings", "## Sources"]);
  const keyFindingsBlock = getBlock("## Key Findings", ["## Sources"]);
  const findings = keyFindingsBlock
    .split(/\n(?=###\s)/)
    .map((item) => item.trim())
    .filter((item) => item.startsWith("### "))
    .map((item) => {
      const [heading, ...bodyLines] = item.split("\n");
      return {
        heading: heading.replace(/^###\s*/, "").trim(),
        body: bodyLines.join("\n").trim(),
      };
    });

  const sourcesBlock = getBlock("## Sources");
  const sources = sourcesBlock
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^-\s*/, "").trim());

  return {
    title,
    executiveSummary,
    findings,
    sources,
  };
}
