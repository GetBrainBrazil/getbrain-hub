/**
 * Footer padrão. Linha ciano + CNPJ esquerda + "Confidencial" centro +
 * paginação automática direita ("Página X de Y").
 */

import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { colors, fontSizes, spacing } from "../styles";
import { GETBRAIN_INFO } from "@/lib/getbrain-info";

const footerStyles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 24,
    left: spacing.page,
    right: spacing.page,
    paddingTop: spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  topLine: {
    height: 1.5,
    width: 24,
    backgroundColor: colors.primary,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  text: {
    fontSize: 8,
    color: colors.textMuted,
  },
  textCenter: {
    fontSize: 8,
    color: colors.textMuted,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
  },
});

export function PDFFooter() {
  return (
    <View style={footerStyles.wrapper} fixed>
      <View style={footerStyles.topLine} />
      <View style={footerStyles.row}>
        <Text style={footerStyles.text}>
          {GETBRAIN_INFO.name} · CNPJ {GETBRAIN_INFO.cnpj}
        </Text>
        <Text style={footerStyles.textCenter}>CONFIDENCIAL</Text>
        <Text
          style={footerStyles.text}
          render={({ pageNumber, totalPages }) =>
            `Página ${pageNumber} de ${totalPages}`
          }
        />
      </View>
    </View>
  );
}
