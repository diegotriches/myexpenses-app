"use client";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

interface Option {
  value: string;
  label: string;
  imgSrc?: string;
}

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
}

export default function CampoSelect({ label, value, onChange, options }: Props) {
  return (
    <div>
      <label className="text-sm font-semibold mb-1 block text-gray-700 dark:text-gray-300">
        {label}
      </label>

      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={`Selecione ${label.toLowerCase()}`} />
        </SelectTrigger>

        <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              <div className="flex items-center gap-2">
                {opt.imgSrc && (
                  <img 
                    src={opt.imgSrc} 
                    alt={opt.label} 
                    className="w-5 h-5 object-contain" 
                  />
                )}
                <span className="text-gray-900 dark:text-gray-100">
                  {opt.label}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}