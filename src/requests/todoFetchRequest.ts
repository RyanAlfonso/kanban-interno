import { TodoWithRelations } from "@/types/todo";

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
    throw error;
  }
};

export default todoFetchRequest;
