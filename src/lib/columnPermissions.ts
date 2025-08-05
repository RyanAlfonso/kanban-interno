export const ALLOWED_CREATION_COLUMNS = ['BackLog'];

export function canCreateTaskInColumn(columnName: string): boolean {
  return ALLOWED_CREATION_COLUMNS.includes(columnName);
}

export function isBacklogColumn(columnName: string): boolean {
  return columnName === 'BackLog';
}
