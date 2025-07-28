import { z } from "zod";
import { PREDEFINED_TAGS } from '@/lib/tags';

export const TodoCreateValidator = z.object({
  title: z.string().min(1, { message: "Title is required." }).max(100, { message: "Title cannot exceed 100 characters." }),
  description: z.string().max(1000, { message: "Description cannot exceed 1000 characters." }).optional().nullable(),
  columnId: z.string().min(1, { message: "Column ID is required."}),
  deadline: z.string().min(1, { message: "Deadline is required." }),
  label: z.array(z.string().max(100, { message: "Label cannot exceed 100 characters." })).optional(),
  tags: z.array(z.enum(PREDEFINED_TAGS)).optional(),
  projectId: z.string().optional().nullable(),
  order: z.number().int().min(0, { message: "Order must be a non-negative integer." }).optional(),
  assignedToIds: z.array(z.string()).min(1, { message: "At least one assigned user is required." }),
  parentId: z.string().optional().nullable(),
  linkedCardIds: z.array(z.string()).optional(),
});

export const TodoEditValidator = z.object({
  id: z.string().min(1, { message: "Invalid ID format." }),
  title: z.string().min(1, { message: "Title is required." }).max(100, { message: "Title cannot exceed 100 characters." }).optional(),
  description: z.string().max(1000, { message: "Description cannot exceed 1000 characters." }).nullable().optional(),
  columnId: z.string().min(1, { message: "Column ID is required."}).optional(),
  deadline: z.number().int().positive().nullable().optional(),
  label: z.array(z.string().max(100, { message: "Label cannot exceed 100 characters." })).optional(),
  tags: z.array(z.enum(PREDEFINED_TAGS)).optional(), // Added tags
  order: z.number().int().min(0, { message: "Order must be a non-negative integer." }).optional(),
  projectId: z.string().optional().nullable(),
  isDeleted: z.boolean().optional(), // Added isDeleted
  assignedToIds: z.array(z.string()).optional(), // Added assignedToIds
  parentId: z.string().optional().nullable(), // Added parentId
  linkedCardIds: z.array(z.string()).optional(), // Added linkedCardIds
});

export const TodoDeleteValidator = z.object({
  id: z.string().length(24, { message: "Invalid ID format." }),
});

export type TodoCreateRequest = z.infer<typeof TodoCreateValidator>;
export type TodoEditRequest = z.infer<typeof TodoEditValidator>;
export type TodoDeleteRequest = z.infer<typeof TodoDeleteValidator>;





