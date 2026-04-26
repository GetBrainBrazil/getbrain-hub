// Configuração centralizada para geração de PDF via html2pdf.js
// O template é renderizado em A4 retrato (210mm × 297mm), 3 páginas.

export const PDF_OPTIONS = (filename: string) => ({
  margin: 0,
  filename,
  image: { type: "jpeg" as const, quality: 0.98 },
  html2canvas: {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: 794, // 210mm em px @ 96dpi
  },
  jsPDF: {
    unit: "mm" as const,
    format: "a4" as const,
    orientation: "portrait" as const,
    compress: true,
  },
  pagebreak: { mode: ["css", "legacy"] as const },
});

// Paleta extraída do PDF original ANBI
export const PDF_COLORS = {
  coverBg: "#0e0e0e",
  coverTitle: "#5a5a5a",
  coverCircle: "#0e7c8c",
  ink: "#1a1a1a",
  inkSoft: "#5a5a5a",
  tableHeader: "#cabfa6",
  tableBorder: "#1a1a1a",
  money: "#5cb85c",
  total: "#5cb85c",
} as const;
