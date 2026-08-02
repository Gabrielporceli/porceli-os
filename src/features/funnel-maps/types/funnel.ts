import {
  LayoutTemplate, FileText, Inbox, ShoppingCart, TrendingUp, TrendingDown,
  PartyPopper, Presentation, Newspaper, Globe, Search, Mail, Users, Network,
  MousePointerClick, MousePointer2, PlayCircle, ShoppingBag, FormInput, CreditCard, PhoneCall, Download, Zap, UserPlus, Trophy,
  Phone, CalendarDays, Mailbox, Radio, Building2, Calendar, ClipboardCheck, Lock, AppWindow,
  Newspaper as Newspaper2, Video, Briefcase, IdCard, GraduationCap, QrCode, PenLine, BookOpen, Flag, Tag, MessageSquare, Handshake, Sparkles,
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaGoogle, FaYoutube, FaTiktok, FaWhatsapp, FaLinkedin, FaPinterestP, FaRedditAlien } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import type { IconType } from 'react-icons';

export type FunnelNodeCategory = 'traffic' | 'page' | 'action' | 'offline';
export type CanvasNodeType = 'funnelNode' | 'pageNode' | 'noteNode' | 'imageNode' | 'forecastNode' | 'rateNode';

export interface FunnelNodeData {
  category: FunnelNodeCategory;
  variant: string;
  label: string;
  /** Entry visitors per period. Only meaningful on `traffic` nodes. */
  visitors?: number;
  /** Live page URL, for `page` nodes. */
  url?: string;
  /** Spend in R$ associated with this touchpoint (ad spend, event cost, etc). */
  cost?: number;
  /** Average order value in R$. Presence + >0 marks this node as a revenue goal. */
  avgTicket?: number;
  /** Which metrics to display on the card (default: all shown). */
  showPeople?: boolean;
  showCost?: boolean;
  showRevenue?: boolean;
  /** Free-form annotation shown only in the properties panel. */
  notes?: string;
  [key: string]: unknown;
}

export interface NoteNodeData {
  text: string;
  [key: string]: unknown;
}

export interface ImageNodeData {
  src: string | null;
  [key: string]: unknown;
}

/** The Taxa/Pessoas connector card: a real node sitting between two funnel
 *  cards (not a floating edge label), so its position — and therefore the
 *  angle of the two line segments touching it — is fully draggable. */
export interface RateNodeData {
  /** % of the incoming people that continue on to the target (0-100). */
  rate: number;
  curve?: 'bezier' | 'straight';
  dashed?: boolean;
  [key: string]: unknown;
}

export interface FunnelNodeComputed {
  /** People arriving at (traffic: originating from) this node. */
  people: number;
  revenue?: number;
  /** Cost divided by people passing through — custo por visita/lead. */
  costPerPerson?: number;
}

export interface FunnelMap {
  id: string;
  name: string;
  nodes: FunnelMapNode[];
  edges: FunnelMapEdge[];
  createdAt: number;
  updatedAt: number;
}

export interface FunnelMapNode {
  id: string;
  type: CanvasNodeType;
  position: { x: number; y: number };
  data: FunnelNodeData | NoteNodeData | ImageNodeData | RateNodeData | Record<string, never>;
}

export interface FunnelMapEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface ElementVariant {
  id: string;
  label: string;
  icon: typeof Globe | IconType;
  /** Brand color for the icon badge. Falls back to the category color when unset. */
  color?: string;
  /** Traffic only: shows a small $ badge to distinguish paid from organic/owned channels. */
  paid?: boolean;
}

export const CATEGORY_DEFS: Record<FunnelNodeCategory, { label: string; color: string }> = {
  traffic: { label: 'Fontes de Tráfego', color: '#0ea5e9' },
  page: { label: 'Páginas', color: '#6829c0' },
  action: { label: 'Ações', color: '#f59e0b' },
  offline: { label: 'Offline', color: '#22c55e' },
};

