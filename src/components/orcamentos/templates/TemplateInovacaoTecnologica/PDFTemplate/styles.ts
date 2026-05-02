/**
 * Design tokens do PDFTemplate (React-PDF StyleSheet).
 *
 * Decisão (10D-1):
 * - Fonte: Helvetica built-in do React-PDF — zero risco de falha de carregamento.
 *   10D-2 troca por Inter via TTF público quando refinarmos tipografia.
 * - Cores: paleta GetBrain consolidada (ciano + neutros). Sem dependência
 *   do tailwind config porque React-PDF não consome CSS.
 * - Medidas: pt (1pt = 1/72 inch). Página A4 = 595×842pt.
 */

import { StyleSheet } from "@react-pdf/renderer";

export const colors = {
  primary: "#06b6d4", // ciano GetBrain
  primarySoft: "#cffafe",
  text: "#0a0e1a",
  textMuted: "#64748b",
  textInverse: "#ffffff",
  border: "#e2e8f0",
  borderStrong: "#cbd5e1",
  background: "#ffffff",
  backgroundSoft: "#f8fafc",
  accent: "#0891b2",
  success: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
  coverBg: "#0a0e1a",
};

export const fontSizes = {
  caption: 9,
  body: 11,
  bodyLarge: 12,
  h4: 12,
  h3: 14,
  h2: 18,
  h1: 32,
  hero: 44,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  page: 50,
};

/**
 * Estilos compartilhados entre todas as páginas do template.
 * Cada página define seus próprios overrides extras.
 */
export const styles = StyleSheet.create({
  // Layout base de página (Page padrão; capa tem layout próprio)
  page: {
    fontFamily: "Helvetica",
    fontSize: fontSizes.body,
    color: colors.text,
    paddingTop: 70,
    paddingBottom: 60,
    paddingHorizontal: spacing.page,
    lineHeight: 1.5,
    backgroundColor: colors.background,
  },
  // Tipografia
  h1: {
    fontFamily: "Helvetica-Bold",
    fontSize: fontSizes.h1,
    color: colors.text,
    marginBottom: spacing.md,
  },
  h2: {
    fontFamily: "Helvetica-Bold",
    fontSize: fontSizes.h2,
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  h3: {
    fontFamily: "Helvetica-Bold",
    fontSize: fontSizes.h3,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  h4: {
    fontFamily: "Helvetica-Bold",
    fontSize: fontSizes.h4,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  paragraph: {
    fontSize: fontSizes.body,
    color: colors.text,
    marginBottom: spacing.sm,
    lineHeight: 1.55,
  },
  caption: {
    fontSize: fontSizes.caption,
    color: colors.textMuted,
  },
  muted: {
    color: colors.textMuted,
  },
  bold: {
    fontFamily: "Helvetica-Bold",
  },
  // Container utilitário
  section: {
    marginBottom: spacing.lg,
  },
  divider: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    marginVertical: spacing.md,
  },
  // Bullets
  bulletRow: {
    flexDirection: "row",
    marginBottom: 3,
    paddingLeft: 4,
  },
  bulletDot: {
    width: 10,
    fontSize: fontSizes.body,
    color: colors.primary,
  },
  bulletText: {
    flex: 1,
    fontSize: fontSizes.body,
    color: colors.text,
    lineHeight: 1.5,
  },
  // Tabela
  table: {
    borderWidth: 0.5,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  tableRowLast: {
    flexDirection: "row",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.backgroundSoft,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderStrong,
  },
  tableCell: {
    padding: spacing.sm,
    fontSize: fontSizes.body,
  },
  tableCellHeader: {
    padding: spacing.sm,
    fontSize: fontSizes.caption,
    fontFamily: "Helvetica-Bold",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
