// Utilitários para a hierarquia de categorias (3 níveis)
// Nível 1: Tipo (fixo) | Nível 2: Subcategoria | Nível 3: Conta

export type TipoCategoria = "receitas" | "despesas" | "impostos" | "retirada" | "transferencias";

export interface TipoConfig {
  key: TipoCategoria;
  label: string;
  /** classe Tailwind para texto */
  textClass: string;
  /** classe Tailwind para fundo claro do header */
  bgClass: string;
  /** classe Tailwind para a barra lateral colorida (border-l) */
  borderClass: string;
  /** classe Tailwind para o badge */
  badgeClass: string;
}

export const TIPOS_CATEGORIA: TipoConfig[] = [
  { key: "receitas",        label: "RECEITAS",        textClass: "text-emerald-700 dark:text-emerald-400", bgClass: "bg-emerald-500/10",  borderClass: "border-l-emerald-500", badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  { key: "despesas",        label: "DESPESAS",        textClass: "text-rose-700 dark:text-rose-400",       bgClass: "bg-rose-500/10",     borderClass: "border-l-rose-500",     badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30" },
  { key: "impostos",        label: "IMPOSTOS",        textClass: "text-orange-700 dark:text-orange-400",   bgClass: "bg-orange-500/10",   borderClass: "border-l-orange-500",   badgeClass: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30" },
  { key: "retirada",        label: "RETIRADA",        textClass: "text-violet-700 dark:text-violet-400",   bgClass: "bg-violet-500/10",   borderClass: "border-l-violet-500",   badgeClass: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30" },
  { key: "transferencias",  label: "TRANSFERÊNCIAS",  textClass: "text-cyan-700 dark:text-cyan-400",       bgClass: "bg-cyan-500/10",     borderClass: "border-l-cyan-500",     badgeClass: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30" },
];

export function getTipoConfig(tipo?: string | null): TipoConfig {
  return TIPOS_CATEGORIA.find(t => t.key === tipo) || TIPOS_CATEGORIA[0];
}

export interface CategoriaRaw {
  id: string;
  nome: string;
  tipo: string;
  categoria_pai_id: string | null;
  ativo: boolean;
}

export interface SubcategoriaNode extends CategoriaRaw {
  contas: CategoriaRaw[];
}

export interface TipoNode {
  config: TipoConfig;
  subcategorias: SubcategoriaNode[];
}

/** Constrói árvore agrupada por tipo → subcategoria → conta */
export function buildCategoriasTree(items: CategoriaRaw[]): TipoNode[] {
  const subs = items.filter(i => !i.categoria_pai_id);
  const contasByPai = new Map<string, CategoriaRaw[]>();
  items.filter(i => i.categoria_pai_id).forEach(c => {
    const arr = contasByPai.get(c.categoria_pai_id!) || [];
    arr.push(c);
    contasByPai.set(c.categoria_pai_id!, arr);
  });

  return TIPOS_CATEGORIA.map(config => {
    const subcategorias = subs
      .filter(s => s.tipo === config.key)
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map<SubcategoriaNode>(s => ({
        ...s,
        contas: (contasByPai.get(s.id) || []).sort((a, b) => a.nome.localeCompare(b.nome)),
      }));
    return { config, subcategorias };
  });
}

/** Retorna "Tipo > Subcategoria > Conta" para qualquer categoria */
export function getCategoriaPath(id: string | null | undefined, items: CategoriaRaw[]): string {
  if (!id) return "—";
  const map = new Map(items.map(i => [i.id, i]));
  const cat = map.get(id);
  if (!cat) return "—";
  const tipoLabel = getTipoConfig(cat.tipo).label;
  if (!cat.categoria_pai_id) {
    // É uma subcategoria
    return `${capitalize(tipoLabel)} > ${cat.nome}`;
  }
  const pai = map.get(cat.categoria_pai_id);
  const paiNome = pai?.nome || "—";
  return `${capitalize(tipoLabel)} > ${paiNome} > ${cat.nome}`;
}

function capitalize(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

export interface HierarchicalOption {
  id: string;
  label: string;          // "Despesas > SAAS > CRM"
  tipo: TipoCategoria;
  level: 2 | 3;
  paiNome?: string;
}

/** Lista plana ordenada para uso em dropdowns hierárquicos.
 *  Inclui subcategorias (nível 2) E contas (nível 3) — usuário escolhe o mais específico.
 *  Filtra apenas ativas. Se restrictTipos for passado, filtra por esses tipos. */
export function getHierarchicalOptions(
  items: CategoriaRaw[],
  restrictTipos?: TipoCategoria[],
): HierarchicalOption[] {
  const tree = buildCategoriasTree(items.filter(i => i.ativo));
  const opts: HierarchicalOption[] = [];
  tree.forEach(tipoNode => {
    if (restrictTipos && !restrictTipos.includes(tipoNode.config.key)) return;
    const tipoLabelCap = capitalize(tipoNode.config.label);
    tipoNode.subcategorias.forEach(sub => {
      opts.push({
        id: sub.id,
        label: `${tipoLabelCap} > ${sub.nome}`,
        tipo: tipoNode.config.key,
        level: 2,
      });
      sub.contas.filter(c => c.ativo).forEach(conta => {
        opts.push({
          id: conta.id,
          label: `${tipoLabelCap} > ${sub.nome} > ${conta.nome}`,
          tipo: tipoNode.config.key,
          level: 3,
          paiNome: sub.nome,
        });
      });
    });
  });
  return opts;
}
