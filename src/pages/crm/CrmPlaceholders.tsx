import { CrmPlaceholder } from '@/components/crm/CrmPlaceholder';
export function CrmDashboardPlaceholder() { return <CrmPlaceholder title="Dashboard Comercial" description="Métricas do funil, taxa de conversão por origem, forecast ponderado e atividades do time comercial." promptCode="PROMPT 04C" />; }
export function CrmLeadsPlaceholder() { return <CrmPlaceholder title="Gestão de Leads" description="Listagem completa, triagem, conversão em deals e histórico comercial dos leads." promptCode="PROMPT 04B" />; }
export function CrmEmpresasPlaceholder() { return <CrmPlaceholder title="Fichas de Empresa" description="Ficha unificada de cada empresa com histórico completo, contatos, deals e projetos passados." promptCode="PROMPT 04B" />; }
export function CrmCalendarioPlaceholder() { return <CrmPlaceholder title="Calendário Comercial" description="Visão mensal e semanal das reuniões, ligações e follow-ups agendados." promptCode="PROMPT 04C" />; }
