/**
 * Watermark "RASCUNHO" — renderizado fixo em todas as páginas como aviso
 * visual de que a proposta ainda não foi enviada ou foi recusada.
 *
 * Usa rotação via transformação CSS-like (`transform: rotate(...)`),
 * suportada pelo React-PDF a partir da v3.
 */
import { View, Text, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  text: {
    fontFamily: "Helvetica-Bold",
    fontSize: 120,
    color: "#dc2626",
    opacity: 0.08,
    letterSpacing: 12,
    transform: "rotate(-30deg)",
  },
});

export function Watermark({ label = "RASCUNHO" }: { label?: string }) {
  return (
    <View style={styles.wrapper} fixed>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}
