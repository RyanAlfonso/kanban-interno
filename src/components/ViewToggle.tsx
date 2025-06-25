"use client";

import { FC } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "./ui/button";
import { Eye, EyeOff } from "lucide-react";

interface ViewToggleProps {
  className?: string;
}

const ViewToggle: FC<ViewToggleProps> = ({ className }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Verificar se o modo de visualização atual é "mine" ou não
  const currentView = searchParams.get("view");
  const isMyCardsView = currentView === "mine";
  
  // Função para alternar entre "Todos os Cards" e "Meus Cards"
  const toggleView = () => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    
    if (isMyCardsView) {
      // Se estiver em "Meus Cards", remover o parâmetro para voltar para "Todos"
      params.delete("view");
    } else {
      // Se estiver em "Todos", adicionar parâmetro para ir para "Meus Cards"
      params.set("view", "mine");
    }
    
    router.push(`/?${params.toString()}`);
  };
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleView}
      className={`flex items-center gap-2 ${className}`}
      title={isMyCardsView ? "Ver todos os cards" : "Ver apenas meus cards"}
    >
      {isMyCardsView ? (
        <>
          <Eye className="h-4 w-4" />
          <span className="hidden sm:inline">Ver todos os cards</span>
        </>
      ) : (
        <>
          <EyeOff className="h-4 w-4" />
          <span className="hidden sm:inline">Ver apenas meus cards</span>
        </>
      )}
    </Button>
  );
};

export default ViewToggle;
