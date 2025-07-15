'use client';

import { useState } from 'react';

interface Option {
  id: string;
  name: string;
}

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function MultiSelect({ options, selected, onChange }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((item) => item !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const handleRemove = (id: string) => {
    onChange(selected.filter((item) => item !== id));
  };

  return (
    <div className="relative">
      <div
        className="multi-select w-full py-2 pl-3 pr-10 text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-2">
          {selected.map((id) => {
            const option = options.find((opt) => opt.id === id);
            return (
              <div
                key={id}
                className="flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200"
              >
                <span>{option?.name}</span>
                <button
                  type="button"
                  className="text-indigo-700 hover:text-indigo-900 dark:text-indigo-200 dark:hover:text-indigo-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(id);
                  }}
                >
                  &times;
                </button>
              </div>
            );
          })}
        </div>
      </div>
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg dark:bg-gray-800">
          <ul className="max-h-60 overflow-auto rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {options.map((option) => (
              <li
                key={option.id}
                className="relative cursor-default select-none py-2 pl-3 pr-9 text-gray-900 dark:text-gray-200 hover:bg-indigo-600 hover:text-white"
                onClick={() => handleSelect(option.id)}
              >
                <span
                  className={`block truncate ${
                    selected.includes(option.id) ? 'font-semibold' : ''
                  }`}
                >
                  {option.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
