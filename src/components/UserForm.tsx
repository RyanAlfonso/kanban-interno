"use client";

import { UserType } from "@prisma/client";
import { useEffect, useState } from "react";
import { MultiSelect } from "./MultiSelect";

interface Area {
  id: string;
  name: string;
}

interface UserFormProps {
  onSubmit: (data: any) => void;
  initialData?: any;
}

export function UserForm({ onSubmit, initialData }: UserFormProps) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    type: UserType.COLABORADOR,
    areaIds: [],
    ...initialData,
  });

  useEffect(() => {
    const fetchAreas = async () => {
      const res = await fetch(process.env.NEXT_PUBLIC_BASE_PATH + "/api/projects");
      const data = await res.json();
      setAreas(data);
    };
    fetchAreas();
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAreaChange = (selected: string[]) => {
    setFormData((prev) => ({ ...prev, areaIds: selected }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Nome
        </label>
        <input
          type="text"
          name="name"
          id="name"
          value={formData.name}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
        />
      </div>
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Email
        </label>
        <input
          type="email"
          name="email"
          id="email"
          value={formData.email}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Senha
        </label>
        <input
          type="password"
          name="password"
          id="password"
          value={formData.password}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
        />
      </div>
      <div>
        <label
          htmlFor="type"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Tipo
        </label>
        <select
          name="type"
          id="type"
          value={formData.type}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
        >
          <option value={UserType.SERVIDOR}>Servidor</option>
          <option value={UserType.COLABORADOR}>Colaborador</option>
        </select>
      </div>
      <div>
        <label
          htmlFor="areas"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Áreas
        </label>
        <MultiSelect
          options={areas}
          selected={formData.areaIds}
          onChange={handleAreaChange}
        />
      </div>
      <button
        type="submit"
        className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        Salvar
      </button>
    </form>
  );
}
