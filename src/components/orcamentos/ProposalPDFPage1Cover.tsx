import logoGetBrain from "@/assets/logo-getbrain.svg";
import { PDF_COLORS } from "@/lib/orcamentos/pdfConfig";

interface Props {
  clientName: string;
  clientLogoUrl?: string | null;
}

/**
 * Página 1 — Capa A4. Reproduz o template ANBI:
 * - Fundo preto sólido
 * - Logo GetBrain topo esquerdo
 * - Título "PROPOSTA DE INOVAÇÃO TECNOLÓGICA" em cinza fantasma
 * - Círculos concêntricos cyan decorativos no canto direito
 * - Bloco branco arredondado inferior com logo + nome do cliente
 * - Rodapé: ELABORADO PARA + getbrain.com.br RIO DE JANEIRO, RJ
 */
export function ProposalPDFPage1Cover({ clientName, clientLogoUrl }: Props) {
  return (
    <div
      className="proposal-pdf-page relative overflow-hidden"
      style={{
        width: "210mm",
        height: "297mm",
        backgroundColor: PDF_COLORS.coverBg,
        color: "#fff",
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        pageBreakAfter: "always",
        position: "relative",
      }}
    >
      {/* Círculos concêntricos decorativos (lado direito) */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "8mm",
          right: "-60mm",
          width: "180mm",
          height: "180mm",
          pointerEvents: "none",
        }}
      >
        {[0, 18, 36, 54, 72, 90].map((offset) => (
          <div
            key={offset}
            style={{
              position: "absolute",
              top: `${offset / 2}mm`,
              left: `${offset / 2}mm`,
              right: `${offset / 2}mm`,
              bottom: `${offset / 2}mm`,
              border: `0.6mm solid ${PDF_COLORS.coverCircle}`,
              borderRadius: "50%",
              opacity: 0.35,
            }}
          />
        ))}
      </div>

      {/* Círculos decorativos inferior esquerdo */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: "30mm",
          left: "-30mm",
          width: "60mm",
          height: "60mm",
          pointerEvents: "none",
        }}
      >
        {[0, 8, 16, 24].map((o) => (
          <div
            key={o}
            style={{
              position: "absolute",
              top: `${o / 2}mm`,
              left: `${o / 2}mm`,
              right: `${o / 2}mm`,
              bottom: `${o / 2}mm`,
              border: `0.5mm solid ${PDF_COLORS.coverCircle}`,
              borderRadius: "50%",
              opacity: 0.25,
            }}
          />
        ))}
      </div>

      {/* Logo GetBrain topo esquerdo */}
      <div
        style={{
          position: "absolute",
          top: "20mm",
          left: "20mm",
          display: "flex",
          alignItems: "center",
          gap: "4mm",
        }}
      >
        <img
          src={logoGetBrain}
          alt="GetBrain"
          crossOrigin="anonymous"
          style={{ height: "16mm", filter: "brightness(0) invert(1)" }}
        />
      </div>
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "40mm",
          left: "20mm",
          width: "16mm",
          height: "1mm",
          backgroundColor: "#fff",
        }}
      />

      {/* Título principal */}
      <div
        style={{
          position: "absolute",
          top: "70mm",
          left: "20mm",
          right: "20mm",
          color: PDF_COLORS.coverTitle,
          fontWeight: 700,
          fontSize: "58pt",
          lineHeight: 1.0,
          letterSpacing: "-0.5pt",
          textTransform: "uppercase",
          fontFamily: "'Helvetica Neue Condensed', 'Arial Narrow', Arial, sans-serif",
        }}
      >
        PROPOSTA DE
        <br />
        INOVAÇÃO
        <br />
        TECNOLÓGICA
      </div>

      {/* Bloco branco do cliente */}
      <div
        style={{
          position: "absolute",
          bottom: "35mm",
          left: 0,
          right: "20mm",
          backgroundColor: "#fff",
          borderTopRightRadius: "12mm",
          borderBottomRightRadius: "12mm",
          padding: "8mm 12mm",
          display: "flex",
          alignItems: "center",
          gap: "8mm",
          minHeight: "32mm",
        }}
      >
        {clientLogoUrl ? (
          <img
            src={clientLogoUrl}
            alt={clientName}
            crossOrigin="anonymous"
            style={{
              maxHeight: "26mm",
              maxWidth: "60mm",
              objectFit: "contain",
            }}
          />
        ) : (
          <div
            style={{
              width: "26mm",
              height: "26mm",
              border: `0.8mm solid ${PDF_COLORS.ink}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: PDF_COLORS.ink,
              fontWeight: 700,
              fontSize: "10pt",
            }}
          >
            LOGO
          </div>
        )}
        <div
          style={{
            color: PDF_COLORS.ink,
            fontSize: "16pt",
            fontWeight: 600,
            flex: 1,
          }}
        >
          {clientName}
        </div>
      </div>

      {/* Rodapé */}
      <div
        style={{
          position: "absolute",
          bottom: "12mm",
          left: "20mm",
          right: "20mm",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          color: "#cfcfcf",
          fontSize: "9pt",
          letterSpacing: "1pt",
        }}
      >
        <div>
          <div style={{ fontWeight: 600, marginBottom: "2mm" }}>ELABORADO PARA</div>
          <div style={{ fontSize: "11pt", color: "#fff", fontWeight: 600 }}>
            {clientName}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 600 }}>getbrain.com.br</div>
          <div style={{ marginTop: "1mm" }}>RIO DE JANEIRO, RJ</div>
        </div>
      </div>
    </div>
  );
}
