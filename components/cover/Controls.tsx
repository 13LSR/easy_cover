'use client';

import React, { useEffect, useState } from 'react';
import { useCoverStore, RATIOS, IconShape } from '@/store/useCoverStore';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ColorPicker } from '@/components/ui/color-picker';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IconPicker } from '@/components/cover/IconPicker';
import SiteStats from '@/components/cover/SiteStats';
import { Separator } from '@/components/ui/separator';
import { Check, Copy, Download, Maximize, Moon, RotateCcw, Sun } from 'lucide-react';
import { toPng } from 'html-to-image';

// Helper component for Reset Button
const ResetButton = ({ onClick, tooltip = "重置" }: { onClick: () => void, tooltip?: string }) => (
    <Button 
        variant="ghost" 
        size="icon" 
        className="h-6 w-6 ml-2" 
        onClick={onClick}
        title={tooltip}
    >
        <RotateCcw className="h-3 w-3" />
    </Button>
);

export default function Controls() {
  const store = useCoverStore();
  const [isDraggingBackground, setIsDraggingBackground] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [lastExportUrl, setLastExportUrl] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('easycover-theme');
    const nextIsDark = savedTheme ? savedTheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    const frame = window.requestAnimationFrame(() => setIsDark(nextIsDark));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('light', !isDark);
  }, [isDark]);

  const toggleTheme = () => {
    const nextIsDark = !isDark;
    setIsDark(nextIsDark);
    document.documentElement.classList.toggle('dark', nextIsDark);
    document.documentElement.classList.toggle('light', !nextIsDark);
    window.localStorage.setItem('easycover-theme', nextIsDark ? 'dark' : 'light');
  };

  const readFileAsDataUrl = (file: File, onLoad: (dataUrl: string) => void) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onLoad(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const applyBackgroundFile = (file?: File) => {
    if (!file || (!file.type.startsWith('image/') && !/\.(png|jpe?g|webp|gif|svg)$/i.test(file.name))) return;
    readFileAsDataUrl(file, (imageUrl) => {
      store.updateBackground({ type: 'image', imageUrl, imageFileName: file.name });
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    applyBackgroundFile(file);
    e.target.value = '';
  };

  const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !/\.(ttf|otf|woff2?|woff)$/i.test(file.name)) return;
    readFileAsDataUrl(file, (fontDataUrl) => {
      store.updateText({ fontFamily: 'EasyCoverCustom', fontDataUrl, fontFileName: file.name });
    });
    e.target.value = '';
  };

  const handleExport = async () => {
    const node = document.getElementById('canvas-export-target');
    if (!node) return;
    try {
      const fullWidth = Number((node as HTMLElement).dataset.canvasWidth) || node.clientWidth;
      const fullHeight = Number((node as HTMLElement).dataset.canvasHeight) || node.clientHeight;
      const fullDataUrl = await toPng(node as HTMLElement, {
        quality: 0.95,
        pixelRatio: 1,
        width: fullWidth,
        height: fullHeight,
        cacheBust: true,
        filter: (element) => !element.classList?.contains('export-exclude'),
      });
      const sourceImage = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = fullDataUrl;
      });
      const selected = RATIOS.filter((ratio) => store.selectedRatios.includes(ratio.label));
      const exportUrls: { label: string; url: string }[] = [];
      selected.forEach((ratio) => {
        const crop = document.createElement('canvas');
        crop.width = ratio.width;
        crop.height = ratio.height;
        const context = crop.getContext('2d');
        if (!context) return;
        const left = (fullWidth - ratio.width) / 2;
        const top = (fullHeight - ratio.height) / 2;
        context.drawImage(sourceImage, left, top, ratio.width, ratio.height, 0, 0, ratio.width, ratio.height);
        exportUrls.push({ label: ratio.label, url: crop.toDataURL('image/png') });
      });
      exportUrls.forEach(({ label, url }) => {
        const link = document.createElement('a');
        link.download = `easy-cover-${label.replace(':', 'x')}.png`;
        link.href = url;
        link.click();
      });
      setLastExportUrl(exportUrls[0]?.url ?? '');
      setIsCopied(false);
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  const handleCopyLink = async () => {
    if (!lastExportUrl) return;
    try {
      await navigator.clipboard.writeText(lastExportUrl);
    } catch {
      const input = document.createElement('textarea');
      input.value = lastExportUrl;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    setIsCopied(true);
    window.setTimeout(() => setIsCopied(false), 1600);
  };

  const handleFit = (mode: 'contain' | 'cover') => {
      // Always reset position and rotation
      const updates: { positionX: number; positionY: number; rotation: number; scale?: number } = { positionX: 50, positionY: 50, rotation: 0 };
      
      // We will simply reset scale to 1 and let user manually adjust if they want 'contain'.
      // But for 'cover', we try to calculate a scale that fills the canvas.
      
      if (mode === 'contain') {
          updates.scale = 1;
      } else {
          // Calculate scale to cover
          // 1. Get current canvas dimensions
          const activeRatios = RATIOS.filter((r) => store.selectedRatios.includes(r.label));
          if (activeRatios.length > 0 && store.background.imageUrl) {
               const maxWidth = Math.max(...activeRatios.map((r) => r.width));
               const maxHeight = Math.max(...activeRatios.map((r) => r.height));
               const canvasRatio = maxWidth / maxHeight;

               // 2. Get image dimensions
               const img = new Image();
               img.src = store.background.imageUrl;
               img.onload = () => {
                   const imgRatio = img.naturalWidth / img.naturalHeight;
                   
                   let newScale = 1;
                   if (imgRatio > canvasRatio) {
                       // Image is wider than canvas: Scale based on Height
                       // Contain logic makes width match canvas (if img wider? No.)
                       // Let's revisit: 
                       // In 'contain' (object-fit), img is scaled so it fits inside.
                       // If imgRatio > canvasRatio (Image is flatter):
                       //   It hits the sides first. Width = CanvasWidth. Height = Width / imgRatio.
                       //   To cover, we need Height = CanvasHeight.
                       //   Scale = CanvasHeight / CurrentHeight = CanvasHeight / (CanvasWidth / imgRatio)
                       //         = (CanvasHeight / CanvasWidth) * imgRatio = imgRatio / canvasRatio.
                       newScale = imgRatio / canvasRatio;
                   } else {
                       // Image is taller than canvas:
                       //   It hits top/bottom first. Height = CanvasHeight. Width = Height * imgRatio.
                       //   To cover, we need Width = CanvasWidth.
                       //   Scale = CanvasWidth / CurrentWidth = CanvasWidth / (CanvasHeight * imgRatio)
                       //         = (CanvasWidth / CanvasHeight) / imgRatio = canvasRatio / imgRatio.
                       newScale = canvasRatio / imgRatio;
                   }
                   
                   // Apply with a slight buffer to avoid sub-pixel gaps
                   store.updateBackground({ ...updates, scale: newScale * 1.01 });
               };
               return; // Async update
          } else {
              // Fallback
              updates.scale = 1;
          }
      }
      store.updateBackground(updates);
  };

  return (
    <div className="ef-panel order-2 flex min-h-0 w-full flex-1 flex-col border-t md:order-1 md:h-full md:w-[360px] md:flex-none md:border-r md:border-t-0">
      <div className="border-b border-border p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="ef-eyebrow">{"// EASY COVER / STUDIO"}</div>
            <h1 className="mt-1 text-xl font-bold tracking-tight md:text-2xl">封面生成器</h1>
            <p className="mt-2 max-w-[280px] text-xs leading-5 text-muted-foreground">
              封面内容和素材仅在本地浏览器处理，安全安心。做好封面记得下载，刷新页面就没了！
            </p>
          </div>
          <Button variant="outline" size="icon" className="ef-cut ef-touch shrink-0" onClick={toggleTheme} title={isDark ? '切换到冷库浅色模式' : '切换到夜班深色模式'}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
          <span className="font-mono text-muted-foreground">MODE / {isDark ? 'NIGHTSHIFT' : 'COLDSTORE'}</span>
          <span className="bg-accent px-2 py-1 font-mono font-bold text-accent-foreground">LOCAL</span>
        </div>
      </div>
      
      <div className="min-h-0 w-full flex-1">
        <ScrollArea className="h-full">
            <div className="space-y-6 p-4 md:p-5">
          
          {/* Layout Section */}
          <section className="space-y-3">
            <div className="ef-eyebrow">{"// 01 / FORMAT"}</div>
            <h3 className="text-base font-bold">画布比例</h3>
            
            <div className="space-y-2">
              <Label>图片比例</Label>
              <div className="grid grid-cols-2 gap-2">
                {RATIOS.map((r) => (
                  <div key={r.label} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`ratio-${r.label}`} 
                      checked={store.selectedRatios.includes(r.label)}
                      onCheckedChange={() => store.toggleRatio(r.label)}
                    />
                    <label htmlFor={`ratio-${r.label}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {r.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="show-ruler">显示标尺 / 网格</Label>
              <Switch 
                id="show-ruler" 
                checked={store.showRuler} 
                onCheckedChange={store.setShowRuler} 
              />
            </div>
          </section>

          <Separator />

          {/* Text Section */}
          <section className="space-y-3">
            <div className="ef-eyebrow">{"// 02 / TYPE"}</div>
            <h3 className="text-base font-bold">文字设置</h3>
            <div className="space-y-2">
              <Label>左侧文字</Label>
              <Input
                value={store.text.leftContent}
                onChange={(e) => store.updateText({ leftContent: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>右侧文字</Label>
              <Input
                value={store.text.rightContent}
                onChange={(e) => store.updateText({ rightContent: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>左右文字间距 ({store.text.gap}px)</Label>
                <ResetButton onClick={() => store.updateText({ gap: 32 })} />
              </div>
              <Slider
                value={[store.text.gap]}
                min={0}
                max={500}
                step={1}
                onValueChange={(v) => store.updateText({ gap: v[0] })}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                 <Label>大小 ({store.text.fontSize}px)</Label>
                 <ResetButton onClick={() => store.updateText({ fontSize: 160 })} />
              </div>
              <Slider 
                value={[store.text.fontSize]} 
                min={12} 
                max={2500} 
                step={1} 
                onValueChange={(v) => store.updateText({ fontSize: v[0] })} 
              />
            </div>

            <div className="flex items-center justify-between">
               <Label>颜色</Label>
               <ColorPicker color={store.text.color} onChange={(c) => store.updateText({ color: c })} />
            </div>

            <div className="space-y-2">
               <div className="flex justify-between items-center">
                   <Label>描边宽度</Label>
                   <ResetButton onClick={() => store.updateText({ strokeWidth: 0 })} />
               </div>
               <Slider 
                 value={[store.text.strokeWidth]} 
                 min={0} 
                 max={10} 
                 step={0.5} 
                 onValueChange={(v) => store.updateText({ strokeWidth: v[0] })} 
               />
            </div>

             <div className="flex items-center justify-between">
               <Label>描边颜色</Label>
               <ColorPicker color={store.text.strokeColor} onChange={(c) => store.updateText({ strokeColor: c })} />
            </div>

             <div className="space-y-2">
               <div className="flex items-center justify-between gap-2">
                 <Label>自定义字体</Label>
                 <label className="ef-cut ef-touch flex cursor-pointer items-center border border-border px-3 py-2 text-xs font-bold hover:bg-accent hover:text-accent-foreground">
                   上传字体
                   <input
                     type="file"
                     accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
                     onChange={handleFontUpload}
                     className="sr-only"
                   />
                 </label>
               </div>
               <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                 <span className="truncate">{store.text.fontDataUrl ? `已选择：${store.text.fontFileName || '自定义字体'}` : '当前使用默认字体'}</span>
                 {store.text.fontDataUrl && (
                   <Button
                     variant="ghost"
                     size="sm"
                     className="h-7 shrink-0"
                     onClick={() => store.updateText({ fontFamily: 'var(--ef-font-ui)', fontDataUrl: '', fontFileName: '' })}
                   >
                     恢复默认
                   </Button>
                 )}
               </div>
             </div>
          </section>

          <Separator />

          {/* Icon Section */}
          <section className="space-y-3">
            <div className="ef-eyebrow">{"// 03 / MARK"}</div>
            <h3 className="text-base font-bold">图标设置</h3>
            <div className="space-y-2">
              <Label>选择图标</Label>
              <IconPicker
                value={store.icon.name}
                source={store.icon.source}
                uploadedUrl={store.icon.uploadedUrl}
                onChange={(v) => store.updateIcon({ name: v, source: 'iconify', uploadedUrl: '' })}
                onUpload={(uploadedUrl) => store.updateIcon({ source: 'upload', uploadedUrl })}
              />
            </div>

            <div className="space-y-2">
               <div className="flex justify-between items-center">
                   <Label>大小 ({store.icon.size}px)</Label>
                   <ResetButton onClick={() => store.updateIcon({ size: 120 })} />
               </div>
               <Slider 
                 value={[store.icon.size]} 
                 min={20} 
                 max={2500} 
                 step={5} 
                 onValueChange={(v) => store.updateIcon({ size: v[0] })} 
               />
            </div>

            <div className="space-y-2">
               <div className="flex justify-between items-center">
                   <Label>旋转 ({store.icon.rotation}°)</Label>
                   <ResetButton onClick={() => store.updateIcon({ rotation: 0 })} />
               </div>
               <Slider 
                 value={[store.icon.rotation]} 
                 min={0} 
                 max={360} 
                 step={1} 
                 onValueChange={(v) => store.updateIcon({ rotation: v[0] })} 
               />
            </div>

            <div className="flex items-center justify-between">
               <Label>图标着色</Label>
               <ColorPicker color={store.icon.color} onChange={(c) => store.updateIcon({ color: c })} />
            </div>

             <div className="flex items-center justify-between">
              <Label htmlFor="icon-shadow">阴影</Label>
              <Switch 
                id="icon-shadow" 
                checked={store.icon.shadow} 
                onCheckedChange={(c) => store.updateIcon({ shadow: c })} 
              />
            </div>

            {store.icon.shadow && (
                <div className="ef-hatch space-y-2 border border-border p-3">
                    <div className="flex items-center justify-between">
                       <Label className="text-xs">阴影颜色</Label>
                       <ColorPicker color={store.icon.shadowColor} onChange={(c) => store.updateIcon({ shadowColor: c })} />
                    </div>
                    
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <Label className="text-xs">模糊 ({store.icon.shadowBlur}px)</Label>
                            <ResetButton onClick={() => store.updateIcon({ shadowBlur: 6 })} />
                        </div>
                        <Slider 
                            value={[store.icon.shadowBlur]} 
                            min={0} 
                            max={100} 
                            step={1} 
                            onValueChange={(v) => store.updateIcon({ shadowBlur: v[0] })} 
                        />
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <Label className="text-xs">垂直偏移 ({store.icon.shadowOffsetY}px)</Label>
                            <ResetButton onClick={() => store.updateIcon({ shadowOffsetY: 4 })} />
                        </div>
                        <Slider 
                            value={[store.icon.shadowOffsetY]} 
                            min={-50} 
                            max={50} 
                            step={1} 
                            onValueChange={(v) => store.updateIcon({ shadowOffsetY: v[0] })} 
                        />
                    </div>
                </div>
            )}

            <Separator className="my-2"/>
            
            <div className="space-y-2">
                <Label>图标容器形状</Label>
                <Select value={store.icon.bgShape} onValueChange={(v) => store.updateIcon({ bgShape: v as IconShape })}>
                    <SelectTrigger>
                        <SelectValue placeholder="容器形状" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">无</SelectItem>
                        <SelectItem value="circle">圆形</SelectItem>
                        <SelectItem value="square">方形</SelectItem>
                        <SelectItem value="rounded-square">圆角矩形</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {store.icon.bgShape !== 'none' && (
                <>
                    <div className="flex items-center justify-between">
                        <Label>容器颜色</Label>
                        <ColorPicker color={store.icon.bgColor} onChange={(c) => store.updateIcon({ bgColor: c })} />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label>内边距 ({store.icon.padding}px)</Label>
                            <ResetButton onClick={() => store.updateIcon({ padding: 40 })} />
                        </div>
                        <Slider 
                            value={[store.icon.padding]} 
                            min={0} 
                            max={100} 
                            step={5} 
                            onValueChange={(v) => store.updateIcon({ padding: v[0] })} 
                        />
                    </div>
                    {store.icon.bgShape === 'rounded-square' && (
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label>容器圆角 ({store.icon.radius}px)</Label>
                                <ResetButton onClick={() => store.updateIcon({ radius: 40 })} />
                            </div>
                            <Slider 
                                value={[store.icon.radius]} 
                                min={0} 
                                max={200} 
                                step={5} 
                                onValueChange={(v) => store.updateIcon({ radius: v[0] })} 
                            />
                        </div>
                    )}
                    
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label>容器透明度 ({(store.icon.bgOpacity * 100).toFixed(0)}%)</Label>
                            <ResetButton onClick={() => store.updateIcon({ bgOpacity: 1 })} />
                        </div>
                        <Slider 
                            value={[store.icon.bgOpacity]} 
                            min={0} 
                            max={1} 
                            step={0.01} 
                            onValueChange={(v) => store.updateIcon({ bgOpacity: v[0] })} 
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label>容器模糊 ({(store.icon.bgBlur)}px)</Label>
                            <ResetButton onClick={() => store.updateIcon({ bgBlur: 0 })} />
                        </div>
                        <Slider 
                            value={[store.icon.bgBlur]} 
                            min={0} 
                            max={50} 
                            step={1} 
                            onValueChange={(v) => store.updateIcon({ bgBlur: v[0] })} 
                        />
                    </div>
                </>
            )}
          </section>

          <Separator />

          {/* Background Section */}
          <section className="space-y-3">
            <div className="ef-eyebrow">{"// 04 / GROUND"}</div>
            <h3 className="text-base font-bold">背景设置</h3>
            
            <Tabs defaultValue={store.background.type} onValueChange={(v) => store.updateBackground({ type: v as 'solid' | 'image' })}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="solid">纯色背景</TabsTrigger>
                    <TabsTrigger value="image">图片背景</TabsTrigger>
                </TabsList>
                
                <TabsContent value="solid" className="space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                        <Label>颜色</Label>
                        <ColorPicker color={store.background.color} onChange={(c) => store.updateBackground({ color: c })} />
                    </div>
                </TabsContent>
                
                <TabsContent value="image" className="space-y-2 mt-2">
                     <div
                       className={`ef-cut border-2 border-dashed p-4 text-center transition-colors ${isDraggingBackground ? 'border-accent bg-accent/20' : 'border-border bg-muted/20'}`}
                       onDragOver={(event) => {
                         event.preventDefault();
                         setIsDraggingBackground(true);
                       }}
                       onDragLeave={() => setIsDraggingBackground(false)}
                       onDrop={(event) => {
                         event.preventDefault();
                         setIsDraggingBackground(false);
                         applyBackgroundFile(event.dataTransfer.files?.[0]);
                       }}
                     >
                       <p className="text-sm font-bold">{store.background.imageFileName ? `已选择：${store.background.imageFileName}` : '拖拽图片到这里'}</p>
                       <p className="mt-1 text-xs text-muted-foreground">或点击下方按钮选择本地图片</p>
                     <label className="ef-cut ef-touch mt-3 flex cursor-pointer items-center justify-center border border-border px-3 py-2 text-xs font-bold hover:bg-accent hover:text-accent-foreground">
                       选择图片文件
                       <input type="file" accept="image/*" onChange={handleImageUpload} className="sr-only" />
                     </label>
                     </div>
                     
                     <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label>高斯模糊 ({store.background.blur}px)</Label>
                            <ResetButton onClick={() => store.updateBackground({ blur: 0 })} />
                        </div>
                        <Slider 
                            value={[store.background.blur]} 
                            min={0} 
                            max={50} 
                            step={1} 
                            onValueChange={(v) => store.updateBackground({ blur: v[0] })} 
                        />
                    </div>
                    
                    <div className="space-y-2 pt-2 border-t">
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                            <Label className="text-xs font-semibold text-muted-foreground w-full mb-1">图片变换</Label>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 text-xs flex-1"
                                onClick={() => handleFit('contain')}
                            >
                                <Maximize className="w-3 h-3 mr-1" />
                                适应
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 text-xs flex-1"
                                onClick={() => handleFit('cover')}
                            >
                                <Maximize className="w-3 h-3 mr-1 rotate-90" />
                                铺满
                            </Button>
                        </div>
                        
                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <Label className="text-xs">缩放 ({store.background.scale.toFixed(1)}x)</Label>
                                <ResetButton onClick={() => store.updateBackground({ scale: 1 })} />
                            </div>
                            <Slider 
                                value={[store.background.scale]} 
                                min={0.1} 
                                max={10} 
                                step={0.1} 
                                onValueChange={(v) => store.updateBackground({ scale: v[0] })} 
                            />
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <Label className="text-xs">水平位置 ({store.background.positionX}%)</Label>
                                <ResetButton onClick={() => store.updateBackground({ positionX: 50 })} />
                            </div>
                            <Slider 
                                value={[store.background.positionX]} 
                                min={-500} 
                                max={500} 
                                step={1} 
                                onValueChange={(v) => store.updateBackground({ positionX: v[0] })} 
                            />
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <Label className="text-xs">垂直位置 ({store.background.positionY}%)</Label>
                                <ResetButton onClick={() => store.updateBackground({ positionY: 50 })} />
                            </div>
                            <Slider 
                                value={[store.background.positionY]} 
                                min={-500} 
                                max={500} 
                                step={1} 
                                onValueChange={(v) => store.updateBackground({ positionY: v[0] })} 
                            />
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <Label className="text-xs">旋转 ({store.background.rotation}°)</Label>
                                <ResetButton onClick={() => store.updateBackground({ rotation: 0 })} />
                            </div>
                            <Slider 
                                value={[store.background.rotation]} 
                                min={0} 
                                max={360} 
                                step={1} 
                                onValueChange={(v) => store.updateBackground({ rotation: v[0] })} 
                            />
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            <div className="flex items-center justify-between mt-2">
              <Label htmlFor="bg-shadow">背景阴影</Label>
              <Switch 
                id="bg-shadow" 
                checked={store.background.shadow} 
                onCheckedChange={(c) => store.updateBackground({ shadow: c })} 
              />
            </div>

            {store.background.shadow && (
                <div className="ef-hatch mt-2 space-y-2 border border-border p-3">
                    <div className="flex items-center justify-between">
                       <Label className="text-xs">阴影颜色</Label>
                       <ColorPicker color={store.background.shadowColor} onChange={(c) => store.updateBackground({ shadowColor: c })} />
                    </div>
                    
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <Label className="text-xs">模糊 ({store.background.shadowBlur}px)</Label>
                            <ResetButton onClick={() => store.updateBackground({ shadowBlur: 30 })} />
                        </div>
                        <Slider 
                            value={[store.background.shadowBlur]} 
                            min={0} 
                            max={200} 
                            step={1} 
                            onValueChange={(v) => store.updateBackground({ shadowBlur: v[0] })} 
                        />
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <Label className="text-xs">垂直偏移 ({store.background.shadowOffsetY}px)</Label>
                            <ResetButton onClick={() => store.updateBackground({ shadowOffsetY: 10 })} />
                        </div>
                        <Slider 
                            value={[store.background.shadowOffsetY]} 
                            min={-100} 
                            max={100} 
                            step={1} 
                            onValueChange={(v) => store.updateBackground({ shadowOffsetY: v[0] })} 
                        />
                    </div>
                </div>
            )}
          </section>

          <Separator />
          <SiteStats />
        </div>
      </ScrollArea>
      </div>

      <div className="border-t border-border bg-card p-3 md:space-y-4 md:p-4">
         <Button className="ef-cut ef-touch w-full" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            导出封面图
         </Button>
         <Button className="ef-cut ef-touch w-full" variant="outline" onClick={handleCopyLink} disabled={!lastExportUrl}>
            {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {isCopied ? '已复制图片数据链接' : '复制图片下载链接'}
         </Button>
         
      </div>
    </div>
  );
}
