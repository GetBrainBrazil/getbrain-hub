import logoGetBrain from "@/assets/logo-getbrain.svg";
import { PDF_COLORS } from "@/lib/orcamentos/pdfConfig";

interface Props {
  clientName: string;
  clientLogoUrl?: string | null;
}

/**
 * Página 1 — Capa A4. Template "Inovação Tecnológica":
 * - Fundo preto sólido
 * - Logo GetBrain topo esquerdo
 * - Título "PROPOSTA DE INOVAÇÃO TECNOLÓGICA"
 * - Círculos concêntricos cyan decorativos
 * - Bloco branco arredondado inferior com logo + nome do cliente
 */
export function Page1Cover({ clientName, clientLogoUrl }: Props) {
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
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "-40mm",
          right: "-80mm",
          width: "260mm",
          height: "260mm",
          background: `radial-gradient(circle at 30% 50%, ${PDF_COLORS.coverCircle}33 0%, transparent 55%)`,
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "0mm",
          right: "-70mm",
          width: "200mm",
          height: "200mm",
          pointerEvents: "none",
        }}
      >
        {[0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 104].map((offset, i) => (
          <div
            key={offset}
            style={{
              position: "absolute",
              top: `${offset / 2}mm`,
              left: `${offset / 2}mm`,
              right: `${offset / 2}mm`,
              bottom: `${offset / 2}mm`,
              border: `0.5mm solid ${PDF_COLORS.coverCircle}`,
              borderRadius: "50%",
              opacity: 0.18 + (i % 3) * 0.12,
            }}
          />
        ))}
      </div>
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: "26mm",
          left: "-40mm",
          width: "80mm",
          height: "80mm",
          pointerEvents: "none",
        }}
      >
        {[0, 6, 12, 18, 24, 30, 36, 42].map((o, i) => (
          <div
            key={o}
            style={{
              position: "absolute",
              top: `${o / 2}mm`,
              left: `${o / 2}mm`,
              right: `${o / 2}mm`,
              bottom: `${o / 2}mm`,
              border: `0.4mm solid ${PDF_COLORS.coverCircle}`,
              borderRadius: "50%",
              opacity: 0.14 + (i % 2) * 0.1,
            }}
          />
        ))}
      </div>
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "22mm",
          right: "22mm",
          width: "5mm",
          height: "5mm",
          backgroundColor: PDF_COLORS.coverCircle,
          borderRadius: "50%",
          boxShadow: `0 0 0 2mm ${PDF_COLORS.coverCircle}33`,
        }}
      />
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
              width: "28mm",
              height: "28mm",
              borderRadius: "50%",
              border: `0.6mm dashed ${PDF_COLORS.inkSoft}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: PDF_COLORS.inkSoft,
              fontWeight: 600,
              fontSize: "8pt",
              letterSpacing: "1.5pt",
              textAlign: "center",
              lineHeight: 1.1,
            }}
          >
            LOGO
            <br />
            CLIENTE
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
