/**
 * Página 3 — A Proposta. Mensagem de boas-vindas + resumo executivo +
 * contexto da dor + visão da solução.
 */

import { Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { ProposalDataForTemplate } from "@/types/proposal-template-props";
import { PDFHeader } from "../components/PDFHeader";
import { PDFFooter } from "../components/PDFFooter";
import { Watermark } from "../components/Watermark";
import { styles, colors, spacing, fontSizes } from "../styles";

const propostaStyles = StyleSheet.create({
  welcome: {
    backgroundColor: colors.backgroundSoft,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderRadius: 4,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  welcomeText: {
    fontSize: fontSizes.body,
    color: colors.text,
    lineHeight: 1.55,
    fontStyle: "italic",
  },
  blockTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: fontSizes.caption,
    color: colors.primary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
    marginTop: spacing.lg,
  },
});

interface Props {
  data: ProposalDataForTemplate;
  isDraft?: boolean;
}

export function PropostaPage({ data, isDraft }: Props) {
  return (
    <Page size="A4" style={styles.page}>
      <PDFHeader title="A proposta" />

      <Text style={[styles.h1, { marginTop: spacing.lg }]}>
        Para {data.client_name}
      </Text>

      {data.welcome_message ? (
        <View style={propostaStyles.welcome}>
          <Text style={propostaStyles.welcomeText}>{data.welcome_message}</Text>
        </View>
      ) : null}

      {data.executive_summary ? (
        <>
          <Text style={propostaStyles.blockTitle}>Resumo executivo</Text>
          <Text style={styles.paragraph}>{data.executive_summary}</Text>
        </>
      ) : null}

      {data.pain_context ? (
        <>
          <Text style={propostaStyles.blockTitle}>O contexto</Text>
          <Text style={styles.paragraph}>{data.pain_context}</Text>
        </>
      ) : null}

      {data.solution_overview ? (
        <>
          <Text style={propostaStyles.blockTitle}>A solução</Text>
          <Text style={styles.paragraph}>{data.solution_overview}</Text>
        </>
      ) : null}

      <PDFFooter />
      {isDraft && <Watermark />}
    </Page>
  );
}
