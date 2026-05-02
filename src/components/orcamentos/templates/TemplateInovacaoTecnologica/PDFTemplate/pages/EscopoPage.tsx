/**
 * Página 4 — Escopo Detalhado.
 *
 * Renderiza cada item da proposta com:
 *  - título + valor
 *  - detailed_description (se houver)
 *  - bullets de deliverables (se houver)
 *  - bullets de acceptance_criteria (se houver)
 *  - bullets de client_dependencies (se houver) com marker "!" em laranja
 *
 * React-PDF quebra páginas automaticamente quando View tem `wrap`.
 * Cada item usa `wrap={false}` pra evitar item cortado no meio.
 */

import { Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { ProposalDataForTemplate } from "@/types/proposal-template-props";
import { PDFHeader } from "../components/PDFHeader";
import { PDFFooter } from "../components/PDFFooter";
import { Bullet } from "../components/Bullet";
import { formatBRL } from "../components/format";
import { styles, colors, spacing, fontSizes } from "../styles";

const escopoStyles = StyleSheet.create({
  itemCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 6,
    backgroundColor: colors.background,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  itemTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: fontSizes.bodyLarge,
    color: colors.text,
    flex: 1,
  },
  itemValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: fontSizes.body,
    color: colors.primary,
    marginLeft: spacing.md,
  },
  itemQty: {
    fontSize: 8,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  itemDesc: {
    fontSize: fontSizes.body,
    color: colors.text,
    lineHeight: 1.55,
    marginBottom: spacing.sm,
  },
  blockTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  warningBlockTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: colors.warning,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  empty: {
    fontStyle: "italic",
    color: colors.textMuted,
    fontSize: fontSizes.body,
    marginTop: spacing.lg,
  },
});

interface Props {
  data: ProposalDataForTemplate;
}

export function EscopoPage({ data }: Props) {
  return (
    <Page size="A4" style={styles.page}>
      <PDFHeader title="Escopo detalhado" />

      <Text style={[styles.h1, { marginTop: spacing.lg }]}>Escopo detalhado</Text>
      <Text style={[styles.caption, { marginBottom: spacing.md }]}>
        Cada item descreve o que será entregue, como será validado e o que precisamos
        do cliente pra entregar dentro do prazo.
      </Text>

      {data.items.length === 0 ? (
        <Text style={escopoStyles.empty}>Nenhum item de escopo cadastrado.</Text>
      ) : (
        data.items.map((it) => (
          <View key={it.id} style={escopoStyles.itemCard} wrap={false}>
            <View style={escopoStyles.itemHeader}>
              <View style={{ flex: 1 }}>
                <Text style={escopoStyles.itemTitle}>{it.description}</Text>
                <Text style={escopoStyles.itemQty}>
                  {it.quantity} × {formatBRL(it.unit_price)}
                </Text>
              </View>
              <Text style={escopoStyles.itemValue}>{formatBRL(it.total)}</Text>
            </View>

            {it.detailed_description ? (
              <Text style={escopoStyles.itemDesc}>{it.detailed_description}</Text>
            ) : null}

            {it.deliverables.length > 0 && (
              <>
                <Text style={escopoStyles.blockTitle}>Entregáveis</Text>
                {it.deliverables.map((d, i) => (
                  <Bullet key={i}>{d}</Bullet>
                ))}
              </>
            )}

            {it.acceptance_criteria.length > 0 && (
              <>
                <Text style={escopoStyles.blockTitle}>Critérios de aceite</Text>
                {it.acceptance_criteria.map((c, i) => (
                  <Bullet key={i}>{c}</Bullet>
                ))}
              </>
            )}

            {it.client_dependencies.length > 0 && (
              <>
                <Text style={escopoStyles.warningBlockTitle}>
                  Dependências do cliente
                </Text>
                {it.client_dependencies.map((dep, i) => (
                  <Bullet key={i} marker="!" markerColor={colors.warning}>
                    {dep}
                  </Bullet>
                ))}
              </>
            )}
          </View>
        ))
      )}

      <PDFFooter />
    </Page>
  );
}
