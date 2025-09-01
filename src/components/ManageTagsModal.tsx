"use client";

import { useState } from "react"; // 1. Importar useState
import { Tag as TagIcon } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import TagManager from "./TagManager";

interface ManageTagsModalProps {
  projectId: string;
}

export const ManageTagsModal: React.FC<ManageTagsModalProps> = ({
  projectId,
}) => {
  // 2. Adicionar estado para controlar a abertura deste modal específico
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);

  if (!projectId) {
    return null;
  }

  return (
    // 3. Controlar o Dialog com as props 'open' e 'onOpenChange'
    <Dialog open={isTagsModalOpen} onOpenChange={setIsTagsModalOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs px-2">
          <TagIcon className="mr-1.5 h-3 w-3" />
          Gerenciar
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-md sm:max-w-lg md:max-w-xl"
        // A prop onPointerDownCapture ainda é uma boa prática, vamos mantê-la.
        onPointerDownCapture={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>Gerenciar Tags do Projeto</DialogTitle>
        </DialogHeader>
        <TagManager projectId={projectId} />
      </DialogContent>
    </Dialog>
  );
};
