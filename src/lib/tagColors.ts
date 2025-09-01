export const AVAILABLE_TAG_COLORS = [
  "#3B82F6", // Azul
  "#10B981", // Verde
  "#F59E0B", // Amarelo
  "#F97316", // Laranja
  "#8B5CF6", // Roxo
  "#EC4899", // Rosa
  "#06B6D4", // Ciano
  "#84CC16", // Lima
  "#6366F1", // Índigo
  "#14B8A6", // Teal
];

export const PRIORITY_TAG_COLOR = "#EF4444";

export const isValidTagColor = (color: string): boolean => {
  return AVAILABLE_TAG_COLORS.includes(color) || color === PRIORITY_TAG_COLOR;
};

