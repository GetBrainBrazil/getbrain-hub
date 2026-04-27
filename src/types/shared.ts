// Tipos compartilhados entre módulos.
// AcceptanceCriterion vive originalmente em tasks.ts; reexportamos aqui
// para uso em projetos (e futuros módulos) sem criar dependência cruzada.
export type { AcceptanceCriterion } from "./tasks";
