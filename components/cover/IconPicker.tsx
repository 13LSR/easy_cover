'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Loader2 } from 'lucide-react';

// Simple debounce implementation inside the component for simplicity if we don't want a separate file
function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface IconPickerProps {
  value: string;
  source?: 'iconify' | 'upload';
  uploadedUrl?: string;
  onChange: (value: string) => void;
  onUpload: (dataUrl: string) => void;
}

export function IconPicker({ value, source = 'iconify', uploadedUrl, onChange, onUpload }: IconPickerProps) {
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [icons, setIcons] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Default featured icons if query is empty
  const featuredIcons = [
    'logos:react', 'logos:nextjs-icon', 'logos:typescript-icon', 'logos:tailwindcss-icon',
    'logos:github-icon', 'logos:twitter', 'logos:google-icon', 'logos:apple',
    'ph:star-fill', 'ph:heart-fill', 'ph:check-circle-fill', 'ph:warning-fill',
    'mdi:home', 'mdi:account', 'mdi:cog', 'mdi:bell',
    'fluent:emoji-smile-slight-24-filled', 'fluent:weather-sunny-24-filled',
    'simple-icons:shadcnui', 'simple-icons:vercel'
  ];

  const debouncedQuery = useDebounceValue(query, 500);

  useEffect(() => {
    if (!debouncedQuery) {
        return;
    }

    const searchIcons = async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(debouncedQuery)}&limit=50`);
        const data = await res.json();
        if (data.icons) {
          const exactIcon = /^[a-z0-9-]+:[a-z0-9-]+$/i.test(debouncedQuery.trim())
            ? [debouncedQuery.trim()]
            : [];
          setIcons(Array.from(new Set([...exactIcon, ...data.icons])));
        }
      } catch (error) {
        console.error('Failed to fetch icons:', error);
      } finally {
        setLoading(false);
      }
    };

    searchIcons();
  }, [debouncedQuery]);

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || (!file.type.startsWith('image/') && !file.name.toLowerCase().endsWith('.svg'))) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onUpload(reader.result);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const displayedIcons = debouncedQuery ? icons : featuredIcons;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-left font-normal px-3">
          <div className="flex items-center gap-2 overflow-hidden">
             {source === 'upload' && uploadedUrl ? (
               <img src={uploadedUrl} alt="Uploaded icon" className="h-5 w-5 shrink-0 object-contain" />
             ) : (
               <Icon icon={value} className="w-5 h-5 flex-shrink-0" />
             )}
             <span className="truncate">{source === 'upload' ? '本地图标' : value || "选择图标..."}</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <div className="space-y-3 p-4 pb-0">
            <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="搜索图标 (如: react, home)..." 
                    className="pl-8"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>支持 Iconify 全部图标代码，例如 <code>mdi:home</code></span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 text-xs"
                onClick={() => uploadInputRef.current?.click()}
              >
                上传图标
              </Button>
              <input ref={uploadInputRef} type="file" accept="image/*,.svg" onChange={handleUpload} hidden />
            </div>
            <a
              href="https://icon-sets.iconify.design/"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-primary underline-offset-4 hover:underline"
            >
              在 Iconify 官网查找图标代码
            </a>
        </div>
        <ScrollArea className="h-[300px] p-4">
            {loading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    加载中...
                </div>
            ) : (
                <div className="grid grid-cols-5 gap-2">
                    {displayedIcons.map((iconName) => (
                        <button
                            key={iconName}
                            className={`ef-cut-bottom flex aspect-square items-center justify-center p-2 transition-colors hover:bg-accent ${value === iconName ? 'bg-accent ring-2 ring-primary' : ''}`}
                            onClick={() => {
                                onChange(iconName);
                                setOpen(false);
                            }}
                            title={iconName}
                        >
                            <Icon icon={iconName} className="w-6 h-6" />
                        </button>
                    ))}
                    {displayedIcons.length === 0 && (
                        <div className="col-span-5 text-center py-8 text-sm text-muted-foreground">
                            未找到图标
                        </div>
                    )}
                </div>
            )}
        </ScrollArea>
        <div className="p-2 border-t text-xs text-center text-muted-foreground bg-muted/50">
            Powered by Iconify
        </div>
      </PopoverContent>
    </Popover>
  );
}