export const ELEMENT_LIBRARY: Record<FunnelNodeCategory, ElementVariant[]> = {
  traffic: [
    // Pago
    { id: 'facebook-ads', label: 'Facebook Ads', icon: FaFacebook, color: '#1877F2', paid: true },
    { id: 'instagram-ads', label: 'Instagram Ads', icon: FaInstagram, color: '#E4405F', paid: true },
    { id: 'google-ads', label: 'Google Ads', icon: FaGoogle, color: '#34A853', paid: true },
    { id: 'bing-ads', label: 'Bing Ads', icon: Search, color: '#00809D', paid: true },
    { id: 'linkedin-ads', label: 'LinkedIn Ads', icon: FaLinkedin, color: '#0A66C2', paid: true },
    { id: 'youtube-ads', label: 'YouTube Ads', icon: FaYoutube, color: '#FF0000', paid: true },
    { id: 'x-ads', label: 'X Ads', icon: FaXTwitter, color: '#000000', paid: true },
    { id: 'tiktok-ads', label: 'TikTok Ads', icon: FaTiktok, color: '#111111', paid: true },
    { id: 'pinterest-ads', label: 'Pinterest Ads', icon: FaPinterestP, color: '#E60023', paid: true },
    { id: 'reddit-ads', label: 'Reddit Ads', icon: FaRedditAlien, color: '#FF4500', paid: true },
    // Busca
    { id: 'all-search', label: 'Toda Busca', icon: Search, color: '#EA4335' },
    { id: 'google-organic', label: 'Google (Orgânico)', icon: FaGoogle, color: '#4285F4' },
    { id: 'bing-organic', label: 'Bing (Orgânico)', icon: Search, color: '#00809D' },
    // Social orgânico
    { id: 'facebook-organic', label: 'Facebook Orgânico', icon: FaFacebook, color: '#1877F2' },
    { id: 'instagram-organic', label: 'Instagram Orgânico', icon: FaInstagram, color: '#E4405F' },
    { id: 'linkedin-organic', label: 'LinkedIn Orgânico', icon: FaLinkedin, color: '#0A66C2' },
    { id: 'tiktok-organic', label: 'TikTok Orgânico', icon: FaTiktok, color: '#111111' },
    { id: 'x-organic', label: 'X Orgânico', icon: FaXTwitter, color: '#000000' },
    { id: 'pinterest-organic', label: 'Pinterest Orgânico', icon: FaPinterestP, color: '#E60023' },
    { id: 'reddit-organic', label: 'Reddit Orgânico', icon: FaRedditAlien, color: '#FF4500' },
    { id: 'youtube-organic', label: 'YouTube Orgânico', icon: FaYoutube, color: '#FF0000' },
    // Outros
    { id: 'whatsapp-source', label: 'WhatsApp', icon: FaWhatsapp, color: '#25D366' },
    { id: 'email-source', label: 'E-mail', icon: Mail },
    { id: 'referral', label: 'Indicação', icon: Users },
    { id: 'affiliate', label: 'Afiliados', icon: Network },
    { id: 'direct', label: 'Direto', icon: MousePointer2 },
    { id: 'custom', label: 'Personalizado', icon: Sparkles },
  ],
  page: [
    { id: 'generic-page', label: 'Página Genérica', icon: Globe },
    { id: 'download', label: 'Download', icon: Download },
    { id: 'optin', label: 'Página de Captura', icon: Inbox },
    { id: 'order', label: 'Página de Pedido', icon: ShoppingCart },
    { id: 'sales', label: 'Página de Vendas', icon: FileText },
    { id: 'sales-v2', label: 'Página de Vendas V2', icon: LayoutTemplate },
    { id: 'calendar', label: 'Calendário', icon: Calendar },
    { id: 'survey', label: 'Pesquisa', icon: ClipboardCheck },
    { id: 'upsell', label: 'Upsell / OTO', icon: TrendingUp },
    { id: 'downsell', label: 'Downsell', icon: TrendingDown },
    { id: 'webinar-live', label: 'Webinar Ao Vivo', icon: Presentation },
    { id: 'webinar-replay', label: 'Webinar Gravado', icon: Video },
    { id: 'blog', label: 'Post de Blog', icon: Newspaper },
    { id: 'members', label: 'Área de Membros', icon: Lock },
    { id: 'thankyou', label: 'Obrigado', icon: PartyPopper },
    { id: 'popup', label: 'Popup', icon: AppWindow },
    { id: 'custom', label: 'Personalizado', icon: Sparkles },
  ],
  action: [
    { id: 'purchase', label: 'Comprar', icon: CreditCard },
    { id: 'whatsapp-click', label: 'Clique no WhatsApp', icon: FaWhatsapp, color: '#25D366' },
    { id: 'message-received', label: 'Mensagem Recebida', icon: MessageSquare },
    { id: 'became-contact', label: 'Virou Contato', icon: UserPlus },
    { id: 'converted', label: 'Convertido', icon: Trophy },
    { id: 'submit-form', label: 'Preencher Formulário', icon: FormInput },
    { id: 'book-call', label: 'Agendar Chamada', icon: PhoneCall },
    { id: 'deal-won', label: 'Negócio Fechado', icon: Handshake },
    { id: 'watch-video', label: 'Assistir Vídeo', icon: PlayCircle },
    { id: 'click-ad', label: 'Clicar no Anúncio', icon: MousePointerClick },
    { id: 'link-click', label: 'Clique no Link', icon: MousePointerClick },
    { id: 'scroll', label: 'Rolar Página', icon: TrendingDown },
    { id: 'add-to-cart', label: 'Adicionar ao Carrinho', icon: ShoppingBag },
    { id: 'download', label: 'Baixar Arquivo', icon: Download },
    { id: 'contact', label: 'Contato', icon: MessageSquare },
    { id: 'add-tag', label: 'Adicionar Tag', icon: Tag },
    { id: 'generic-action', label: 'Ação Genérica', icon: Zap },
    { id: 'custom', label: 'Personalizado', icon: Sparkles },
  ],
  offline: [
    { id: 'phone-call', label: 'Ligação', icon: Phone },
    { id: 'meeting', label: 'Reunião', icon: Users },
    { id: 'event', label: 'Evento', icon: CalendarDays },
    { id: 'conference', label: 'Conferência', icon: Presentation },
    { id: 'job-interview', label: 'Entrevista', icon: Briefcase },
    { id: 'workshop', label: 'Workshop / Palestra', icon: GraduationCap },
    { id: 'direct-mail', label: 'Mala Direta', icon: Mailbox },
    { id: 'print-ad', label: 'Anúncio Impresso', icon: Newspaper2 },
    { id: 'guest-blog', label: 'Guest Post', icon: PenLine },
    { id: 'biz-directory', label: 'Diretório', icon: BookOpen },
    { id: 'billboard', label: 'Outdoor', icon: Flag },
    { id: 'offline-ad', label: 'TV / Rádio', icon: Radio },
    { id: 'business-card', label: 'Cartão de Visita', icon: IdCard },
    { id: 'qr-code', label: 'QR Code', icon: QrCode },
    { id: 'generic-offline', label: 'Offline Genérico', icon: Building2 },
    { id: 'custom', label: 'Personalizado', icon: Sparkles },
  ],
};

