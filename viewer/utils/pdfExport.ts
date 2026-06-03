import html2pdf from "html2pdf.js";
import { sanitizeFilename } from "./download";

interface PdfExportOptions {
  element: HTMLElement;
  filename: string;
  title?: string;
}

export async function exportElementToPdf({ element, filename, title }: PdfExportOptions): Promise<void> {
  const wrapper = document.createElement("div");
  wrapper.style.padding = "24px";
  wrapper.style.background = "#ffffff";
  wrapper.style.color = "#1f2328";
  wrapper.style.fontFamily = "system-ui, sans-serif";

  if (title) {
    const heading = document.createElement("h1");
    heading.textContent = title;
    heading.style.fontSize = "24px";
    heading.style.marginBottom = "16px";
    heading.style.borderBottom = "1px solid #d0d7de";
    heading.style.paddingBottom = "8px";
    wrapper.appendChild(heading);
  }

  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("button, .export-exclude").forEach((node) => node.remove());
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    await html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename: `${sanitizeFilename(filename)}.pdf`,
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      })
      .from(wrapper)
      .save();
  } finally {
    document.body.removeChild(wrapper);
  }
}
