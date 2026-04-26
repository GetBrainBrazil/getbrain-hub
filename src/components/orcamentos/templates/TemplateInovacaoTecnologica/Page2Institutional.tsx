import logoGetBrain from "@/assets/logo-getbrain.svg";
import { PDF_COLORS } from "@/lib/orcamentos/pdfConfig";

const METAS = [
  {
    n: "01",
    title: "Aprimorar a Eficiência Operacional",
    text: "Implementar soluções de inteligência artificial e automação para otimizar processos internos, reduzindo custos e melhorando a produtividade",
  },
  {
    n: "02",
    title: "Transformar a Experiência do Cliente",
    text: "Utilizar dados e insights analíticos para criar experiências personalizadas e inovadoras, visando aumentar a satisfação do cliente.",
  },
  {
    n: "03",
    title: "Expandir a Capacidade de Integração Tecnológica",
    text: "Integrar novas plataformas e ferramentas com o sistema existente, promovendo uma comunicação mais fluida e eficiente entre as áreas.",
  },
  {
    n: "04",
    title: "Otimizar o Gerenciamento de Dados",
    text: "Implementar práticas eficazes para organização, análise e utilização de dados, garantindo que sejam acessíveis e aproveitados de forma eficiente para impulsionar a tomada de decisões estratégicas.",
  },
];

/**
 * Página 2 — Conteúdo institucional FIXO. Reproduz literalmente o template ANBI.
 */
export function ProposalPDFPage2Institutional() {
  return (
    <div
      className="proposal-pdf-page relative overflow-hidden"
      style={{
        width: "210mm",
        height: "297mm",
        backgroundColor: "#fff",
        color: PDF_COLORS.ink,
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        pageBreakAfter: "always",
        position: "relative",
        padding: "20mm 18mm 18mm 18mm",
      }}
    >
      {/* Círculos decorativos canto superior direito */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "-20mm",
          right: "-30mm",
          width: "120mm",
          height: "120mm",
          pointerEvents: "none",
        }}
      >
        {[0, 12, 24, 36, 48].map((o) => (
          <div
            key={o}
            style={{
              position: "absolute",
              top: `${o / 2}mm`,
              left: `${o / 2}mm`,
              right: `${o / 2}mm`,
              bottom: `${o / 2}mm`,
              border: `0.5mm solid ${PDF_COLORS.ink}`,
              borderRadius: "50%",
              opacity: 0.18,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div
        style={{
          fontSize: "10pt",
          color: PDF_COLORS.inkSoft,
          letterSpacing: "2pt",
          fontWeight: 500,
        }}
      >
        PROPOSTA DE
        <br />
        INOVAÇÃO TECNOLÓGICA
      </div>
      <div
        style={{
          width: "60mm",
          height: "0.6mm",
          backgroundColor: PDF_COLORS.ink,
          marginTop: "3mm",
        }}
      />

      {/* A EMPRESA */}
      <div style={{ marginTop: "18mm", maxWidth: "115mm" }}>
        <h2
          style={{
            fontSize: "24pt",
            fontWeight: 400,
            color: PDF_COLORS.inkSoft,
            margin: 0,
            letterSpacing: "1pt",
          }}
        >
          A EMPRESA
        </h2>
        <div
          style={{
            marginTop: "6mm",
            fontSize: "10pt",
            lineHeight: 1.55,
            textAlign: "justify",
            color: PDF_COLORS.ink,
          }}
        >
          <p style={{ margin: "0 0 4mm 0" }}>
            A GetBrain é uma empresa especializada em soluções inovadoras de
            tecnologia e inteligência artificial, focada em transformar a
            maneira como pequenas e médias empresas atuam no mercado.
          </p>
          <p style={{ margin: "0 0 4mm 0" }}>
            Com uma equipe qualificada e um portfólio diversificado de
            serviços, oferecemos soluções personalizadas para atender às
            necessidades específicas de cada cliente, promovendo eficiência e
            otimizando processos.
          </p>
          <p style={{ margin: 0 }}>
            Nossa abordagem prática e centrada no cliente permite a criação
            de estratégias inteligentes que geram resultados reais. Estamos
            comprometidos com o sucesso de nossos clientes a longo prazo.
          </p>
        </div>
      </div>

      {/* METAS E OBJETIVOS */}
      <div style={{ marginTop: "16mm" }}>
        <h2
          style={{
            fontSize: "24pt",
            fontWeight: 400,
            color: PDF_COLORS.inkSoft,
            margin: 0,
            letterSpacing: "1pt",
          }}
        >
          METAS E OBJETIVOS
        </h2>
        <div
          style={{
            marginTop: "6mm",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "6mm 8mm",
          }}
        >
          {METAS.map((m) => (
            <div
              key={m.n}
              style={{ display: "flex", gap: "4mm", alignItems: "flex-start" }}
            >
              <div
                style={{
                  flex: "0 0 14mm",
                  height: "14mm",
                  borderRadius: "50%",
                  backgroundColor: PDF_COLORS.inkSoft,
                  color: "#fff",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11pt",
                }}
              >
                {m.n}
              </div>
              <div style={{ fontSize: "9pt", lineHeight: 1.45 }}>
                <div style={{ fontWeight: 700, marginBottom: "1mm" }}>
                  {m.title}
                </div>
                <div>{m.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rodapé */}
      <div
        style={{
          position: "absolute",
          bottom: "10mm",
          left: "18mm",
          right: "18mm",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "8pt",
          letterSpacing: "1pt",
          color: PDF_COLORS.ink,
        }}
      >
        <img
          src={logoGetBrain}
          alt=""
          crossOrigin="anonymous"
          style={{ height: "8mm" }}
        />
        <div style={{ flex: 1, textAlign: "center", fontWeight: 500 }}>
          GETBRAIN SOLUÇÕES EM TECNOLOGIA E INTELIGENCIA ARTIFICIAL LTDA
        </div>
        <div style={{ fontWeight: 600 }}>PG.1</div>
      </div>
    </div>
  );
}
