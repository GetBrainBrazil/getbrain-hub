/**
 * Página 5 — Cronograma. Tabela simples Etapa | Descrição | Duração estimada.
 */

import { Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { ProposalDataForTemplate } from "@/types/proposal-template-props";
import { PDFHeader } from "../components/PDFHeader";
import { PDFFooter } from "../components/PDFFooter";
import { Watermark } from "../components/Watermark";
import { styles, colors, spacing, fontSizes } from "../styles";

const cronStyles = StyleSheet.create({
  table: {
    marginTop: spacing.md,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  rowHeader: {
    flexDirection: "row",
    backgroundColor: colors.backgroundSoft,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderStrong,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  rowLast: {
    flexDirection: "row",
  },
  cellHeader: {
    padding: spacing.sm,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cell: {
    padding: spacing.sm,
    fontSize: fontSizes.body,
    color: colors.text,
  },
  cellEtapa: { width: "30%" },
  cellDesc: { width: "50%" },
  cellDur: { width: "20%", textAlign: "right" },
  notice: {
    marginTop: spacing.lg,
    padding: spacing.sm,
    backgroundColor: "#fef3c7",
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
    borderRadius: 4,
  },
  noticeText: {
    fontSize: 9,
    color: "#78350f",
    lineHeight: 1.5,
  },
});

interface Props {
  data: ProposalDataForTemplate;
  isDraft?: boolean;
}

export function CronogramaPage({ data, isDraft }: Props) {
  const impl = data.implementation_days ?? 30;
  const valid = data.validation_days ?? 7;
  const total = impl + valid;

  const rows = [
    {
      etapa: "Implementação",
      desc: "Desenvolvimento, configuração e integração da solução com os sistemas atuais.",
      dur: `${impl} dias`,
    },
    {
      etapa: "Validação",
      desc: "Testes em ambiente real, ajustes finos e aprovação do cliente.",
      dur: `${valid} dias`,
    },
    {
      etapa: "Total estimado",
      desc: "Janela total entre kick-off e entrega final em produção.",
      dur: `${total} dias`,
    },
  ];

  return (
    <Page size="A4" style={styles.page}>
      <PDFHeader title="Cronograma" />

      <Text style={[styles.h1, { marginTop: spacing.lg }]}>Cronograma</Text>
      <Text style={[styles.caption, { marginBottom: spacing.md }]}>
        Estimativas baseadas no escopo proposto. Início conta a partir do alinhamento
        de kick-off e da entrega das dependências do cliente.
      </Text>

      <View style={cronStyles.table}>
        <View style={cronStyles.rowHeader}>
          <Text style={[cronStyles.cellHeader, cronStyles.cellEtapa]}>Etapa</Text>
          <Text style={[cronStyles.cellHeader, cronStyles.cellDesc]}>Descrição</Text>
          <Text style={[cronStyles.cellHeader, cronStyles.cellDur]}>Duração</Text>
        </View>
        {rows.map((r, i) => {
          const isLast = i === rows.length - 1;
          return (
            <View key={r.etapa} style={isLast ? cronStyles.rowLast : cronStyles.row}>
              <Text
                style={[
                  cronStyles.cell,
                  cronStyles.cellEtapa,
                  isLast ? { fontFamily: "Helvetica-Bold" } : null,
                ]}
              >
                {r.etapa}
              </Text>
              <Text style={[cronStyles.cell, cronStyles.cellDesc]}>{r.desc}</Text>
              <Text
                style={[
                  cronStyles.cell,
                  cronStyles.cellDur,
                  { fontFamily: "Helvetica-Bold", color: colors.primary },
                ]}
              >
                {r.dur}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={cronStyles.notice}>
        <Text style={cronStyles.noticeText}>
          Prazos podem variar conforme disponibilidade de dados, acessos e ferramentas
          do cliente. Atrasos em dependências externas são repassados ao cronograma.
        </Text>
      </View>

      <PDFFooter />
      {isDraft && <Watermark />}
    </Page>
  );
}
