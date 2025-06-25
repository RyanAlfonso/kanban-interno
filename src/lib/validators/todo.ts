import { z } from "zod";
import { State } from "@/lib/types/prisma-types"; // Import State from the shared types file

export const TodoCreateValidator = z.object({
  title: z.string().min(1, { message: "Title is required." }).max(100, { message: "Title cannot exceed 100 characters." }),
  description: z.string().max(1000, { message: "Description cannot exceed 1000 characters." }).optional(),
  state: z.nativeEnum(State, { errorMap: () => ({ message: "Invalid state selected." }) }),
  deadline: z.number().int().positive().optional().nullable(), // Allow null
  label: z.array(z.string().max(100, { message: "Label cannot exceed 100 characters." })).optional(),
  projectId: z.string().optional().nullable(), // Add projectId
});

export const TodoEditValidator = z.object({
  id: z.string().length(24, { message: "Invalid ID format." }),
  title: z.string().min(1, { message: "Title is required." }).max(100, { message: "Title cannot exceed 100 characters." }).optional(),
  description: z.string().max(1000, { message: "Description cannot exceed 1000 characters." }).nullable().optional(),
  state: z.nativeEnum(State, { errorMap: () => ({ message: "Invalid state selected." }) }).optional(),
  deadline: z.number().int().positive().nullable().optional(),
  label: z.array(z.string().max(100, { message: "Label cannot exceed 100 characters." })).optional(),
  order: z.number().int().min(0, { message: "Order must be a non-negative integer." }).optional(),
  projectId: z.string().optional().nullable(), // Add projectId
});

export const TodoDeleteValidator = z.object({
  id: z.string().length(24, { message: "Invalid ID format." }),
});

export type TodoCreateRequest = z.infer<typeof TodoCreateValidator>;
export type TodoEditRequest = z.infer<typeof TodoEditValidator>;
export type TodoDeleteRequest = z.infer<typeof TodoDeleteValidator>;

