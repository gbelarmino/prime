"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ChatMarkdownProps = {
  content: string;
  /** Bolha do utilizador (fundo âmbar, texto escuro). */
  inverted?: boolean;
};

function safeUrl(url: string): string {
  const value = url.trim();
  if (/^(https?:|mailto:)/i.test(value)) return value;
  return "";
}

export function ChatMarkdown({ content, inverted }: ChatMarkdownProps) {
  const text = inverted ? "text-stone-950" : "text-white/90";
  const muted = inverted ? "text-stone-800" : "text-white/70";
  const inlineCode = inverted ? "bg-stone-950/15 text-stone-950" : "bg-black/40 text-amber-100";
  const block = inverted ? "bg-black/20 text-stone-950" : "bg-black/40 text-white/90";
  const line = inverted ? "border-stone-950/20" : "border-white/15";

  const components: Components = {
    a: ({ href, children }) => {
      const safe = href ? safeUrl(href) : "";
      if (!safe) return <span>{children}</span>;
      return (
        <a href={safe} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
          {children}
        </a>
      );
    },
    p: ({ children }) => <p className={`my-2 leading-relaxed first:mt-0 last:mb-0 ${text}`}>{children}</p>,
    h1: ({ children }) => <h3 className={`mb-2 mt-3 text-base font-semibold first:mt-0 ${text}`}>{children}</h3>,
    h2: ({ children }) => <h3 className={`mb-2 mt-3 text-base font-semibold first:mt-0 ${text}`}>{children}</h3>,
    h3: ({ children }) => <h3 className={`mb-2 mt-3 text-sm font-semibold first:mt-0 ${text}`}>{children}</h3>,
    ul: ({ children }) => <ul className={`my-2 list-disc space-y-1 pl-5 ${text}`}>{children}</ul>,
    ol: ({ children }) => <ol className={`my-2 list-decimal space-y-1 pl-5 ${text}`}>{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote className={`my-2 border-l-2 pl-3 ${line} ${muted}`}>{children}</blockquote>
    ),
    hr: () => <hr className={`my-3 border-0 border-t ${line}`} />,
    pre: ({ children }) => (
      <pre className={`my-2 overflow-x-auto whitespace-pre rounded-lg px-3 py-2 text-[12px] leading-relaxed ${block}`}>
        {children}
      </pre>
    ),
    code: ({ className, children }) => {
      const blockCode = Boolean(className);
      if (blockCode) {
        return <code className={className}>{children}</code>;
      }
      return <code className={`rounded px-1 py-0.5 text-[12px] ${inlineCode}`}>{children}</code>;
    },
    table: ({ children }) => (
      <div className="my-2 overflow-x-auto">
        <table className={`w-full border-collapse text-left text-xs ${text}`}>{children}</table>
      </div>
    ),
    th: ({ children }) => <th className={`border px-2 py-1 font-semibold ${line}`}>{children}</th>,
    td: ({ children }) => <td className={`border px-2 py-1 align-top ${line}`}>{children}</td>,
  };

  return (
    <div className="max-w-none break-words text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={safeUrl} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
