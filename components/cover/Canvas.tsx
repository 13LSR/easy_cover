'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useCoverStore, RATIOS } from '@/store/useCoverStore';
import { Icon } from '@iconify/react';

export default function Canvas() {
  const {
    selectedRatios,
    showRuler,
    text,
    icon,
    background,
  } = useCoverStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Calculate the bounding box required for all selected ratios
  const dimensions = useMemo(() => {
    const activeRatios = RATIOS.filter((r) => selectedRatios.includes(r.label));
    if (activeRatios.length === 0) return { width: 1000, height: 1000 };

    const maxWidth = Math.max(...activeRatios.map((r) => r.width));
    const maxHeight = Math.max(...activeRatios.map((r) => r.height));

    return { width: maxWidth, height: maxHeight };
  }, [selectedRatios]);

  // Auto-scale to fit container
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const parent = containerRef.current.parentElement;
      if (!parent) return;

      const isMobile = window.innerWidth < 768;
      const padding = isMobile ? 0 : 80;
      const availableWidth = parent.clientWidth - padding;
      const availableHeight = parent.clientHeight - padding;

      const scaleX = availableWidth / dimensions.width;
      const scaleY = availableHeight / dimensions.height;
      setScale(Math.min(scaleX, scaleY) * (isMobile ? 1 : 0.9));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dimensions]);

  // Helper to convert hex to rgba
  const hexToRgba = (hex: string, alpha: number) => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex.slice(1, 3), 16);
      g = parseInt(hex.slice(3, 5), 16);
      b = parseInt(hex.slice(5, 7), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Helper to render the Icon with its container settings
  const renderIcon = () => {
      const bgColor = icon.bgShape !== 'none' 
        ? hexToRgba(icon.bgColor, icon.bgOpacity)
        : 'transparent';
      
      return (
      <div
          className="flex shrink-0 items-center justify-center"
          style={{
              transform: `rotate(${icon.rotation}deg)`,
              filter: icon.shadow ? `drop-shadow(0 ${icon.shadowOffsetY}px ${icon.shadowBlur}px ${icon.shadowColor})` : 'none',
              backgroundColor: bgColor,
              backdropFilter: icon.bgBlur > 0 ? `blur(${icon.bgBlur}px)` : 'none',
              WebkitBackdropFilter: icon.bgBlur > 0 ? `blur(${icon.bgBlur}px)` : 'none',
              padding: icon.bgShape !== 'none' ? `${icon.padding}px` : 0,
              borderRadius: icon.bgShape === 'circle' ? '50%' : icon.bgShape === 'rounded-square' ? `${icon.radius}px` : icon.bgShape === 'square' ? '0' : '0',
          }}
      >
          {icon.source === 'upload' && icon.uploadedUrl ? (
            <img
              src={icon.uploadedUrl}
              alt="Uploaded icon"
              width={icon.size}
              height={icon.size}
              className="object-contain"
            />
          ) : (
            <Icon icon={icon.name} width={icon.size} height={icon.size} color={icon.color} />
          )}
      </div>
      );
  };

  // Helper to render Text
  const renderText = (content: string) => (
      <div
          className="whitespace-pre text-center leading-tight"
          style={{
              transform: `rotate(${text.rotation}deg)`,
              fontSize: `${text.fontSize}px`,
              color: text.color,
              fontWeight: text.fontWeight,
              fontFamily: text.fontFamily,
              WebkitTextStroke: text.strokeWidth > 0 ? `${text.strokeWidth}px ${text.strokeColor}` : undefined,
          }}
      >
          {content}
      </div>
  );

  // Determine Layout Content
  const renderContent = () => {
      return (
          <div
              className="grid w-full items-center"
              style={{
                  // A zero-width middle column lets text extend beneath the centered icon.
                  gridTemplateColumns: 'minmax(0, 1fr) 0px minmax(0, 1fr)',
                  columnGap: `${text.gap}px`,
              }}
          >
              <div className="z-10 w-max justify-self-end">{renderText(text.leftContent)}</div>
              <div className="z-20 flex w-0 items-center justify-center">{renderIcon()}</div>
              <div className="z-10 w-max justify-self-start">{renderText(text.rightContent)}</div>
          </div>
      );
  };

  return (
    <div
      className="ef-grid order-1 relative h-auto w-full flex-shrink-0 overflow-hidden md:order-2 md:h-full md:min-h-0 md:min-w-0 md:flex-1"
      style={{ aspectRatio: `${dimensions.width} / ${dimensions.height}` }}
    >
      {/* Container for scaling */}
      <div
        ref={containerRef}
        style={{
          width: dimensions.width,
          height: dimensions.height,
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: 'center',
        }}
        className="transition-all duration-300"
      >
        <div 
            id="canvas-export-target" 
            className="ef-panel relative flex h-full w-full flex-col items-center justify-center overflow-hidden"
            data-canvas-width={dimensions.width}
            data-canvas-height={dimensions.height}
            style={{
                boxShadow: background.shadow ? `0 ${background.shadowOffsetY}px ${background.shadowBlur}px ${background.shadowColor}` : 'none',
            }}
        >
            {text.fontDataUrl && (
              <style>{`@font-face { font-family: "EasyCoverCustom"; src: url("${text.fontDataUrl}"); font-display: swap; }`}</style>
            )}
            {/* Background Layer */}
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: background.type === 'solid' ? background.color : 'var(--ef-panel)',
                borderRadius: `${background.radius}px`,
              }}
            >
                {background.type === 'image' && background.imageUrl && (
                    <img 
                        src={background.imageUrl}
                        alt="Background"
                        className="absolute inset-0 h-full w-full object-contain pointer-events-none"
                        style={{
                            filter: `blur(${background.blur}px)`,
                            transform: `scale(${background.scale}) translate(${background.positionX - 50}%, ${background.positionY - 50}%) rotate(${background.rotation}deg)`,
                            transformOrigin: 'center',
                        }}
                    />
                )}
            </div>

            {/* Content Layer */}
            <div className="z-10 w-full pointer-events-none">
                 {renderContent()}
            </div>

            {/* Overlays / Guides Layer */}
            {selectedRatios.map((ratioLabel) => {
                const ratio = RATIOS.find((r) => r.label === ratioLabel);
                if (!ratio) return null;
                
                // Calculate position to center it
                const left = (dimensions.width - ratio.width) / 2;
                const top = (dimensions.height - ratio.height) / 2;

                return (
                    <div
                        key={ratioLabel}
                        className="absolute border-2 border-dashed border-blue-500/50 pointer-events-none flex items-start justify-start export-exclude"
                        style={{
                            width: ratio.width,
                            height: ratio.height,
                            left: left,
                            top: top,
                            zIndex: 50
                        }}
                    >
                        <span className="bg-blue-500 text-white text-xs px-1 opacity-70">{ratioLabel}</span>
                    </div>
                );
            })}

            {/* Ruler Overlay */}
            {showRuler && (
                <div className="absolute inset-0 pointer-events-none opacity-30 z-40 export-exclude" 
                    style={{ 
                        backgroundImage: 'linear-gradient(90deg, #000 1px, transparent 1px), linear-gradient(0deg, #000 1px, transparent 1px)',
                        backgroundSize: '100px 100px'
                    }}
                />
            )}
        </div>
      </div>
    </div>
  );
}
