/**
 * PDFTemplate "Inovação Tecnológica" — Document React-PDF.
 *
 * Estrutura de 7 páginas A4:
 *   1. Cover — capa dark com logo, título e cliente
 *   2. Empresa — institucional GetBrain
 *   3. Proposta — boas-vindas + resumo executivo + contexto + solução
 *   4. Escopo — items detalhados com deliverables/critérios/dependências
 *   5. Cronograma — tabela de etapas e duração
 *   6. Investimento — tabela de valores + manutenção + validade
 *   7. Considerações — apenas se houver itens
 *
 * Polimento visual completo (capa premium, sumário com índice clicável,
 * QR code, watermark RASCUNHO, gráficos de cronograma, refinamento
 * tipográfico) fica para o 10D-2.
 */

import { Document } from "@react-pdf/renderer";
import type { PDFTemplateProps } from "@/types/proposal-template-props";
import { CoverPage } from "./pages/CoverPage";
import { EmpresaPage } from "./pages/EmpresaPage";
import { PropostaPage } from "./pages/PropostaPage";
import { EscopoPage } from "./pages/EscopoPage";
import { CronogramaPage } from "./pages/CronogramaPage";
import { InvestimentoPage } from "./pages/InvestimentoPage";
import { ConsideracoesPage } from "./pages/ConsideracoesPage";

export function PDFTemplateInovacaoTecnologica({
  data,
  templateVersion,
  proposalAccessUrl: _proposalAccessUrl,
}: PDFTemplateProps) {
  const hasConsiderations =
    Array.isArray(data.considerations) && data.considerations.length > 0;

  return (
    <Document
      title={`Proposta ${data.code} - ${data.client_name}`}
      author="GetBrain"
      subject={data.title || `Proposta ${data.code}`}
      keywords={`proposta, getbrain, ${data.client_name}, ${templateVersion}`}
      creator={`GetBrain Hub · template inovacao_tecnologica@${templateVersion}`}
    >
      <CoverPage data={data} />
      <EmpresaPage data={data} />
      <PropostaPage data={data} />
      <EscopoPage data={data} />
      <CronogramaPage data={data} />
      <InvestimentoPage data={data} />
      {hasConsiderations && <ConsideracoesPage data={data} />}
      {/* QR code page será adicionada no 10D-2 (usa proposalAccessUrl) */}
    </Document>
  );
}
