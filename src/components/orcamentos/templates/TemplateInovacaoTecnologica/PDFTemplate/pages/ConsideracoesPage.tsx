/**
 * Página 7 — Considerações. Lista numerada das considerações da proposta.
 * Renderiza apenas se array não estiver vazio (controle no Document index.tsx).
 */

import { Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { ProposalDataForTemplate } from "@/types/proposal-template-props";
import { PDFHeader } from "../components/PDFHeader";
import { PDFFooter } from "../components/PDFFooter";
import { Watermark } from "../components/Watermark";
import { styles, colors, spacing, fontSizes } from "../styles";

const considStyles = StyleSheet.create({
  item: {
    flexDirection: "row",
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 0.3,
    borderBottomColor: colors.border,
  },
  number: {
    width: 28,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
    fontSize: fontSizes.body,
  },
  text: {
    flex: 1,
    fontSize: fontSizes.body,
    color: colors.text,
    lineHeight: 1.55,
  },
});

interface Props {
  data: ProposalDataForTemplate;
  isDraft?: boolean;
}

export function ConsideracoesPage({ data, isDraft }: Props) {
  return (
    <Page size="A4" style={styles.page}>
      <PDFHeader title="Considerações finais" />

      <Text style={[styles.h1, { marginTop: spacing.lg }]}>Considerações</Text>
      <Text style={[styles.caption, { marginBottom: spacing.md }]}>
        Pontos importantes pra alinhamento mútuo antes do início do projeto.
      </Text>

      {data.considerations.map((c, i) => (
        <View key={i} style={considStyles.item} wrap={false}>
          <Text style={considStyles.number}>{String(i + 1).padStart(2, "0")}.</Text>
          <Text style={considStyles.text}>{c}</Text>
        </View>
      ))}

      <PDFFooter />
      {isDraft && <Watermark />}
    </Page>
  );
}
