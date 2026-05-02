/**
 * Página 2 — A Empresa. Texto institucional fixo + metas/objetivos.
 */

import { Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { ProposalDataForTemplate } from "@/types/proposal-template-props";
import { ABOUT_GETBRAIN_PARAGRAPHS } from "@/content/about-getbrain";
import { PDFHeader } from "../components/PDFHeader";
import { PDFFooter } from "../components/PDFFooter";
import { styles, colors, fontSizes, spacing } from "../styles";

const empresaStyles = StyleSheet.create({
  metasGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  metaCard: {
    width: "48%",
    backgroundColor: colors.backgroundSoft,
    padding: spacing.md,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  metaNumber: {
    fontFamily: "Helvetica-Bold",
    fontSize: fontSizes.caption,
    color: colors.primary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  metaTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: fontSizes.body,
    color: colors.text,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 9,
    color: colors.textMuted,
    lineHeight: 1.4,
  },
});

const METAS = [
  {
    n: "01",
    title: "Eficiência operacional",
    text: "Soluções de IA e automação que reduzem custo e aceleram processos críticos.",
  },
  {
    n: "02",
    title: "Experiência do cliente",
    text: "Dados e analytics traduzidos em jornadas personalizadas e mensuráveis.",
  },
  {
    n: "03",
    title: "Integração tecnológica",
    text: "Conexão fluida entre plataformas existentes — sem reescrever o que já funciona.",
  },
  {
    n: "04",
    title: "Gestão de dados",
    text: "Organização, governança e uso estratégico do dado pra decisões mais rápidas.",
  },
];

interface Props {
  data: ProposalDataForTemplate;
}

export function EmpresaPage({ data: _data }: Props) {
  return (
    <Page size="A4" style={styles.page}>
      <PDFHeader title="A empresa" />

      <Text style={[styles.h1, { marginTop: spacing.lg }]}>A GetBrain</Text>

      <View style={styles.section}>
        {ABOUT_GETBRAIN_PARAGRAPHS.map((p, i) => (
          <Text key={i} style={styles.paragraph}>
            {p}
          </Text>
        ))}
      </View>

      <Text style={styles.h2}>Como pensamos cada projeto</Text>
      <View style={empresaStyles.metasGrid}>
        {METAS.map((m) => (
          <View key={m.n} style={empresaStyles.metaCard}>
            <Text style={empresaStyles.metaNumber}>{m.n}</Text>
            <Text style={empresaStyles.metaTitle}>{m.title}</Text>
            <Text style={empresaStyles.metaText}>{m.text}</Text>
          </View>
        ))}
      </View>

      <PDFFooter />
    </Page>
  );
}
