"use client";

import { FC } from "react";
import { Button } from "./ui/button";

interface ColorPickerProps {
  selectedColor?: string;
  onColorChange: (color: string) => void;
}

const colors = [
  { name: "Padrão", value: "" },
  { name: "Azul", value: "blue" },
  { name: "Verde", value: "green" },
  { name: "Amarelo", value: "yellow" },
  { name: "Vermelho", value: "red" },
  { name: "Roxo", value: "purple" },
  { name: "Rosa", value: "pink" },
  { name: "Laranja", value: "orange" },
  { name: "Cinza", value: "gray" },
];

const ColorPicker: FC<ColorPickerProps> = ({ selectedColor, onColorChange }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((color) => (
        <Button
          key={color.value}
          variant={selectedColor === color.value ? "default" : "outline"}
          size="sm"
          onClick={() => onColorChange(color.value)}
          className={`w-20 h-8 ${
            color.value 
              ? `bg-${color.value}-200 hover:bg-${color.value}-300 border-${color.value}-400` 
              : "bg-white hover:bg-gray-100"
          }`}
        >
          {color.name}
        </Button>
      ))}
    </div>
  );
};

export default ColorPicker;

