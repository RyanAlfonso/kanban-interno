// Caminho do arquivo: src/lib/validators/todo.ts

import { z } from "zod";
import { PREDEFINED_TAGS } from '@/lib/tags';

// Validador para a criação de tarefas
export const TodoCreateValidator = z.object({
  title: z.string().min(1, { message: "O título é obrigatório." }).max(100, { message: "O título não pode exceder 100 caracteres." }),
  description: z.string().max(1000, { message: "A descrição não pode exceder 1000 caracteres." }).optional().nullable(),
  columnId: z.string().min(1, { message: "O ID da coluna é obrigatório."}),
  
  // --- CORREÇÃO APLICADA AQUI ---
  // z.coerce.date() aceita a string da API e a converte para um objeto Date.
  // Como seu schema exige uma data, removemos o .nullable() e .optional() daqui.
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
});

// Validador para a edição de tarefas
export const TodoEditValidator = z.object({
  id: z.string().min(1, { message: "Formato de ID inválido." }),
  title: z.string().min(1, { message: "O título é obrigatório." }).max(100, { message: "O título não pode exceder 100 caracteres." }).optional(),
  description: z.string().max(1000, { message: "A descrição não pode exceder 1000 caracteres." }).nullable().optional(),
  columnId: z.string().min(1, { message: "O ID da coluna é obrigatório."}).optional(),

  // --- CORREÇÃO PRINCIPAL APLICADA AQUI ---
  // Usamos z.coerce.date() para converter a string recebida em um objeto Date.
  // .optional() permite que o campo não seja enviado na edição.
  // .nullable() permite que o campo seja enviado como 'null' para limpar a data.
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
});

// Validador para a exclusão de tarefas
export const TodoDeleteValidator = z.object({
  id: z.string().length(24, { message: "Formato de ID inválido." }),
});

// Exporta os tipos inferidos para uso no frontend e backend
export type TodoCreateRequest = z.infer<typeof TodoCreateValidator>;
export type TodoEditRequest = z.infer<typeof TodoEditValidator>;
export type TodoDeleteRequest = z.infer<typeof TodoDeleteValidator>;
