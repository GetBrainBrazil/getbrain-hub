/**
 * Página 6 — Investimento. Tabela de itens one-time + bloco de manutenção
 * mensal (se aplicável) + validade da proposta destacada.
 */

import { Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { ProposalDataForTemplate } from "@/types/proposal-template-props";
import { PDFHeader } from "../components/PDFHeader";
import { PDFFooter } from "../components/PDFFooter";
import { formatBRL, formatDateBR } from "../components/format";
import { styles, colors, spacing, fontSizes } from "../styles";

const invStyles = StyleSheet.create({
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
  cellDesc: { width: "50%" },
  cellQty: { width: "12%", textAlign: "center" },
  cellUnit: { width: "19%", textAlign: "right" },
  cellTotal: { width: "19%", textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    backgroundColor: colors.coverBg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginTop: -0.5,
  },
  totalLabel: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
    fontSize: fontSizes.body,
    color: colors.textInverse,
    letterSpacing: 1,
  },
  totalValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: fontSizes.h3,
    color: colors.primary,
  },
  maintenanceBlock: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 6,
    backgroundColor: "#ecfeff",
  },
  maintenanceTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: fontSizes.caption,
    color: colors.accent,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  maintenanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: spacing.sm,
  },
  maintenanceDesc: {
    flex: 1,
    fontSize: fontSizes.body,
    color: colors.text,
    lineHeight: 1.5,
  },
  maintenanceValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: fontSizes.h2,
    color: colors.accent,
  },
  maintenanceUnit: {
    fontSize: fontSizes.body,
    color: colors.accent,
  },
  validity: {
    marginTop: spacing.lg,
    padding: spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  validityText: {
    fontSize: fontSizes.caption,
    color: colors.textMuted,
  },
  validityValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: fontSizes.caption,
    color: colors.text,
  },
});

interface Props {
  data: ProposalDataForTemplate;
}

export function InvestimentoPage({ data }: Props) {
  const hasMaintenance =
    data.maintenance_monthly_value !== null &&
    data.maintenance_monthly_value !== undefined &&
    data.maintenance_monthly_value > 0;

  return (
    <Page size="A4" style={styles.page}>
      <PDFHeader title="Investimento" />

      <Text style={[styles.h1, { marginTop: spacing.lg }]}>Investimento</Text>
      <Text style={[styles.caption, { marginBottom: spacing.md }]}>
        Valores em reais (BRL). Pagamento conforme combinado em contrato.
      </Text>

      <View style={invStyles.table}>
        <View style={invStyles.rowHeader}>
          <Text style={[invStyles.cellHeader, invStyles.cellDesc]}>Descrição</Text>
          <Text style={[invStyles.cellHeader, invStyles.cellQty]}>Qtde</Text>
          <Text style={[invStyles.cellHeader, invStyles.cellUnit]}>Unitário</Text>
          <Text style={[invStyles.cellHeader, invStyles.cellTotal]}>Total</Text>
        </View>
        {data.items.length === 0 ? (
          <View style={invStyles.row}>
            <Text
              style={[
                invStyles.cell,
                { width: "100%", textAlign: "center", fontStyle: "italic", color: colors.textMuted },
              ]}
            >
              Nenhum item de escopo cadastrado.
            </Text>
          </View>
        ) : (
          data.items.map((it) => (
            <View key={it.id} style={invStyles.row}>
              <Text style={[invStyles.cell, invStyles.cellDesc]}>{it.description}</Text>
              <Text style={[invStyles.cell, invStyles.cellQty]}>{it.quantity}</Text>
              <Text style={[invStyles.cell, invStyles.cellUnit]}>
                {formatBRL(it.unit_price)}
              </Text>
              <Text
                style={[invStyles.cell, invStyles.cellTotal, { fontFamily: "Helvetica-Bold" }]}
              >
                {formatBRL(it.total)}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={invStyles.totalRow}>
        <Text style={invStyles.totalLabel}>TOTAL ONE-TIME</Text>
        <Text style={invStyles.totalValue}>{formatBRL(data.total_one_time)}</Text>
      </View>

      {hasMaintenance && (
        <View style={invStyles.maintenanceBlock}>
          <Text style={invStyles.maintenanceTitle}>Manutenção mensal</Text>
          <View style={invStyles.maintenanceRow}>
            <Text style={invStyles.maintenanceDesc}>
              {data.maintenance_description ||
                "Suporte, monitoramento, evoluções incrementais e atendimento direto com a equipe."}
            </Text>
            <View style={{ alignItems: "flex-end", marginLeft: spacing.md }}>
              <Text style={invStyles.maintenanceValue}>
                {formatBRL(data.maintenance_monthly_value || 0)}
              </Text>
              <Text style={invStyles.maintenanceUnit}>/mês</Text>
            </View>
          </View>
        </View>
      )}

      <View style={invStyles.validity}>
        <Text style={invStyles.validityText}>Validade desta proposta</Text>
        <Text style={invStyles.validityValue}>{formatDateBR(data.expires_at)}</Text>
      </View>

      <PDFFooter />
    </Page>
  );
}
