import { PrismaClient, ProjectColumn } from "@prisma/client";
import { mockDeep, DeepMockProxy } from "jest-mock-extended";
import {
  createProjectColumn,
  getProjectColumns,
  updateProjectColumn,
  deleteProjectColumn,
  reorderProjectColumns,
  CreateProjectColumnData,
  UpdateProjectColumnData,
} from "./projectColumn.service";
import prisma from "../prismadb";

jest.mock("../prismadb", () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>(),
}));

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

describe("ProjectColumn Service", () => {
  const mockProjectColumn: ProjectColumn = {
    id: "col1",
    name: "Test Column",
    order: 0,
    projectId: "proj1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Reset all mocks before each test
    prismaMock.project.findUnique.mockReset();
    prismaMock.projectColumn.create.mockReset();
    prismaMock.projectColumn.findMany.mockReset();
    prismaMock.projectColumn.findUnique.mockReset();
    prismaMock.projectColumn.update.mockReset();
    prismaMock.projectColumn.delete.mockReset();
    (prismaMock.$transaction as jest.Mock).mockReset();
  });

  describe("createProjectColumn", () => {
    const columnData: CreateProjectColumnData = {
      name: "New Column",
      order: 1,
      projectId: "proj1",
    };

    it("should create a new project column successfully", async () => {
      prismaMock.project.findUnique.mockResolvedValueOnce({
        id: "proj1",
        name: "Test Project",
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const expectedColumn = { ...mockProjectColumn, ...columnData };
      prismaMock.projectColumn.create.mockResolvedValue(expectedColumn);

      const result = await createProjectColumn(columnData);
      expect(result).toEqual(expectedColumn);
      expect(prismaMock.project.findUnique).toHaveBeenCalledWith({
        where: { id: "proj1" },
      });
      expect(prismaMock.projectColumn.create).toHaveBeenCalledWith({
        data: columnData,
      });
    });

    it("should throw an error if project is not found", async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);
      await expect(createProjectColumn(columnData)).rejects.toThrow(
        `Project with ID ${columnData.projectId} not found.`
      );
    });

    it("should throw an error if column name already exists in the project (simulating P2002)", async () => {
      prismaMock.project.findUnique.mockResolvedValueOnce({
        id: "proj1",
        name: "Test Project",
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      // Simulate Prisma unique constraint violation
      prismaMock.projectColumn.create.mockRejectedValueOnce({
        code: "P2002",
        meta: { target: ["projectId", "name"] },
      } as any); // Type assertion for simplicity

      await expect(createProjectColumn(columnData)).rejects.toThrow(
        `A column with the name "${columnData.name}" already exists in project ${columnData.projectId}.`
      );
    });
  });

  describe("getProjectColumns", () => {
    it('should return columns for a project ordered by "order"', async () => {
      const columns = [
        { ...mockProjectColumn, id: "col1", order: 0 },
        { ...mockProjectColumn, id: "col2", order: 1 },
      ];
      prismaMock.projectColumn.findMany.mockResolvedValue(columns);

      const result = await getProjectColumns("proj1");
      expect(result).toEqual(columns);
      expect(prismaMock.projectColumn.findMany).toHaveBeenCalledWith({
        where: { projectId: "proj1" },
        orderBy: { order: "asc" },
      });
    });
  });

  describe("updateProjectColumn", () => {
    const updateData: UpdateProjectColumnData = { name: "Updated Name" };
    const columnId = "col1";

    it("should update a column successfully", async () => {
      const existingColumn = {
        ...mockProjectColumn,
        id: columnId,
        projectId: "proj1",
        name: "Old Name",
      };
      const updatedDbColumn = { ...existingColumn, ...updateData };

      prismaMock.projectColumn.findUnique.mockResolvedValueOnce(existingColumn); // For initial find
      prismaMock.projectColumn.findUnique.mockResolvedValueOnce(null); // For conflicting name check
      prismaMock.projectColumn.update.mockResolvedValue(updatedDbColumn);

      const result = await updateProjectColumn(columnId, updateData);
      expect(result).toEqual(updatedDbColumn);
      expect(prismaMock.projectColumn.findUnique).toHaveBeenCalledWith({
        where: { id: columnId },
      });
      expect(prismaMock.projectColumn.update).toHaveBeenCalledWith({
        where: { id: columnId },
        data: updateData,
      });
    });

    it("should throw error if column to update is not found", async () => {
      prismaMock.projectColumn.findUnique.mockResolvedValue(null); // For initial find
      await expect(updateProjectColumn(columnId, updateData)).rejects.toThrow(
        `ProjectColumn with ID ${columnId} not found.`
      );
    });

    it("should throw error if updated name conflicts with another column in the same project", async () => {
      const existingColumn = {
        ...mockProjectColumn,
        id: columnId,
        projectId: "proj1",
        name: "Old Name",
      };
      const conflictingColumn = {
        ...mockProjectColumn,
        id: "col2",
        projectId: "proj1",
        name: "Updated Name",
      };

      prismaMock.projectColumn.findUnique.mockResolvedValueOnce(existingColumn); // For initial find
      prismaMock.projectColumn.findUnique.mockResolvedValueOnce(
        conflictingColumn
      );

      await expect(
        updateProjectColumn(columnId, { name: "Updated Name" })
      ).rejects.toThrow(
        `A column with the name "Updated Name" already exists in project ${existingColumn.projectId}.`
      );
    });

    it("should throw error if no data provided for update", async () => {
      await expect(updateProjectColumn(columnId, {})).rejects.toThrow(
        "No data provided for update."
      );
    });
  });

  describe("deleteProjectColumn", () => {
    const columnId = "col1";
    it("should delete a column successfully", async () => {
      const existingColumn = { ...mockProjectColumn, id: columnId };
      prismaMock.projectColumn.findUnique.mockResolvedValue(existingColumn);
      prismaMock.projectColumn.delete.mockResolvedValue(existingColumn);

      const result = await deleteProjectColumn(columnId);
      expect(result).toEqual(existingColumn);
      expect(prismaMock.projectColumn.findUnique).toHaveBeenCalledWith({
        where: { id: columnId },
      });
      expect(prismaMock.projectColumn.delete).toHaveBeenCalledWith({
        where: { id: columnId },
      });
    });

    it("should throw error if column to delete is not found", async () => {
      prismaMock.projectColumn.findUnique.mockResolvedValue(null);
      await expect(deleteProjectColumn(columnId)).rejects.toThrow(
        `ProjectColumn with ID ${columnId} not found.`
      );
    });
  });

  describe("reorderProjectColumns", () => {
    const projectId = "proj1";
    const orderedIds = ["col1", "col2"];
    const columnsInDb = [
      { ...mockProjectColumn, id: "col2", order: 0, projectId },
      { ...mockProjectColumn, id: "col1", order: 1, projectId },
    ];
    const reorderedColumnsMock = [
      { ...mockProjectColumn, id: "col1", order: 0, projectId },
      { ...mockProjectColumn, id: "col2", order: 1, projectId },
    ];

    it("should reorder columns successfully", async () => {
      prismaMock.projectColumn.findMany
        .mockResolvedValueOnce(
          columnsInDb.map((c) => ({ id: c.id, order: c.order }))
        )
        .mockResolvedValueOnce(reorderedColumnsMock); // For final return

      (prismaMock.$transaction as jest.Mock).mockImplementation(
        async (promises) => {
          return Promise.all(promises.map((p: any) => p));
        }
      );

      prismaMock.projectColumn.update.mockImplementation(async (args: any) => {
        const id = args.where.id;
        const order = args.data.order;
        return { ...mockProjectColumn, id, order, projectId };
      });

      const result = await reorderProjectColumns(projectId, orderedIds);

      expect(prismaMock.projectColumn.findMany).toHaveBeenCalledWith({
        where: { projectId: projectId },
        select: { id: true, order: true },
      });
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(prismaMock.projectColumn.update).toHaveBeenCalledWith({
        where: { id: "col1" },
        data: { order: 0 },
      });
      expect(prismaMock.projectColumn.update).toHaveBeenCalledWith({
        where: { id: "col2" },
        data: { order: 1 },
      });

      expect(result).toEqual(reorderedColumnsMock);
      expect(prismaMock.projectColumn.findMany).toHaveBeenLastCalledWith({
        where: { projectId: projectId },
        orderBy: { order: "asc" },
      });
    });

    it("should throw error if column IDs are invalid or counts mismatch", async () => {
      prismaMock.projectColumn.findMany.mockResolvedValueOnce(
        columnsInDb.map((c) => ({ id: c.id, order: c.order }))
      );

      await expect(
        reorderProjectColumns(projectId, ["col1", "col3"])
      ).rejects.toThrow(
        "Invalid column IDs provided or mismatch in column count for the project."
      );
    });

    it("should throw error if transaction fails", async () => {
      prismaMock.projectColumn.findMany.mockResolvedValueOnce(
        columnsInDb.map((c) => ({ id: c.id, order: c.order }))
      );

      (prismaMock.$transaction as jest.Mock).mockRejectedValueOnce(
        new Error("Transaction failed")
      );

      await expect(
        reorderProjectColumns(projectId, orderedIds)
      ).rejects.toThrow("Failed to reorder columns. Please try again.");
    });
  });
});
