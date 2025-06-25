import { Todo } from "@prisma/client";

/**
 * Função para buscar todos (cards) da API
 * @param projectId - ID do projeto para filtrar (opcional)
 * @param view - Modo de visualização ('mine' para ver apenas os próprios cards, ou undefined para todos)
 * @returns Promise com array de todos
 */
const todoFetchRequest = async (projectId?: string | null, view?: string | null): Promise<Todo[]> => {
  console.log(`Fetching todos with projectId: ${projectId}, view: ${view}`);
  
  // Construir URL com parâmetros de consulta
  const url = new URL("/api/todo", window.location.origin);
  
  // Adicionar parâmetro de visualização se especificado
  if (view === "mine") {
    url.searchParams.append("view", "mine");
  }
  
  // Adicionar parâmetro de projeto se especificado e não for "all"
  if (projectId && projectId !== "all") {
    url.searchParams.append("projectId", projectId);
  }
  
  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error("Error fetching todos:", response.status, response.statusText);
      throw new Error(`Erro ao buscar cards: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Fetched ${data.length} todos`);
    return data;
  } catch (error) {
    console.error("Error in todoFetchRequest:", error);
    throw error;
  }
};

export default todoFetchRequest;

