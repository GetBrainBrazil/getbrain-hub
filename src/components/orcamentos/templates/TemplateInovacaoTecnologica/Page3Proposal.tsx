import logoGetBrain from "@/assets/logo-getbrain.svg";
import { PDF_COLORS } from "@/lib/orcamentos/pdfConfig";
import {
  calculateScopeTotal,
  formatBRL,
  formatDateBR,
  type ScopeItem,
} from "@/lib/orcamentos/calculateTotal";

interface Props {
  scopeItems: ScopeItem[];
  maintenanceMonthlyValue: number | null;
  maintenanceDescription: string | null;
  implementationDays: number;
  validationDays: number;
  considerations: string[];
  validUntil: string;
}

const CRONOGRAMA = [
  ["Planejamento", "Definição de escopo, objetivos e recursos necessários para o projeto."],
  ["Tratamento de Dados", "Análise, limpeza e estruturação dos dados para integração no sistema."],
  ["Desenvolvimento", "Criação do sistema, arquitetura e desenvolvimento inicial."],
  ["Integração", "Integração do sistema com outras plataformas e fontes de dados."],
  ["Implementação", "Implementação do sistema em ambiente de produção e ajustes finais."],
  ["Validação", "Testes e validação do sistema, incluindo testes de performance, segurança e integração."],
  ["Acompanhamento", "Monitoramento pós-implementação, ajustes e correções conforme necessidade."],
];

/**
 * Página 3 — Conteúdo dinâmico (proposta + cronograma + prazo + considerações).
 */
