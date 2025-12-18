"use client";

import { FormEvent, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  useWidgetProps,
  useMaxHeight,
  useDisplayMode,
  useRequestDisplayMode,
  useIsChatGptApp,
  useCallTool,
  useWidgetState,
} from "./hooks";

type ResumeFormState = {
  name: string;
  role: string;
  summary: string;
  bulletPoints: string;
  previewHtml: string | null;
  pdfUrl: string | null;
};

type ResumeToolResponse = {
  result?: {
    structuredContent?: {
      previewHtml?: string;
      pdfUrl?: string;
    };
  };
};

const DEFAULT_RESUME_STATE: ResumeFormState = {
  name: "",
  role: "",
  summary: "",
  bulletPoints: "",
  previewHtml: null,
  pdfUrl: null,
};

export default function Home() {
  const toolOutput = useWidgetProps<{
    name?: string;
    result?: { structuredContent?: { name?: string } };
  }>();
  const maxHeight = useMaxHeight() ?? undefined;
  const displayMode = useDisplayMode();
  const requestDisplayMode = useRequestDisplayMode();
  const isChatGptApp = useIsChatGptApp();
  const callTool = useCallTool();
  const [resumeState, setResumeState] = useWidgetState<ResumeFormState>(
    DEFAULT_RESUME_STATE
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = toolOutput?.result?.structuredContent?.name || toolOutput?.name;
  const formState = useMemo(
    () => resumeState ?? DEFAULT_RESUME_STATE,
    [resumeState]
  );

  const updateFormField = <K extends keyof ResumeFormState>(key: K) =>
    (value: ResumeFormState[K]) =>
      setResumeState((previous) => ({
        ...(previous ?? DEFAULT_RESUME_STATE),
        [key]: value,
      }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Clear the previous output so the UI reflects the new pending request.
    setResumeState((previous) => ({
      ...(previous ?? DEFAULT_RESUME_STATE),
      previewHtml: null,
      pdfUrl: null,
    }));

    try {
      const parsedBulletPoints = formState.bulletPoints
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      const response = await callTool("generate_resume", {
        name: formState.name,
        role: formState.role,
        summary: formState.summary,
        bulletPoints: parsedBulletPoints,
      });

      if (!response) {
        setError("Tool invocation is unavailable in this environment.");
        return;
      }

      const structuredContent = (response as ResumeToolResponse)?.result?.structuredContent;

      if (!structuredContent) {
        setError("Resume generation did not return structured content.");
        return;
      }

      setResumeState((previous) => ({
        ...(previous ?? DEFAULT_RESUME_STATE),
        previewHtml: structuredContent.previewHtml ?? null,
        pdfUrl: structuredContent.pdfUrl ?? null,
      }));
    } catch (err) {
      console.error(err);
      setError("Failed to generate resume. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center p-8 pb-20 gap-16 sm:p-20"
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
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        {!isChatGptApp && (
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 w-full">
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                  This app relies on data from a ChatGPT session.
                </p>
                <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                  No{" "}
                  <a
                    href="https://developers.openai.com/apps-sdk/reference"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:no-underline font-mono bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded"
                  >
                    window.openai
                  </a>{" "}
                  property detected
                </p>
              </div>
            </div>
          </div>
        )}
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        <ol className="font-mono list-inside list-decimal text-sm/6 text-center sm:text-left">
          <li className="mb-2 tracking-[-.01em]">
            Welcome to the ChatGPT Apps SDK Next.js Starter
          </li>
          <li className="mb-2 tracking-[-.01em]">
            Name returned from tool call: {name ?? "..."}
          </li>
          <li className="mb-2 tracking-[-.01em]">MCP server path: /mcp</li>
        </ol>

        <section className="w-full max-w-2xl border border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Generate a resume preview
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Fill in the details below to call the <code className="font-mono">generate_resume</code> MCP tool.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-200">
              MCP
            </span>
          </div>

          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-200">
                Name
                <input
                  required
                  value={formState.name}
                  onChange={(event) => updateFormField("name")(event.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-inner"
                  placeholder="Ada Lovelace"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-200">
                Role
                <input
                  required
                  value={formState.role}
                  onChange={(event) => updateFormField("role")(event.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-inner"
                  placeholder="Senior Software Engineer"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-200">
              Summary
              <textarea
                required
                value={formState.summary}
                onChange={(event) => updateFormField("summary")(event.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-inner min-h-[96px]"
                placeholder="Brief professional summary"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-200">
              Bullet points
              <textarea
                value={formState.bulletPoints}
                onChange={(event) => updateFormField("bulletPoints")(event.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-inner min-h-[120px]"
                placeholder={`Lead engineer for X\nImproved system reliability by 20%\nMentored junior developers`}
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">One point per line.</span>
            </label>

            {error && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
                {error}
              </div>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-full border border-transparent bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 text-sm font-medium shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Generating..." : "Generate resume"}
              </button>
              {isSubmitting && (
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  Calling <code className="font-mono">useCallTool()</code> → <code className="font-mono">generate_resume</code>
                </span>
              )}
            </div>
          </form>

          {(formState.previewHtml || formState.pdfUrl) && (
            <div className="mt-6 space-y-3">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Preview
              </p>
              {formState.previewHtml && (
                <div
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4 text-sm text-slate-900 dark:text-slate-100"
                  dangerouslySetInnerHTML={{ __html: formState.previewHtml }}
                />
              )}
              {formState.pdfUrl && (
                <a
                  href={formState.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View PDF
                  <svg
                    aria-hidden
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.5 4.75A1.75 1.75 0 016.25 3h7.5A1.75 1.75 0 0115.5 4.75v7.5A1.75 1.75 0 0113.75 14h-2.5a.75.75 0 000 1.5h2.5A3.25 3.25 0 0017 12.25v-7.5A3.25 3.25 0 0013.75 1.5h-7.5A3.25 3.25 0 003 4.75v7.5A3.25 3.25 0 006.25 15.5H8.5a.75.75 0 000-1.5H6.25A1.75 1.75 0 014.5 12.25v-7.5z"
                      clipRule="evenodd"
                    />
                    <path
                      fillRule="evenodd"
                      d="M10.22 6.22a.75.75 0 011.06 0l3 3a.75.75 0 11-1.06 1.06L11 8.56v8.69a.75.75 0 01-1.5 0V8.56L8.28 10.28a.75.75 0 11-1.06-1.06l3-3z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
              )}
            </div>
          )}
        </section>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <Link
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            prefetch={false}
            href="/custom-page"
          >
            Visit another page
          </Link>
          <a
            href="https://vercel.com/templates/ai/chatgpt-app-with-next-js"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Deploy on Vercel
          </a>
        </div>
      </main>
    </div>
  );
}
