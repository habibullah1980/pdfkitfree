import React from 'react';
import Link from 'next/link';
import { ToolDefinition } from '@/lib/tools';
import { 
  FilePlus, 
  Scissors, 
  RotateCw, 
  FileImage, 
  Lock, 
  PenTool, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface ToolCardProps {
  tool: ToolDefinition;
}

export function ToolCard({ tool }: ToolCardProps) {
  const getIcon = (id: string) => {
    switch (id) {
      case 'merge-pdf':
        return <FilePlus className="h-6 w-6 text-brand-600" />;
      case 'split-pdf':
        return <Scissors className="h-6 w-6 text-brand-600" />;
      case 'rotate-pdf':
        return <RotateCw className="h-6 w-6 text-brand-600" />;
      case 'pdf-to-jpg':
        return <FileImage className="h-6 w-6 text-teal-600" />;
      case 'protect-pdf':
        return <Lock className="h-6 w-6 text-teal-600" />;
      case 'sign-pdf':
        return <PenTool className="h-6 w-6 text-brand-600" />;
      default:
        return <FilePlus className="h-6 w-6 text-brand-600" />;
    }
  };

  const href = tool.slug === 'sign-pdf' ? '/sign-pdf' : `/tools/${tool.slug}`;

  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-50 border border-slate-100 group-hover:bg-brand-50 group-hover:border-brand-100 transition-colors">
            {getIcon(tool.id)}
          </div>
          {tool.badge && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
              <Sparkles className="h-3 w-3" />
              {tool.badge}
            </span>
          )}
        </div>

        <h3 className="mt-4 text-lg font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">
          {tool.title}
        </h3>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed line-clamp-2">
          {tool.shortDescription}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          {tool.isImplemented ? 'Ready to use' : 'In development'}
        </span>
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 group-hover:text-brand-700"
          aria-label={`Open ${tool.title}`}
        >
          <span>Open Tool</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
