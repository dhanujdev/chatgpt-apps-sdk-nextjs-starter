import { baseURL } from "@/baseUrl";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

const getAppsSdkCompatibleHtml = async (baseUrl: string, path: string) => {
  const result = await fetch(`${baseUrl}${path}`);
  return await result.text();
};

type ContentWidget = {
  id: string;
  title: string;
  templateUri: string;
  invoking: string;
  invoked: string;
  html: string;
  description: string;
  widgetDomain: string;
};

function widgetMeta(
  widget: ContentWidget,
  options: { widgetAccessible?: boolean; resultCanProduceWidget?: boolean } = {}
) {
  return {
    "openai/outputTemplate": widget.templateUri,
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": options.widgetAccessible ?? false,
    "openai/resultCanProduceWidget": options.resultCanProduceWidget ?? true,
  } as const;
}

type ResumeExperience = {
  company: string;
  role: string;
  startDate?: string;
  endDate?: string;
  achievements?: string[];
};

type ResumeData = {
  name: string;
  email?: string;
  headline?: string;
  summary?: string;
  skills?: string[];
  experience?: ResumeExperience[];
};

type ResumeRender = {
  latex: string;
  previewHtml: string;
  pdfUrl: string;
  metadata: { generatedAt: string };
};

const escapeLatex = (value: string) =>
  value
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/%/g, "\\%")
    .replace(/&/g, "\\&")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/\$/g, "\\$")
    .replace(/\^/g, "\\^{}");

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const escapePdfText = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const renderResumeLatex = (data: ResumeData) => {
  const header = [`\\textbf{${escapeLatex(data.name)}}`];
  if (data.headline) header.push(`\\\n${escapeLatex(data.headline)}`);
  if (data.email) header.push(`\\\n${escapeLatex(data.email)}`);

  const sections: string[] = [];

  if (data.summary) {
    sections.push(`\\section*{Summary}\n${escapeLatex(data.summary)}`);
  }

  if (data.skills?.length) {
    const skillsLine = data.skills.map(escapeLatex).join(", ");
    sections.push(`\\section*{Skills}\n${skillsLine}`);
  }

  if (data.experience?.length) {
    const experiences = data.experience
      .map((item) => {
        const dates = [item.startDate, item.endDate].filter(Boolean).join(" -- ");
        const achievements = (item.achievements || [])
          .map((ach) => `\\item ${escapeLatex(ach)}`)
          .join("\n");
        return [
          `\\textbf{${escapeLatex(item.role)}} at ${escapeLatex(item.company)}`,
          dates ? `\\\n${escapeLatex(dates)}` : "",
          achievements ? `\\begin{itemize}\n${achievements}\n\\end{itemize}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n");

    sections.push(`\\section*{Experience}\n${experiences}`);
  }

  return [header.join(""), "\n\n", sections.join("\n\n")].join("");
};

const generatePdfFromLatex = (latex: string) => {
  const sanitizedText = escapePdfText(latex);
  const streamContent = `BT /F1 12 Tf 72 720 Td (${sanitizedText}) Tj ET`;
  const streamLength = Buffer.byteLength(streamContent, "utf-8");

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj",
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj`,
    `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf-8"));
    pdf += `${obj}\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, "utf-8");

  const xrefEntries = [
    "0000000000 65535 f ",
    ...offsets.slice(1).map((offset) => `${offset.toString().padStart(10, "0")} 00000 n `),
  ].join("\n");

  pdf += `xref\n0 ${objects.length + 1}\n${xrefEntries}\ntrailer << /Size ${
    objects.length + 1
  } /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return `data:application/pdf;base64,${Buffer.from(pdf).toString("base64")}`;
};

const renderPreviewHtml = (data: ResumeData, latex: string) => {
  const experience = (data.experience || [])
    .map((item) => {
      const achievements = (item.achievements || [])
        .map((ach) => `<li>${escapeHtml(ach)}</li>`)
        .join("");
      const dates = [item.startDate, item.endDate].filter(Boolean).join(" – ");
      return `
        <section>
          <h3>${escapeHtml(item.role)} at ${escapeHtml(item.company)}</h3>
          ${dates ? `<p class="muted">${escapeHtml(dates)}</p>` : ""}
          ${achievements ? `<ul>${achievements}</ul>` : ""}
        </section>
      `;
    })
    .join("");

  const skills = data.skills?.length
    ? `<p><strong>Skills:</strong> ${data.skills.map(escapeHtml).join(", ")}</p>`
    : "";

  return `
    <div class="resume">
      <header>
        <h1>${escapeHtml(data.name)}</h1>
        ${data.headline ? `<p>${escapeHtml(data.headline)}</p>` : ""}
        ${data.email ? `<p class="muted">${escapeHtml(data.email)}</p>` : ""}
      </header>
      ${data.summary ? `<section><h2>Summary</h2><p>${escapeHtml(data.summary)}</p></section>` : ""}
      ${skills}
      ${experience}
      <details>
        <summary>View LaTeX source</summary>
        <pre>${escapeHtml(latex)}</pre>
      </details>
    </div>
  `;
};

const handler = createMcpHandler(async (server) => {
  const html = await getAppsSdkCompatibleHtml(baseURL, "/");

  const resumeWidget: ContentWidget = {
    id: "generate_resume",
    title: "Resume Builder",
    templateUri: "ui://widget/resume-template.html",
    invoking: "Compiling your LaTeX resume...",
    invoked: "Resume ready",
    html: "",
    description: "Compile and preview a LaTeX resume with download support",
    widgetDomain: baseURL,
  };

  const sampleResumeData: ResumeData = {
    name: "Ada Lovelace",
    email: "ada@example.com",
    headline: "Mathematical Analyst",
    summary: "Innovative mathematician with a passion for analytical engines and elegant proofs.",
    skills: ["Analytical Thinking", "Algorithms", "Technical Writing"],
    experience: [
      {
        company: "Analytical Engines",
        role: "Contributor",
        startDate: "1833",
        endDate: "1843",
        achievements: [
          "Documented computation methods for complex sequences",
          "Collaborated on early computer science concepts",
        ],
      },
    ],
  };

  const renderResume = (data: ResumeData): ResumeRender => {
    const latex = renderResumeLatex(data);
    const pdfUrl = generatePdfFromLatex(latex);
    return {
      latex,
      pdfUrl,
      previewHtml: renderPreviewHtml(data, latex),
      metadata: { generatedAt: new Date().toISOString() },
    };
  };

  let latestResume = renderResume(sampleResumeData);

  const contentWidget: ContentWidget = {
    id: "show_content",
    title: "Show Content",
    templateUri: "ui://widget/content-template.html",
    invoking: "Loading content...",
    invoked: "Content loaded",
    html: html,
    description: "Displays the homepage content",
    widgetDomain: "https://nextjs.org/docs",
  };
  server.registerResource(
    "content-widget",
    contentWidget.templateUri,
    {
      title: contentWidget.title,
      description: contentWidget.description,
      mimeType: "text/html+skybridge",
      _meta: {
        "openai/widgetDescription": contentWidget.description,
        "openai/widgetPrefersBorder": true,
      },
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/html+skybridge",
          text: `<html>${contentWidget.html}</html>`,
          _meta: {
            "openai/widgetDescription": contentWidget.description,
            "openai/widgetPrefersBorder": true,
            "openai/widgetDomain": contentWidget.widgetDomain,
          },
        },
      ],
    })
  );

  server.registerResource(
    "resume-widget",
    resumeWidget.templateUri,
    {
      title: resumeWidget.title,
      description: resumeWidget.description,
      mimeType: "text/html+skybridge",
      _meta: {
        "openai/widgetDescription": resumeWidget.description,
        "openai/widgetPrefersBorder": true,
        "openai/widgetDomain": resumeWidget.widgetDomain,
      },
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/html+skybridge",
          text: `<html><body>${latestResume.previewHtml}<p><a href="${latestResume.pdfUrl}" download="resume.pdf">Download PDF</a></p></body></html>`,
          _meta: {
            "openai/widgetDescription": resumeWidget.description,
            "openai/widgetPrefersBorder": true,
            "openai/widgetDomain": resumeWidget.widgetDomain,
          },
        },
      ],
    })
  );

  server.registerTool(
    contentWidget.id,
    {
      title: contentWidget.title,
      description:
        "Fetch and display the homepage content with the name of the user",
      inputSchema: {
        name: z.string().describe("The name of the user to display on the homepage"),
      },
      _meta: widgetMeta(contentWidget, { widgetAccessible: true }),
    },
    async ({ name }) => {
      return {
        content: [
          {
            type: "text",
            text: name,
          },
        ],
        structuredContent: {
          name: name,
          timestamp: new Date().toISOString(),
        },
        _meta: widgetMeta(contentWidget, { widgetAccessible: true }),
      };
    }
  );

  server.registerTool(
    resumeWidget.id,
    {
      title: resumeWidget.title,
      description: "Compile a LaTeX resume preview and downloadable PDF from structured user data",
      inputSchema: z.object({
        name: z.string().describe("Full name for the resume header"),
        email: z.string().email().optional().describe("Contact email"),
        headline: z.string().optional().describe("Short title or headline"),
        summary: z.string().optional().describe("Professional summary paragraph"),
        skills: z.array(z.string()).optional().describe("List of key skills"),
        experience: z
          .array(
            z.object({
              company: z.string(),
              role: z.string(),
              startDate: z.string().optional(),
              endDate: z.string().optional(),
              achievements: z.array(z.string()).optional(),
            })
          )
          .optional()
          .describe("Work experiences to include"),
      }),
      _meta: widgetMeta(resumeWidget, { widgetAccessible: true }),
    },
    async (data) => {
      latestResume = renderResume(data);

      return {
        content: [
          {
            type: "text",
            text: "Resume compiled and ready for preview.",
          },
        ],
        structuredContent: {
          previewHtml: latestResume.previewHtml,
          pdfUrl: latestResume.pdfUrl,
          metadata: {
            ...latestResume.metadata,
            latexLength: latestResume.latex.length,
          },
        },
        _meta: widgetMeta(resumeWidget, { widgetAccessible: true }),
      };
    }
  );
});

export const GET = handler;
export const POST = handler;
