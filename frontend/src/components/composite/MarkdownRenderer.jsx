import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const SAMPLE = `# Heading One

A paragraph with **bold**, *italic*, and \`inline code\`.

- List item one
- List item two

> A blockquote placeholder.

| Column A | Column B |
| --- | --- |
| One | Two |
`;

export function MarkdownRenderer({ source = SAMPLE }) {
  return (
    <div
      data-testid="markdown"
      className="w-full max-w-md text-sm leading-relaxed
        [&>*:first-child]:mt-0
        [&_a]:underline [&_a]:underline-offset-2
        [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground
        [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs
        [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-lg [&_h1]:font-semibold
        [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-semibold
        [&_li]:my-1
        [&_p]:my-2
        [&_table]:my-2 [&_table]:w-full [&_table]:border
        [&_td]:border [&_td]:px-2 [&_td]:py-1
        [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left
        [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
    </div>
  );
}
