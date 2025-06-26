import { z } from "zod";
// State enum might not be needed here anymore if fully replaced by columnId
// import { State } from "@/lib/types/prisma-types";

export const TodoCreateValidator = z.object({
  title: z.string().min(1, { message: "Title is required." }).max(100, { message: "Title cannot exceed 100 characters." }),
  description: z.string().max(1000, { message: "Description cannot exceed 1000 characters." }).optional(),
  // state: z.nativeEnum(State, { errorMap: () => ({ message: "Invalid state selected." }) }), // Removed state
  columnId: z.string().min(1, { message: "Column ID is required."}), // Added columnId
  deadline: z.number().int().positive().optional().nullable(),
  label: z.array(z.string().max(100, { message: "Label cannot exceed 100 characters." })).optional(),
  projectId: z.string().optional().nullable(), // projectId of the parent project
});

export const TodoEditValidator = z.object({
  id: z.string().min(1, { message: "Invalid ID format." }), // Min 1, as ObjectId length can vary if not using default
  title: z.string().min(1, { message: "Title is required." }).max(100, { message: "Title cannot exceed 100 characters." }).optional(),
  description: z.string().max(1000, { message: "Description cannot exceed 1000 characters." }).nullable().optional(),
  // state: z.nativeEnum(State, { errorMap: () => ({ message: "Invalid state selected." }) }).optional(), // Removed state
  columnId: z.string().min(1, { message: "Column ID is required."}).optional(), // Added columnId, optional for edit
  deadline: z.number().int().positive().nullable().optional(),
  label: z.array(z.string().max(100, { message: "Label cannot exceed 100 characters." })).optional(),
  order: z.number().int().min(0, { message: "Order must be a non-negative integer." }).optional(),
  projectId: z.string().optional().nullable(),
});

export const TodoDeleteValidator = z.object({
  id: z.string().length(24, { message: "Invalid ID format." }),
});

export type TodoCreateRequest = z.infer<typeof TodoCreateValidator>;
export type TodoEditRequest = z.infer<typeof TodoEditValidator>;
export type TodoDeleteRequest = z.infer<typeof TodoDeleteValidator>;

