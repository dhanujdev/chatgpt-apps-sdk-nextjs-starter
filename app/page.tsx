"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import {
  useCallTool,
  useDisplayMode,
  useMaxHeight,
  useOpenExternal,
  useRequestDisplayMode,
  useWidgetProps,
  useWidgetState,
} from "./hooks";

type ResumeFormState = {
  name: string;
  email: string;
  headline: string;
  summary: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  skills: string;
  achievements: string;
  previewHtml: string | null;
  pdfUrl: string | null;
  compiledAt: string | null;
};

type ResumeToolResponse = {
  result?: {
    structuredContent?: {
      previewHtml?: string;
      pdfUrl?: string;
      metadata?: {
        generatedAt?: string;
      };
    };
  };
};

type PreviewWidgetProps = {
  previewHtml?: string;
  pdfUrl?: string;
  metadata?: {
    generatedAt?: string;
  };
};

const DEFAULT_RESUME_STATE: ResumeFormState = {
  name: "",
  email: "",
  headline: "",
  summary: "",
  company: "",
  role: "",
  startDate: "",
  endDate: "",
  skills: "",
  achievements: "",
  previewHtml: null,
  pdfUrl: null,
  compiledAt: null,
};

const parseList = (value: string, separator: RegExp) =>
  value
    .split(separator)
    .map((entry) => entry.trim())
    .filter(Boolean);

export default function Home() {
  const widgetProps = useWidgetProps<PreviewWidgetProps>({});
  const maxHeight = useMaxHeight() ?? undefined;
  const displayMode = useDisplayMode();
  const requestDisplayMode = useRequestDisplayMode();
  const callTool = useCallTool();
  const openExternal = useOpenExternal();
  const [resumeState, setResumeState] = useWidgetState<ResumeFormState>(() => ({
    ...DEFAULT_RESUME_STATE,
    previewHtml: widgetProps.previewHtml ?? DEFAULT_RESUME_STATE.previewHtml,
    pdfUrl: widgetProps.pdfUrl ?? DEFAULT_RESUME_STATE.pdfUrl,
    compiledAt: widgetProps.metadata?.generatedAt ?? DEFAULT_RESUME_STATE.compiledAt,
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formState = useMemo(
    () => resumeState ?? DEFAULT_RESUME_STATE,
    [resumeState]
  );

  const formattedCompiledAt = useMemo(() => {
    if (!formState.compiledAt) return null;
    const compiledDate = new Date(formState.compiledAt);
    return compiledDate.toLocaleString();
  }, [formState.compiledAt]);

  const updateFormField =
    <K extends keyof ResumeFormState>(key: K) =>
    (value: ResumeFormState[K]) =>
      setResumeState((previous) => ({
        ...(previous ?? DEFAULT_RESUME_STATE),
        [key]: value,
      }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    setResumeState((previous) => ({
      ...(previous ?? DEFAULT_RESUME_STATE),
      previewHtml: null,
      pdfUrl: null,
    }));

    const skills = parseList(formState.skills, /,|\r?\n/);
    const achievements = parseList(formState.achievements, /\r?\n/);

    try {
      const payload = {
        name: formState.name.trim(),
        email: formState.email.trim() || undefined,
        headline: formState.headline.trim() || undefined,
        summary: formState.summary.trim() || undefined,
        skills: skills.length ? skills : undefined,
        experience: [
          {
            company: formState.company.trim(),
            role: formState.role.trim(),
            startDate: formState.startDate.trim() || undefined,
            endDate: formState.endDate.trim() || undefined,
            achievements: achievements.length ? achievements : undefined,
          },
        ],
      };

      const response = await callTool("generate_resume", payload);

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
        compiledAt:
          structuredContent.metadata?.generatedAt ??
          previous?.compiledAt ??
          new Date().toISOString(),
      }));
    } catch (err) {
      console.error(err);
      setError("Failed to generate resume. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenExternal = () => {
    if (formState.pdfUrl) {
      openExternal(formState.pdfUrl);
    }
  };

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
            <p className="text-sm text-slate-600 dark:text-slate-300">
              The form builds the <code className="font-mono">generate_resume</code> payload with an{" "}
              <strong>experience</strong> array (company, role, optional dates and achievements) and optional{" "}
              <strong>skills</strong>.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              className={`inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 ${
                formState.pdfUrl ? "" : "pointer-events-none opacity-60"
              }`}
              href={formState.pdfUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              download={formState.pdfUrl ? "" : undefined}
              aria-disabled={!formState.pdfUrl}
            >
              Download PDF
            </a>
            <button
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              onClick={handleOpenExternal}
              disabled={!formState.pdfUrl}
            >
              Open in new tab
            </button>
          </div>
        </div>

        <section className="w-full max-w-2xl border border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Generate a resume preview
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Provide the fields expected by the <code className="font-mono">generate_resume</code> MCP tool.
                Roles and companies are mapped to the tool&apos;s <code className="font-mono">experience</code> array.
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
                Email (optional)
                <input
                  value={formState.email}
                  onChange={(event) => updateFormField("email")(event.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-inner"
                  placeholder="ada@example.com"
                  type="email"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-200">
                Headline (optional)
                <input
                  value={formState.headline}
                  onChange={(event) => updateFormField("headline")(event.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-inner"
                  placeholder="Staff Engineer • Data Platforms"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-200">
                Skills (optional)
                <input
                  value={formState.skills}
                  onChange={(event) => updateFormField("skills")(event.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-inner"
                  placeholder="Distributed systems, Leadership, SQL"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Comma- or line-separated list mapped to <code className="font-mono">skills</code>.
                </span>
              </label>
            </div>

            <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-200">
              Summary (optional)
              <textarea
                value={formState.summary}
                onChange={(event) => updateFormField("summary")(event.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-inner min-h-[96px]"
                placeholder="Brief professional summary"
              />
            </label>

            <div className="space-y-3 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Experience entry
                </p>
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  Populates <code className="font-mono">experience[0]</code>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-200">
                  Role / Title
                  <input
                    required
                    value={formState.role}
                    onChange={(event) => updateFormField("role")(event.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-inner"
                    placeholder="Senior Software Engineer"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-200">
                  Company / Organization
                  <input
                    required
                    value={formState.company}
                    onChange={(event) => updateFormField("company")(event.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-inner"
                    placeholder="Analytical Engines"
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-200">
                  Start date (optional)
                  <input
                    value={formState.startDate}
                    onChange={(event) => updateFormField("startDate")(event.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-inner"
                    placeholder="2021-01"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-200">
                  End date (optional)
                  <input
                    value={formState.endDate}
                    onChange={(event) => updateFormField("endDate")(event.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-inner"
                    placeholder="2024-06 or Present"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-200">
                Achievements (optional)
                <textarea
                  value={formState.achievements}
                  onChange={(event) => updateFormField("achievements")(event.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-inner min-h-[120px]"
                  placeholder={`Lead engineer for X\nImproved system reliability by 20%\nMentored junior developers`}
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  One bullet per line; mapped to <code className="font-mono">experience[0].achievements</code>.
                </span>
              </label>
            </div>

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
