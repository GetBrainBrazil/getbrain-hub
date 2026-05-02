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
} as const;
