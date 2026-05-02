/**
 * Header padrão das páginas internas (não aparece na capa).
 * Linha sutil ciano + título da seção em caixa alta + logo discreto à esquerda.
 */

import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { colors, fontSizes, spacing } from "../styles";

const headerStyles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 24,
    left: spacing.page,
    right: spacing.page,
    paddingBottom: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  topLine: {
    height: 2,
    backgroundColor: colors.primary,
    width: 32,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: {
    fontFamily: "Helvetica-Bold",
    fontSize: fontSizes.caption,
    color: colors.text,
    letterSpacing: 1,
  },
  brandAccent: {
    color: colors.primary,
  },
  title: {
    fontFamily: "Helvetica-Bold",
    fontSize: fontSizes.caption,
    color: colors.textMuted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
});

interface Props {
  /** Título da seção (caixa alta automática). */
  title: string;
}

export function PDFHeader({ title }: Props) {
  return (
    <View style={headerStyles.wrapper} fixed>
      <View style={headerStyles.topLine} />
      <View style={headerStyles.row}>
        <Text style={headerStyles.brand}>
          GET<Text style={headerStyles.brandAccent}>BRAIN</Text>
        </Text>
        <Text style={headerStyles.title}>{title.toUpperCase()}</Text>
      </View>
    </View>
  );
}
