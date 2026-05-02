/**
 * Bullet helper — usado em escopo, considerações, listas em geral.
 */

import { View, Text } from "@react-pdf/renderer";
import { styles } from "../styles";

interface Props {
  children: string;
  /** Caractere do bullet. Default: • em ciano. */
  marker?: string;
  markerColor?: string;
}

export function Bullet({ children, marker = "•", markerColor }: Props) {
  return (
    <View style={styles.bulletRow}>
      <Text style={[styles.bulletDot, markerColor ? { color: markerColor } : null]}>
        {marker}
      </Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}
