// components/Checklist.tsx
"use client";

import { FC, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Trash2, Plus, Check, Pencil, X } from "lucide-react";
import CustomizedCheckBox from "./CustomizedCheckBox";

export type ChecklistItemType = {
  id: string;
  text: string;
  completed: boolean;
};

type ChecklistProps = {
  items: ChecklistItemType[];
  onChange: (items: ChecklistItemType[]) => void;
};

const Checklist: FC<ChecklistProps> = ({ items, onChange }) => {
  const [newItemText, setNewItemText] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState("");

  const handleAddItem = () => {
    if (newItemText.trim()) {
      const newItem: ChecklistItemType = {
        id: `temp-${Date.now()}`,
        text: newItemText.trim(),
        completed: false,
      };
      onChange([...items, newItem]);
      setNewItemText("");
    }
  };

  const handleRemoveItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const handleToggleItem = (id: string, newCompletedState: boolean) => {
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, completed: newCompletedState } : item
      )
    );
  };

  const handleStartEditing = (item: ChecklistItemType) => {
    setEditingItemId(item.id);
    setEditingItemText(item.text);
  };

  const handleCancelEditing = () => {
    setEditingItemId(null);
    setEditingItemText("");
  };

  const handleSaveEditing = (id: string) => {
    if (editingItemText.trim()) {
      onChange(
        items.map((item) =>
          item.id === id ? { ...item, text: editingItemText.trim() } : item
        )
      );
      handleCancelEditing();
    }
  };

  const completedCount = items.filter((item) => item.completed).length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  return (
    <div className="relative grid gap-2 pt-4">
      <Label className="text-sm font-medium">
        Checklist ({completedCount}/{items.length})
      </Label>
      {items.length > 0 && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
      <div className="flex flex-col gap-2 max-h-60 overflow-y-auto p-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <CustomizedCheckBox
              check={item.completed}
              onChange={(currentCheckState) => {
                handleToggleItem(item.id, !currentCheckState);
              }}
            />
            {editingItemId === item.id ? (
              <>
                <Input
                  value={editingItemText}
                  onChange={(e) => setEditingItemText(e.target.value)}
                  className="h-8 flex-grow"
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveEditing(item.id)}
                />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSaveEditing(item.id)}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelEditing}>
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <span
                  className={`flex-grow text-sm cursor-pointer ${
                    item.completed ? "line-through text-gray-500" : ""
                  }`}
                  onClick={() => handleToggleItem(item.id, !item.completed)}
                >
                  {item.text}
                </span>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleStartEditing(item)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-red-500 hover:text-red-600"
                  onClick={() => handleRemoveItem(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-2">
        <Input
          placeholder="Adicionar novo item..."
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddItem();
            }
          }}
        />
        <Button type="button" size="icon" onClick={handleAddItem} disabled={!newItemText.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default Checklist;
