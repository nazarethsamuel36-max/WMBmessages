import React, { useState, useEffect, useRef, useCallback } from 'react';

interface SplitPaneProps {
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
  defaultSplit?: number; // 0-100percentage for left pane
  minLeft?: number;
  maxLeft?: number;
  onSplitChange?: (split: number) => void;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export const SplitPane: React.FC<SplitPaneProps> = ({
  leftContent,
  rightContent,
  defaultSplit = 70,
  minLeft = 30,
  maxLeft = 90,
  onSplitChange,
  className = '',
  collapsible = false,
  defaultCollapsed = false
}) => {
  const [split, setSplit] = useState<number>(() => {
    // Load from localStorage if available
    const saved = localStorage.getItem('splitPaneRatio');
    return saved ? parseFloat(saved) : defaultSplit;
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Load collapsed state from localStorage
    const saved = localStorage.getItem('splitPaneCollapsed');
    return saved ? saved === 'true' : defaultCollapsed;
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Save split ratio to localStorage when it changes
    localStorage.setItem('splitPaneRatio', split.toString());
    onSplitChange?.(split);
  }, [split, onSplitChange]);

  useEffect(() => {
    // Save collapsed state to localStorage
    localStorage.setItem('splitPaneCollapsed', isCollapsed.toString());
  }, [isCollapsed]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newSplit = ((e.clientX - containerRect.left) / containerRect.width) * 100;

    // Clamp within min/max bounds
    const clampedSplit = Math.max(minLeft, Math.min(maxLeft, newSplit));
    setSplit(clampedSplit);
  }, [isDragging, minLeft, maxLeft]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(!isCollapsed);
  }, [isCollapsed]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div 
      ref={containerRef}
      className={`split-pane-container ${className}`}
      style={{ 
        display: 'flex',
        width: '100%',
        height: '100%',
        position: 'relative'
      }}
    >
      {/* Left Pane (Reader) */}
      <div 
        style={{ 
          width: isCollapsed ? '100%' : `${split}%`,
          minWidth: isCollapsed ? '100%' : `${minLeft}%`,
          maxWidth: isCollapsed ? '100%' : `${maxLeft}%`,
          overflow: 'auto'
        }}
      >
        {leftContent}
      </div>

      {/* Draggable Divider / Collapse Toggle */}
      {collapsible ? (
        <div
          onMouseDown={handleMouseDown}
          onClick={toggleCollapse}
          style={{
            width: '4px',
            cursor: isDragging ? 'col-resize' : 'pointer',
            backgroundColor: isDragging ? '#3b82f6' : '#e5e7eb',
            transition: isDragging ? 'none' : 'background-color 0.2s',
            flexShrink: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          className="split-pane-divider"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: '#9ca3af',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            color: 'white',
            userSelect: 'none'
          }}>
            {isCollapsed ? '›' : '‹'}
          </div>
        </div>
      ) : (
        <div
          onMouseDown={handleMouseDown}
          style={{
            width: '4px',
            cursor: isDragging ? 'col-resize' : 'col-resize',
            backgroundColor: isDragging ? '#3b82f6' : '#e5e7eb',
            transition: isDragging ? 'none' : 'background-color 0.2s',
            flexShrink: 0,
            zIndex: 10
          }}
          className="split-pane-divider"
        />
      )}

      {/* Right Pane (Message List) */}
      {!isCollapsed && (
        <div 
          style={{ 
            width: `${100 - split}%`,
            overflow: 'auto'
          }}
        >
          {rightContent}
        </div>
      )}
    </div>
  );
};
