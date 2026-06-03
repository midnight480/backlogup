import type React from "react";
import { useState } from "react";
import { useI18n } from "../i18n";

interface ExportButtonsProps {
  onExportMarkdown: () => void;
  onExportPdf: () => Promise<void>;
  disabled?: boolean;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({ onExportMarkdown, onExportPdf, disabled = false }) => {
  const { t } = useI18n();
  const [exportingPdf, setExportingPdf] = useState(false);

  const handlePdfExport = async () => {
    if (disabled || exportingPdf) {
      return;
    }
    setExportingPdf(true);
    try {
      await onExportPdf();
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="flex items-center gap-2 export-exclude">
      <button
        type="button"
        disabled={disabled}
        onClick={onExportMarkdown}
        className="flex items-center gap-1.5 px-3 py-1.5 text-body-sm font-medium border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={t("exportMarkdown")}
      >
        <span className="material-symbols-outlined text-[18px]">description</span>
        {t("exportMarkdown")}
      </button>
      <button
        type="button"
        disabled={disabled || exportingPdf}
        onClick={handlePdfExport}
        className="flex items-center gap-1.5 px-3 py-1.5 text-body-sm font-medium border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={t("exportPdf")}
      >
        <span className="material-symbols-outlined text-[18px]">{exportingPdf ? "hourglass_empty" : "picture_as_pdf"}</span>
        {exportingPdf ? t("exporting") : t("exportPdf")}
      </button>
    </div>
  );
};
