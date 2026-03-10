import React from "react";

// Markdown-naar-JSX renderer — herbruikbaar component
// Ondersteunt: headings, bold/italic, tabellen, bullets, genummerde lijsten, horizontale regels
export default function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");

  function renderInline(text: string): React.ReactNode[] {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**"))
        return <em key={i}>{part.slice(1, -1)}</em>;
      return <span key={i}>{part}</span>;
    });
  }

  function parseCells(line: string): string[] {
    return line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
  }
  function isSeparator(line: string): boolean {
    return /^\|?[\s:]*-{2,}[\s:]*(\|[\s:]*-{2,}[\s:]*)*\|?$/.test(line.trim());
  }

  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { elements.push(<div key={i} className="h-2" />); i++; continue; }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      elements.push(<hr key={i} className="border-t border-gray-200 my-3" />);
      i++; continue;
    }

    // Table: lines starting with |
    if (trimmed.startsWith("|")) {
      const tableLines: string[] = [];
      const startI = i;
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      if (tableLines.length >= 2) {
        const dataLines = tableLines.filter((l) => !isSeparator(l));
        const headerCells = parseCells(dataLines[0]);
        const bodyRows = dataLines.slice(1);
        elements.push(
          <div key={startI} className="overflow-x-auto my-3">
            <table className="w-full text-sm border-collapse border border-gray-200 rounded-lg">
              <thead>
                <tr className="bg-cito-blue/5">
                  {headerCells.map((cell, ci) => (
                    <th key={ci} className="px-3 py-2 text-left text-xs font-semibold text-cito-blue border border-gray-200">
                      {renderInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 1 ? "bg-gray-50" : ""}>
                    {parseCells(row).slice(0, headerCells.length).map((cell, ci) => (
                      <td key={ci} className="px-3 py-1.5 text-gray-700 border border-gray-200">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
      // Single pipe line — treat as text
      elements.push(<p key={startI} className="text-sm text-gray-700 mb-1">{renderInline(tableLines[0])}</p>);
      continue;
    }

    // # H1
    if (trimmed.startsWith("# ")) {
      elements.push(<h2 key={i} className="text-lg font-bold text-cito-blue mt-5 mb-2 border-b border-cito-blue/20 pb-1">{renderInline(trimmed.slice(2))}</h2>);
      i++; continue;
    }
    // ## H2
    if (trimmed.startsWith("## ")) {
      elements.push(<h3 key={i} className="text-base font-bold text-cito-blue mt-4 mb-1.5">{renderInline(trimmed.slice(3))}</h3>);
      i++; continue;
    }
    // ### H3
    if (trimmed.startsWith("### ")) {
      elements.push(<h4 key={i} className="text-sm font-bold text-gray-800 mt-3 mb-1">{renderInline(trimmed.slice(4))}</h4>);
      i++; continue;
    }
    // #### H4
    if (trimmed.startsWith("#### ")) {
      elements.push(<h5 key={i} className="text-sm font-semibold text-gray-600 mt-2 mb-1">{renderInline(trimmed.slice(5))}</h5>);
      i++; continue;
    }
    // Numbered heading: 1. **Tekst**
    const numberedBold = trimmed.match(/^(\d+)\.\s+\*\*(.+?)\*\*:?\s*(.*)/);
    if (numberedBold) {
      elements.push(<h4 key={i} className="text-sm font-bold text-cito-blue mt-3 mb-1">{numberedBold[1]}. {numberedBold[2]}{numberedBold[3] ? `: ${numberedBold[3]}` : ""}</h4>);
      i++; continue;
    }
    // Numbered list item (no bold): 1. text
    const numberedItem = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (numberedItem) {
      elements.push(
        <div key={i} className="flex items-start gap-2 ml-4 mb-0.5">
          <span className="text-cito-blue font-semibold shrink-0">{numberedItem[1]}.</span>
          <span className="text-sm text-gray-700 leading-relaxed">{renderInline(numberedItem[2])}</span>
        </div>
      );
      i++; continue;
    }
    // Sub-bullet (indented)
    const subBullet = line.match(/^(\s{2,}|\t+)[-*]\s+(.*)/);
    if (subBullet) {
      elements.push(
        <div key={i} className="flex items-start gap-2 ml-8 mb-0.5">
          <span className="text-gray-400 mt-0.5 shrink-0">◦</span>
          <span className="text-xs text-gray-600 leading-relaxed">{renderInline(subBullet[2])}</span>
        </div>
      );
      i++; continue;
    }
    // Bullet: - or *
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      elements.push(
        <div key={i} className="flex items-start gap-2 ml-4 mb-0.5">
          <span className="text-cito-blue mt-1 shrink-0">&bull;</span>
          <span className="text-sm text-gray-700 leading-relaxed">{renderInline(trimmed.slice(2))}</span>
        </div>
      );
      i++; continue;
    }
    // Regular text
    elements.push(<p key={i} className="text-sm text-gray-700 leading-relaxed mb-1">{renderInline(trimmed)}</p>);
    i++;
  }

  return <div>{elements}</div>;
}
