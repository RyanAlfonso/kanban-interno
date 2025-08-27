import { z } from "zod";
import { PREDEFINED_TAGS } from '@/lib/tags';

const ChecklistItemValidator = z.object({
  id: z.string(),
  text: z.string().min(1, { message: "O texto do item não pode ser vazio." }),
  completed: z.boolean(),
});

export const TodoCreateValidator = z.object({
  title: z.string().min(1, { message: "O título é obrigatório." }).max(100, { message: "O título não pode exceder 100 caracteres." }),
  description: z.string().max(1000, { message: "A descrição não pode exceder 1000 caracteres." }).optional().nullable(),
  columnId: z.string().min(1, { message: "O ID da coluna é obrigatório."}),
  
  deadline: z.coerce.date({
    errorMap: () => ({ message: "Por favor, selecione uma data válida." }),
  }),
  
  label: z.array(z.string().max(100, { message: "A etiqueta não pode exceder 100 caracteres." })).optional(),
  tags: z.array(z.enum(PREDEFINED_TAGS)).optional(),
  projectId: z.string().optional().nullable(),
  order: z.number().int().min(0, { message: "A ordem deve ser um número inteiro não negativo." }).optional(),
  assignedToIds: z.array(z.string()).optional(),
  parentId: z.string().optional().nullable(),
  linkedCardIds: z.array(z.string()).optional(),
  referenceDocument: z.string().max(500, { message: "O documento de referência não pode exceder 500 caracteres." }).optional().nullable(),

  checklist: z.array(ChecklistItemValidator).optional().nullable(),
});

export const TodoEditValidator = z.object({
  id: z.string().min(1, { message: "Formato de ID inválido." }),
  title: z.string().min(1, { message: "O título é obrigatório." }).max(100, { message: "O título não pode exceder 100 caracteres." }).optional(),
  description: z.string().max(1000, { message: "A descrição não pode exceder 1000 caracteres." }).nullable().optional(),
  columnId: z.string().min(1, { message: "O ID da coluna é obrigatório."}).optional(),

  deadline: z.coerce.date().nullable().optional(),

  label: z.array(z.string().max(100, { message: "A etiqueta não pode exceder 100 caracteres." })).optional(),
  tags: z.array(z.enum(PREDEFINED_TAGS)).optional(),
  order: z.number().int().min(0, { message: "A ordem deve ser um número inteiro não negativo." }).optional(),
  projectId: z.string().optional().nullable(),
  isDeleted: z.boolean().optional(),
  assignedToIds: z.array(z.string()).optional(),
  parentId: z.string().optional().nullable(),
  linkedCardIds: z.array(z.string()).optional(),
  referenceDocument: z.string().max(500, { message: "O documento de referência não pode exceder 500 caracteres." }).optional().nullable(),

  checklist: z.array(ChecklistItemValidator).optional().nullable(),
});

export const TodoDeleteValidator = z.object({
  id: z.string().length(24, { message: "Formato de ID inválido." }),
});

export type TodoCreateRequest = z.infer<typeof TodoCreateValidator>;
export type TodoEditRequest = z.infer<typeof TodoEditValidator>;
export type TodoDeleteRequest = z.infer<typeof TodoDeleteValidator>;
