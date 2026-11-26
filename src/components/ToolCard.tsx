import React from 'react';
import Link from 'next/link';
import { ToolDefinition } from '@/lib/tools';
import { ArrowRight } from 'lucide-react';
import { getToolIconConfig } from '@/lib/tool-icons';

/** One soft colour per tool group, so the grid reads by category at a glance. */
const CATEGORY_TINT: Record<ToolDefinition['category'], string> = {
  organize: 'bg-[#EEEDFF] hover:bg-[#E4E2FF]',
  optimize: 'bg-[#DDF6EC] hover:bg-[#CFF2E3]',
  'convert-to': 'bg-[#FFF1CC] hover:bg-[#FFE9B3]',
  'convert-from': 'bg-[#FFE6DD] hover:bg-[#FFDACD]',
  edit: 'bg-[#F1E9FF] hover:bg-[#E8DCFF]',
  security: 'bg-[#E2E8FF] hover:bg-[#D6DFFF]',
  other: 'bg-[#E0F2FE] hover:bg-[#D0EBFD]',
};

interface ToolCardProps {
  tool: ToolDefinition;
}

export function ToolCard({ tool }: ToolCardProps) {
  const iconConfig = getToolIconConfig(tool.id || tool.slug);
  const IconComponent = iconConfig.icon;

  return (
    <Link
      href={`/tools/${tool.slug}`}
      className={`group relative flex flex-col gap-3 rounded-[22px] border-[1.5px] border-transparent p-6 transition duration-200 hover:-translate-y-1 hover:border-brand-600 hover:shadow-lift focus-visible:-translate-y-1 ${CATEGORY_TINT[tool.category] ?? 'bg-white'}`}
    >
      <div className="flex items-start justify-between">
        <span className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-white shadow-sm">
          <IconComponent
            className={`h-6 w-6 transition-transform duration-200 group-hover:scale-110 ${iconConfig.colorClass}`}
            strokeWidth={2}
            aria-hidden="true"
          />
        </span>
        {tool.badge && (
          <span className="rounded-full bg-sun-100 px-2.5 py-1 text-xs font-bold text-sun-700">{tool.badge}</span>
        )}
      </div>
      <h3 className="mt-1 text-[19px] font-bold text-ink">{tool.title}</h3>
      <p className="line-clamp-2 text-[15px] leading-relaxed text-ink-muted">{tool.shortDescription}</p>
      <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-bold text-brand-600">
        {tool.isImplemented ? 'Open tool' : 'Coming soon'}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </span>
    </Link>
  );
}
