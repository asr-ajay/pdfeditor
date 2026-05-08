import React from 'react';
import { 
  FileStack, 
  Scissors, 
  Minimize2, 
  Replace, 
  ArrowRight,
  ShieldCheck,
  Zap,
  CloudOff,
  ScanText,
  FileEdit,
  Search
} from 'lucide-react';
import { motion } from 'motion/react';
import { ToolState } from '../types';
import { cn } from '../lib/utils';

interface DashboardProps {
  onSelectTool: (tool: ToolState) => void;
}

export default function Dashboard({ onSelectTool }: DashboardProps) {
  const tools = [
    {
      id: ToolState.MERGE,
      name: 'Merge PDF',
      description: 'Combine multiple PDF files into a single document in seconds.',
      icon: FileStack,
      color: 'bg-blue-600'
    },
    {
      id: ToolState.SPLIT,
      name: 'Split PDF',
      description: 'Extract pages from your PDF or separate them into individual files.',
      icon: Scissors,
      color: 'bg-indigo-600'
    },
    {
      id: ToolState.EXTRACT,
      name: 'Extract Page',
      description: 'Select and extract specific pages from your PDF document.',
      icon: Replace,
      color: 'bg-amber-600'
    },
    {
      id: ToolState.EDIT,
      name: 'Edit PDF',
      description: 'Add text, images, and shapes or edit existing content.',
      icon: FileEdit,
      color: 'bg-cyan-600'
    },
    {
      id: ToolState.ORGANIZE,
      name: 'Organize PDF',
      description: 'Reorder, rotate, or delete pages from your document.',
      icon: Zap,
      color: 'bg-rose-600'
    },
    {
      id: ToolState.COMPRESS,
      name: 'Compress PDF',
      description: 'Reduce file size without sacrificing quality for easier sharing.',
      icon: Minimize2,
      color: 'bg-emerald-600'
    }
  ];

  const features = [
    { icon: ShieldCheck, title: 'In-Browser Security', desc: 'Your files never leave your machine. Processing is 100% local.' },
    { icon: Search, title: 'Quick Discovery', desc: 'Press Ctrl+K to search and trigger any feature instantly.' },
    { icon: CloudOff, title: 'Private & Local', desc: 'No accounts, no tracking, just pure utility.' }
  ];

  return (
    <div className="space-y-12">
      <div className="flex flex-col items-start max-w-2xl space-y-4">
        <h1 className="text-4xl font-black tracking-tight text-white uppercase">
          PDF <span className="text-accent underline decoration-4 underline-offset-8">Editor</span>
        </h1>
        <p className="text-lg text-white/90 leading-relaxed font-medium">
          Open-source, private, and powerful PDF tools designed for professionals. 
          The ultimate workspace for your documents.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tools.map((tool, index) => (
          <motion.button
            key={tool.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onSelectTool(tool.id)}
            className="group flex flex-col items-start p-6 bg-white border border-border rounded-lg text-left transition-all hover:border-accent hover:shadow-xl hover:-translate-y-0.5"
          >
            <div className={cn("p-2.5 rounded mb-4 text-white", tool.color)}>
              <tool.icon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold mb-2 uppercase tracking-wide">{tool.name}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed flex-1">{tool.description}</p>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-accent uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
              Launch Tool <ArrowRight className="w-3 h-3" />
            </div>
          </motion.button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-10 border-t border-white/20">
        {features.map((feature, index) => (
          <div key={index} className="flex flex-col gap-3">
            <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center border border-white/20">
              <feature.icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-sm uppercase tracking-wider mb-1 text-white">{feature.title}</h4>
              <p className="text-xs text-white/70 leading-relaxed font-medium">{feature.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
