/**
 * Informações institucionais fixas da GetBrain.
 *
 * Usado no rodapé de PDFs, emails transacionais e onde houver necessidade
 * de exibir CNPJ/razão social oficial.
 *
 * Se algum dia precisar variar por organization, mover pra coluna na
 * tabela `organizations`. Por ora a plataforma serve uma única tenant.
 */
export const GETBRAIN_INFO = {
  name: "GetBrain",
  legalName: "GetBrain Soluções em Tecnologia e Inteligência Artificial Ltda",
  cnpj: "60.322.691/0001-71",
  city: "Rio de Janeiro, RJ",
  website: "getbrain.com.br",
  email: "daniel@getbrain.com.br",
  whatsapp: "5521973818244", // Daniel — usado em links wa.me/
} as const;

/** Helper para gerar URL do WhatsApp com mensagem pré-preenchida. */
export function whatsappUrl(message: string, phone: string = GETBRAIN_INFO.whatsapp): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