export function findVariant(category: FunnelNodeCategory, variantId: string): ElementVariant {
  return (
    ELEMENT_LIBRARY[category].find((v) => v.id === variantId) ?? ELEMENT_LIBRARY[category][ELEMENT_LIBRARY[category].length - 1]
  );
}

/** Sub-sections for the Fontes de Tráfego tab, mirroring the reference's Paid/Search/Social/Other grouping. */
export const TRAFFIC_GROUP_ORDER = ['Pago', 'Busca', 'Social', 'Outros'] as const;

export const TRAFFIC_GROUPS: Record<(typeof TRAFFIC_GROUP_ORDER)[number], string[]> = {
  Pago: [
    'facebook-ads', 'instagram-ads', 'google-ads', 'bing-ads', 'linkedin-ads',
    'youtube-ads', 'x-ads', 'tiktok-ads', 'pinterest-ads', 'reddit-ads',
  ],
  Busca: ['all-search', 'google-organic', 'bing-organic'],
  Social: [
    'facebook-organic', 'instagram-organic', 'linkedin-organic', 'tiktok-organic',
    'x-organic', 'pinterest-organic', 'reddit-organic', 'youtube-organic',
  ],
  Outros: ['whatsapp-source', 'email-source', 'referral', 'affiliate', 'direct', 'custom'],
};

export interface FlatVariant extends ElementVariant {
  category: FunnelNodeCategory;
}

/** Every draggable element flattened — used by the quick-add search. */
export const ALL_VARIANTS: FlatVariant[] = (Object.keys(ELEMENT_LIBRARY) as FunnelNodeCategory[]).flatMap((category) =>
  ELEMENT_LIBRARY[category].map((v) => ({ ...v, category })),
);
