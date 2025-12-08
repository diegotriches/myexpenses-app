"use client";

import { iconOptions } from "@/utils/iconOptions";

interface IconSelectorProps {
  selectedIcon: string;
  onSelect: (iconName: string) => void;
}

export default function IconSelector({ selectedIcon, onSelect }: IconSelectorProps) {
  return (
    <div className="grid grid-cols-6 gap-3 p-3 max-h-64 overflow-y-auto">
      {iconOptions.map((icon) => {
        const IconComp = icon.component;

        return (
          <button
            key={icon.name}
            onClick={() => onSelect(icon.name)}
            className={`p-2 border rounded-lg flex items-center justify-center transition ${
              selectedIcon === icon.name
                ? "border-blue-600 bg-blue-100"
                : "border-gray-300 hover:bg-gray-100"
            }`}
          >
            <IconComp size={22} />
          </button>
        );
      })}
    </div>
  );
}