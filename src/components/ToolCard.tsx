import React from 'react';
import Link from 'next/link';
import { ToolDefinition } from '@/lib/tools';
import { ArrowRight } from 'lucide-react';
import { getToolIconConfig } from '@/lib/tool-icons';

interface ToolCardProps {
  tool: ToolDefinition;
}

export function ToolCard({ tool }: ToolCardProps) {
  const iconConfig = getToolIconConfig(tool.id || tool.slug);
  const IconComponent = iconConfig.icon;

  return (
    <Link
      href={`/tools/${tool.slug}`}
      className="group relative flex flex-col gap-3 rounded-[20px] border-[1.5px] border-[#EEEDF8] bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-brand-600 hover:shadow-lift focus-visible:-translate-y-1"
    >
      <div className="flex items-start justify-between">
        <span className={`flex h-[52px] w-[52px] items-center justify-center rounded-2xl border transition-colors ${iconConfig.bgClass}`}>
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
