const citationSplitRegex = /([A-Z][a-z]+ et al\. \d{4}(?:\s*\[unverified\])?)/g;
const citationMatchRegex = /^[A-Z][a-z]+ et al\. \d{4}(?:\s*\[unverified\])?$/;

export function highlightCitations(text) {
  const parts = (text || "").split(citationSplitRegex);
  return parts.map((part, index) => {
    if (citationMatchRegex.test(part)) {
      const numMatch = part.match(/\[(\d+)\]/);
      const displayNum = numMatch ? numMatch[1] : String(index);
      return (
        <span
          key={`cite-${index}`}
          className="inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded bg-accent/15 px-1.5 font-mono text-[10px] font-medium text-accent"
          title={part}
        >
          {displayNum}
        </span>
      );
    }
    return <span key={`text-${index}`}>{part}</span>;
  });
}
