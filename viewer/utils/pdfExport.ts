import html2pdf from "html2pdf.js";
import { sanitizeFilename } from "./download";

interface PdfExportOptions {
  element: HTMLElement;
  filename: string;
  title?: string;
}

export async function exportElementToPdf({ element, filename }: PdfExportOptions): Promise<void> {
  const excludeNodes = element.querySelectorAll<HTMLElement>(".export-exclude");

  // 一時的に除外要素を非表示にする
  excludeNodes.forEach((node) => {
    node.style.display = "none";
  });

  try {
    const options = {
      margin: [10, 10, 10, 10],
      filename: `${sanitizeFilename(filename)}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    };

    await html2pdf().set(options).from(element).save();
  } finally {
    // 非表示にした除外要素を復元する
    excludeNodes.forEach((node) => {
      node.style.display = "";
    });
  }
}