export function Page3Proposal({
  scopeItems,
  maintenanceMonthlyValue,
  maintenanceDescription,
  implementationDays,
  validationDays,
  considerations,
  validUntil,
}: Props) {
  const total = calculateScopeTotal(scopeItems);
  const items = Array.isArray(scopeItems) ? scopeItems : [];

  const cellPad = "3mm 4mm";
  const borderColor = PDF_COLORS.tableBorder;

  return (
    <div
      className="proposal-pdf-page relative overflow-hidden"
      style={{
        width: "210mm",
        height: "297mm",
        backgroundColor: "#fff",
        color: PDF_COLORS.ink,
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        position: "relative",
        padding: "20mm 18mm 18mm 18mm",
      }}
    >
      {/* Header (alinhado à direita) */}
      <div style={{ textAlign: "right" }}>
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
            marginLeft: "auto",
          }}
        />
      </div>

      {/* PROPOSTA */}
      <h2
        style={{
          fontSize: "26pt",
          fontWeight: 400,
          color: PDF_COLORS.inkSoft,
          margin: "8mm 0 4mm 0",
          letterSpacing: "1pt",
        }}
      >
        PROPOSTA
      </h2>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          border: `0.4mm solid ${borderColor}`,
          fontSize: "9pt",
        }}
      >
        <thead>
          <tr style={{ backgroundColor: PDF_COLORS.tableHeader }}>
            <th
              style={{
                width: "60%",
                textAlign: "center",
                padding: cellPad,
                borderRight: `0.4mm solid ${borderColor}`,
                borderBottom: `0.4mm solid ${borderColor}`,
                fontWeight: 700,
              }}
            >
              Descrição
            </th>
            <th
              style={{
                width: "40%",
                textAlign: "center",
                padding: cellPad,
                borderBottom: `0.4mm solid ${borderColor}`,
                fontWeight: 700,
              }}
            >
              Investimento
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td
                colSpan={2}
                style={{
                  padding: "10mm",
                  textAlign: "center",
                  color: PDF_COLORS.inkSoft,
                  fontStyle: "italic",
                }}
              >
                Adicione pelo menos um item à proposta.
              </td>
            </tr>
          )}
          {items.map((it, idx) => {
            const isLast = idx === items.length - 1;
            return (
              <tr key={idx}>
                <td
                  style={{
                    padding: cellPad,
                    borderRight: `0.4mm solid ${borderColor}`,
                    verticalAlign: "top",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: "1mm" }}>
                    {it.title}:
                  </div>
                  {it.description && (
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: "5mm",
                        lineHeight: 1.4,
                      }}
                    >
                      {it.description
                        .split(/\n+/)
                        .map((l) => l.trim())
                        .filter(Boolean)
                        .map((l, i) => (
                          <li key={i}>{l.replace(/^[-•]\s*/, "")}</li>
                        ))}
                    </ul>
                  )}
                </td>
                <td
                  style={{
                    padding: cellPad,
                    verticalAlign: "top",
                    textAlign: "right",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: "1mm" }}>
                    {it.title}:
                  </div>
                  <div
                    style={{
                      color: PDF_COLORS.money,
                      fontWeight: 700,
                      fontSize: "11pt",
                    }}
                  >
                    {formatBRL(Number(it.value) || 0)}
                  </div>
                  {isLast && (
                    <div style={{ marginTop: "4mm", fontWeight: 700 }}>
                      TOTAL:{" "}
                      <span
                        style={{
                          color: PDF_COLORS.total,
                          fontSize: "12pt",
                        }}
                      >
                        {formatBRL(total)}
                      </span>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
          {maintenanceMonthlyValue && maintenanceMonthlyValue > 0 && (
            <tr>
              <td
                style={{
                  padding: cellPad,
                  borderRight: `0.4mm solid ${borderColor}`,
                  borderTop: `0.4mm solid ${borderColor}`,
                }}
              ></td>
              <td
                style={{
                  padding: cellPad,
                  textAlign: "right",
                  borderTop: `0.4mm solid ${borderColor}`,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: "1mm" }}>
                  Manutenção mensal ({maintenanceDescription || "Tokens + Servidor + Desenvolvedor"}):
                </div>
                <div
                  style={{
                    color: PDF_COLORS.money,
                    fontWeight: 700,
                    fontSize: "11pt",
                  }}
                >
                  {formatBRL(maintenanceMonthlyValue)}
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* CRONOGRAMA */}
      <h2
        style={{
          fontSize: "22pt",
          fontWeight: 400,
          color: PDF_COLORS.inkSoft,
          margin: "8mm 0 3mm 0",
          letterSpacing: "1pt",
        }}
      >
        CRONOGRAMA
      </h2>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          border: `0.4mm solid ${borderColor}`,
          fontSize: "9pt",
        }}
      >
        <thead>
          <tr style={{ backgroundColor: PDF_COLORS.tableHeader }}>
            <th
              style={{
                width: "28%",
                textAlign: "center",
                padding: "2.5mm 4mm",
                borderRight: `0.4mm solid ${borderColor}`,
                borderBottom: `0.4mm solid ${borderColor}`,
                fontWeight: 700,
              }}
            >
              Etapa
            </th>
            <th
              style={{
                textAlign: "center",
                padding: "2.5mm 4mm",
                borderBottom: `0.4mm solid ${borderColor}`,
                fontWeight: 700,
              }}
            >
              Descrição
            </th>
          </tr>
        </thead>
        <tbody>
          {CRONOGRAMA.map(([etapa, desc], i) => (
            <tr key={etapa}>
              <td
                style={{
                  padding: "2.5mm 4mm",
                  borderRight: `0.4mm solid ${borderColor}`,
                  borderTop: i > 0 ? `0.3mm solid ${borderColor}` : "none",
                }}
              >
                {etapa}
              </td>
              <td
                style={{
                  padding: "2.5mm 4mm",
                  borderTop: i > 0 ? `0.3mm solid ${borderColor}` : "none",
                }}
              >
                {desc}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* PRAZO + CONSIDERAÇÕES */}
      <div
        style={{
          marginTop: "8mm",
          display: "grid",
          gridTemplateColumns: "40% 60%",
          gap: "6mm",
        }}
      >
        <div>
          <h3
            style={{
              fontSize: "20pt",
              fontWeight: 400,
              color: PDF_COLORS.inkSoft,
              margin: "0 0 3mm 0",
              letterSpacing: "1pt",
            }}
          >
            PRAZO
          </h3>
          <div
            style={{
              border: `0.3mm solid ${borderColor}`,
              padding: "4mm",
              fontSize: "9pt",
              lineHeight: 1.6,
              minHeight: "30mm",
            }}
          >
            {implementationDays} dias para Implementação
            <br />
            {validationDays} dias para ajustes e validação
          </div>
        </div>
        <div>
          <h3
            style={{
              fontSize: "20pt",
              fontWeight: 400,
              color: PDF_COLORS.inkSoft,
              margin: "0 0 3mm 0",
              letterSpacing: "1pt",
            }}
          >
            CONSIDERAÇÕES
          </h3>
          <div
            style={{
              border: `0.3mm solid ${borderColor}`,
              padding: "4mm",
              fontSize: "9pt",
              lineHeight: 1.55,
              minHeight: "30mm",
            }}
          >
            <ul style={{ margin: 0, paddingLeft: "5mm" }}>
              {(considerations || []).map((c, i) => (
                <li key={i} style={{ marginBottom: "2mm" }}>
                  {c}
                </li>
              ))}
              <li>Validade da proposta: {formatDateBR(validUntil)}</li>
            </ul>
          </div>
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
        <div style={{ fontWeight: 600 }}>PG.2</div>
      </div>
    </div>
  );
}
