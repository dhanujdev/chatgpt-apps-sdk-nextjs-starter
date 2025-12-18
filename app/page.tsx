"use client";

import { useCallback, useMemo, useState } from "react";
import {
  useWidgetProps,
  useMaxHeight,
  useDisplayMode,
  useRequestDisplayMode,
  useOpenExternal,
  useCallTool,
} from "./hooks";

type PreviewWidgetProps = {
  previewHtml?: string;
  pdfUrl?: string;
  compiledAt?: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
};

export default function Home() {
  const { previewHtml, pdfUrl, compiledAt, toolName, toolArgs } =
    useWidgetProps<PreviewWidgetProps>({});
  const maxHeight = useMaxHeight() ?? undefined;
  const displayMode = useDisplayMode();
  const requestDisplayMode = useRequestDisplayMode();
  const openExternal = useOpenExternal();
  const callTool = useCallTool();
  const [isRegenerating, setIsRegenerating] = useState(false);

  const formattedCompiledAt = useMemo(
    () => (compiledAt ? new Date(compiledAt).toLocaleString() : null),
    [compiledAt]
  );

  const handleOpenExternal = useCallback(() => {
    if (pdfUrl) {
      openExternal(pdfUrl);
    }
  }, [openExternal, pdfUrl]);

  const handleRegenerate = useCallback(async () => {
    if (!toolName) {
      return;
    }

    setIsRegenerating(true);
    try {
      await callTool(toolName, toolArgs ?? {});
    } catch (error) {
      console.error("Failed to regenerate preview", error);
    } finally {
      setIsRegenerating(false);
    }
  }, [callTool, toolArgs, toolName]);

  return (
    <div
      className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center p-8 pb-20 gap-10 sm:p-16"
      style={{
        maxHeight,
        height: displayMode === "fullscreen" ? maxHeight : undefined,
      }}
    >
      {displayMode !== "fullscreen" && (
        <button
          aria-label="Enter fullscreen"
          className="fixed top-4 right-4 z-50 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-lg ring-1 ring-slate-900/10 dark:ring-white/10 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          onClick={() => requestDisplayMode("fullscreen")}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
            />
          </svg>
        </button>
      )}

      <main className="row-start-2 flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Document preview
            </p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
              Ready-to-share PDF and live HTML output
            </h1>
            {formattedCompiledAt && (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Compiled at {formattedCompiledAt}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              className={`inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 ${
                pdfUrl ? "" : "pointer-events-none opacity-60"
              }`}
              href={pdfUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              download={pdfUrl ? "" : undefined}
              aria-disabled={!pdfUrl}
            >
              Download PDF
            </a>
            <button
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              onClick={handleOpenExternal}
              disabled={!pdfUrl}
            >
              Open in new tab
            </button>
            <button
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              onClick={handleRegenerate}
              disabled={!toolName || isRegenerating}
            >
              {isRegenerating ? "Regenerating..." : "Regenerate"}
            </button>
          </div>
        </div>

        <div
          className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
          style={{ maxHeight }}
        >
          {previewHtml ? (
            <div
              className="w-full overflow-auto"
              style={{
                maxHeight:
                  maxHeight !== undefined ? Math.max(maxHeight - 160, 240) : undefined,
              }}
            >
              <div
                className="prose prose-sm max-w-none p-6 dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          ) : (
            <div className="flex min-h-[320px] items-center justify-center p-8 text-sm text-slate-600 dark:text-slate-300">
              Waiting for trusted preview content from the tool...
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
