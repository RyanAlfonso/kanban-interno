import { Todo } from "@prisma/client";
/**
 * @param projectId
 * @param view
 * @param searchParams
 * @returns
 */
const todoFetchRequest = async (
  projectId?: string | null, 
  view?: string | null,
  searchParams?: URLSearchParams
): Promise<Todo[]> => {
  console.log(`Fetching todos with projectId: ${projectId}, view: ${view}`);
  
  const hasAdvancedFilters = searchParams && (
    searchParams.get("tagIds") ||
    searchParams.get("assignedToIds") ||
    searchParams.get("startDate") ||
    searchParams.get("endDate")
  );

  if (hasAdvancedFilters) {
    const url = new URL("/api/todo/filter", window.location.origin);
    
    if (view === "mine") {
      url.searchParams.append("view", "mine");
    }
    
    if (projectId && projectId !== "all") {
      url.searchParams.append("projectId", projectId);
    }
    
    const tagIds = searchParams.get("tagIds");
    if (tagIds) {
      url.searchParams.append("tagIds", tagIds);
    }
    
    const assignedToIds = searchParams.get("assignedToIds");
    if (assignedToIds) {
      url.searchParams.append("assignedToIds", assignedToIds);
    }
    
    const startDate = searchParams.get("startDate");
    if (startDate) {
      url.searchParams.append("startDate", startDate);
    }
    
    const endDate = searchParams.get("endDate");
    if (endDate) {
      url.searchParams.append("endDate", endDate);
    }
    
    try {
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        console.error("Error fetching filtered todos:", response.status, response.statusText);
        throw new Error(`Erro ao buscar cards filtrados: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`Fetched ${data.todos?.length || 0} filtered todos`);
      return data.todos || [];
    } catch (error) {
      console.error("Error in filtered todoFetchRequest:", error);
      throw error;
    }
  }
  
  const url = new URL("/api/todo", window.location.origin);
  
  if (view === "mine") {
    url.searchParams.append("view", "mine");
  }
  
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