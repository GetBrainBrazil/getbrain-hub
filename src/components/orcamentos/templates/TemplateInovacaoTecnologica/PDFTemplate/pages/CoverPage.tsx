/**
 * Página 1 — Capa.
 *
 * Layout funcional pro 10D-1 (polimento visual fica pro 10D-2):
 * - Faixa preta no topo com logo GetBrain
 * - Título principal "PROPOSTA DE [TÍTULO]"
 * - Subtítulo "para [CLIENTE]"
 * - Logo do cliente (se houver) em bloco branco
 * - Rodapé da capa com data e validade
 *
 * NÃO tem PDFHeader/PDFFooter — capa é página standalone.
 */

import { Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import logoGetBrain from "@/assets/logo-getbrain-oficial.svg";
import type { ProposalDataForTemplate } from "@/types/proposal-template-props";
import { colors, fontSizes, spacing } from "../styles";
import { formatDateBR } from "../components/format";
import { Watermark } from "../components/Watermark";

const coverStyles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: colors.coverBg,
    color: colors.textInverse,
    padding: 0,
  },
  topBar: {
    backgroundColor: colors.coverBg,
    paddingHorizontal: spacing.page,
    paddingTop: 60,
    paddingBottom: spacing.lg,
  },
  logo: {
    width: 120,
    height: 36,
    objectFit: "contain",
  },
  accentBar: {
    height: 3,
    width: 56,
    backgroundColor: colors.primary,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  hero: {
    paddingHorizontal: spacing.page,
    marginTop: 80,
  },
  eyebrow: {
    fontSize: fontSizes.caption,
    color: colors.primary,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: "Helvetica-Bold",
    fontSize: 38,
    color: colors.textInverse,
    lineHeight: 1.1,
    marginBottom: spacing.lg,
  },
  subtitle: {
    fontSize: fontSizes.h2,
    color: "#cbd5e1",
    lineHeight: 1.4,
  },
  clientName: {
    color: colors.primary,
    fontFamily: "Helvetica-Bold",
  },
  clientCard: {
    marginTop: 80,
    marginHorizontal: spacing.page,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 80,
  },
  clientLogo: {
    width: 64,
    height: 56,
    objectFit: "contain",
  },
  clientPlaceholder: {
    width: 64,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  clientPlaceholderText: {
    fontSize: 7,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  clientCardText: {
    flex: 1,
  },
  clientCardLabel: {
    fontSize: fontSizes.caption,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  clientCardName: {
    fontFamily: "Helvetica-Bold",
    fontSize: fontSizes.h3,
    color: colors.text,
  },
  footer: {
    position: "absolute",
    bottom: 36,
    left: spacing.page,
    right: spacing.page,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerLabel: {
    fontSize: 8,
    color: "#94a3b8",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  footerValue: {
    fontSize: fontSizes.caption,
    color: colors.textInverse,
    fontFamily: "Helvetica-Bold",
  },
  footerSiteText: {
    fontSize: fontSizes.caption,
    color: colors.primary,
    fontFamily: "Helvetica-Bold",
  },
});

interface Props {
  data: ProposalDataForTemplate;
  qrCodeDataUrl?: string | null;
  proposalAccessUrl?: string;
  isDraft?: boolean;
}

export function CoverPage({ data, qrCodeDataUrl, proposalAccessUrl, isDraft }: Props) {
  return (
    <Page size="A4" style={coverStyles.page}>
      <View style={coverStyles.topBar}>
        {/*
          O SVG de logo atual contém PNG embedado em base64. React-PDF aceita
          via <Image src=... /> normalmente. Dívida técnica: 10D-2 troca por
          SVG vetorial puro pra qualidade de impressão real.
        */}
        <Image src={logoGetBrain} style={coverStyles.logo} />
        <View style={coverStyles.accentBar} />
      </View>

      <View style={coverStyles.hero}>
        <Text style={coverStyles.eyebrow}>Proposta Comercial</Text>
        <Text style={coverStyles.title}>{data.title || "Proposta Comercial"}</Text>
        <Text style={coverStyles.subtitle}>
          Elaborada para{"  "}
          <Text style={coverStyles.clientName}>{data.client_name}</Text>
        </Text>
      </View>

      <View style={coverStyles.clientCard}>
        {data.client_logo_url ? (
          <Image src={data.client_logo_url} style={coverStyles.clientLogo} />
        ) : (
          <View style={coverStyles.clientPlaceholder}>
            <Text style={coverStyles.clientPlaceholderText}>LOGO</Text>
          </View>
        )}
        <View style={coverStyles.clientCardText}>
          <Text style={coverStyles.clientCardLabel}>Cliente</Text>
          <Text style={coverStyles.clientCardName}>{data.client_name}</Text>
          {data.client_city && (
            <Text style={[coverStyles.clientCardLabel, { marginTop: 4 }]}>
              {data.client_city}
            </Text>
          )}
        </View>
      </View>

      <View style={coverStyles.footer}>
        <View>
          <Text style={coverStyles.footerLabel}>Emitida em</Text>
          <Text style={coverStyles.footerValue}>{formatDateBR(data.generated_at)}</Text>
          <Text style={[coverStyles.footerLabel, { marginTop: 6 }]}>Válida até</Text>
          <Text style={coverStyles.footerValue}>{formatDateBR(data.expires_at)}</Text>
        </View>
        <View style={{ alignItems: "center" }}>
          {qrCodeDataUrl ? (
            <>
              <Image src={qrCodeDataUrl} style={{ width: 70, height: 70, backgroundColor: "#fff", padding: 4, borderRadius: 4 }} />
              <Text style={[coverStyles.footerLabel, { marginTop: 6, textAlign: "center" }]}>
                Acesse a versão digital
              </Text>
            </>
          ) : null}
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={coverStyles.footerLabel}>Documento</Text>
          <Text style={coverStyles.footerValue}>{data.code}</Text>
          <Text style={[coverStyles.footerSiteText, { marginTop: 8 }]}>
            getbrain.com.br
          </Text>
        </View>
      </View>
      {isDraft && <Watermark />}
      {/* proposalAccessUrl reservado para futura página de QR dedicada */}
      {proposalAccessUrl ? null : null}
    </Page>
  );
}
