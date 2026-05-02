/**
 * PDFTemplate "Inovação Tecnológica" — Document React-PDF.
 *
 * Estrutura de 7 páginas A4:
 *   1. Cover — capa dark com logo, título, cliente e QR code
 *   2. Empresa — institucional GetBrain
 *   3. Proposta — boas-vindas + resumo executivo + contexto + solução
 *   4. Escopo — items detalhados com deliverables/critérios/dependências
 *   5. Cronograma — tabela de etapas e duração
 *   6. Investimento — tabela de valores + manutenção + validade
 *   7. Considerações — apenas se houver itens
 *
 * 10D-2: watermark "RASCUNHO" em todas as páginas quando `watermark="draft"`.
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
  proposalAccessUrl,
  watermark,
  qrCodeDataUrl,
}: PDFTemplateProps) {
  const hasConsiderations =
    Array.isArray(data.considerations) && data.considerations.length > 0;
  const isDraft = watermark === "draft";

  return (
    <Document
      title={`Proposta ${data.code} - ${data.client_name}`}
      author="GetBrain"
      subject={data.title || `Proposta ${data.code}`}
      keywords={`proposta, getbrain, ${data.client_name}, ${templateVersion}`}
      creator={`GetBrain Hub · template inovacao_tecnologica@${templateVersion}`}
    >
      <CoverPage
        data={data}
        qrCodeDataUrl={qrCodeDataUrl}
        proposalAccessUrl={proposalAccessUrl}
        isDraft={isDraft}
      />
      <EmpresaPage data={data} isDraft={isDraft} />
      <PropostaPage data={data} isDraft={isDraft} />
      <EscopoPage data={data} isDraft={isDraft} />
      <CronogramaPage data={data} isDraft={isDraft} />
      <InvestimentoPage data={data} isDraft={isDraft} />
      {hasConsiderations && <ConsideracoesPage data={data} isDraft={isDraft} />}
    </Document>
  );
}
