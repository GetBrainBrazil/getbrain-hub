/**
 * Mapa de strings → ícones lucide-react para uso em conteúdo editável
 * (cards de capacidades na página pública). Lista curada das opções
 * mais úteis no contexto da GetBrain.
 */
import {
  Brain, Code2, Workflow, Layers, Sparkles, Users,
  Zap, Target, Rocket, Cpu, Database, Cloud,
  Shield, Lock, BarChart3, LineChart, PieChart, TrendingUp,
  Lightbulb, Wand2, Bot, MessageSquare, Mail, Phone,
  Settings, Cog, Wrench, Hammer, Boxes, Package,
  Heart, Star, Award, CheckCircle2, Eye, Compass,
  Globe, Map, Network, Share2, GitBranch, Puzzle,
  type LucideIcon,
} from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
  Brain, Code2, Workflow, Layers, Sparkles, Users,
  Zap, Target, Rocket, Cpu, Database, Cloud,
  Shield, Lock, BarChart3, LineChart, PieChart, TrendingUp,
  Lightbulb, Wand2, Bot, MessageSquare, Mail, Phone,
  Settings, Cog, Wrench, Hammer, Boxes, Package,
  Heart, Star, Award, CheckCircle2, Eye, Compass,
  Globe, Map, Network, Share2, GitBranch, Puzzle,
};

export const ICON_NAMES = Object.keys(ICON_MAP);

export function getIcon(name: string | undefined | null): LucideIcon {
  if (!name) return Sparkles;
  return ICON_MAP[name] ?? Sparkles;
}
