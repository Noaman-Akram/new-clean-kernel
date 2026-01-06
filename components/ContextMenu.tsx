import React, { useEffect, useRef } from 'react';

export interface ContextMenuItem {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    variant?: 'default' | 'danger';
}

interface ContextMenuProps {
    x: number;
    y: number;
    items: ContextMenuItem[];
    onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        // Slight delay to prevent immediate closing if the click that opened it bubbles
        setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('click', handleClickOutside);
        }, 10);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('click', handleClickOutside);
        };
    }, [onClose]);

    // Prevent spilling off screen
    const style: React.CSSProperties = {
        top: y,
        left: x,
    };

    return (
        <div
            ref={menuRef}
            className="fixed z-[100] min-w-[160px] bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100"
            style={style}
        >
            {items.map((item, index) => (
                <button
                    key={index}
                    onClick={(e) => {
                        e.stopPropagation();
                        item.onClick();
                        onClose();
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-zinc-800 transition-colors
            ${item.variant === 'danger' ? 'text-red-400 hover:text-red-300' : 'text-zinc-300 hover:text-zinc-100'}
          `}
                >
                    {item.icon && <span className="opacity-70">{item.icon}</span>}
                    {item.label}
                </button>
            ))}
        </div>
    );
};

export default ContextMenu;
