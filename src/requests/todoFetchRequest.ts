import { TodoWithRelations } from "@/types/todo"; // Use o tipo completo que definimos

/**
 * Função adaptada para buscar todos (cards) da nossa API unificada.
 * Ela constrói uma URL com todos os parâmetros de filtro e faz uma única chamada.
 * @param searchParams - Objeto URLSearchParams contendo todos os filtros da URL.
 * @returns Promise com um array de todos (com todas as relações).
 */
const todoFetchRequest = async (
projectId: string | null, view: string, searchParams: URLSearchParams): Promise<TodoWithRelations[]> => {
  
  // Cria a URL base para a nossa API unificada.
  const url = new URL(process.env.NEXT_PUBLIC_BASE_PATH + "/api/todo", window.location.origin);

  // Anexa todos os parâmetros de busca existentes diretamente à URL da API.
  // Isso inclui projectId, view, q, assignedToIds, startDate, endDate, etc.
  searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  console.log(`Buscando todos da API com a URL: ${url.toString()}`);

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro ao buscar os cards:", response.status, errorText);
      throw new Error(`Erro ao buscar cards: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    console.log(`Recebidos ${data.length || 0} cards.`);
    return data;

  } catch (error) {
    console.error("Falha na requisição todoFetchRequest:", error);
    // Re-lança o erro para que o React Query possa tratá-lo.
    throw error;
  }
};

export default todoFetchRequest;
