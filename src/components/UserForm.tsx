'use client';

import { UserType } from '@prisma/client';
import { useEffect, useState } from 'react';

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
    name: '',
    email: '',
    password: '',
    type: UserType.COLLABORATOR,
    areaIds: [],
    ...initialData,
  });

  useEffect(() => {
    // Em um aplicativo real, você buscaria as áreas de uma API
    setAreas([
      { id: '1', name: 'Área 1' },
      { id: '2', name: 'Área 2' },
      { id: '3', name: 'Área 3' },
    ]);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAreaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { options } = e.target;
    const value: string[] = [];
    for (let i = 0, l = options.length; i < l; i++) {
      if (options[i].selected) {
        value.push(options[i].value);
      }
    }
    setFormData((prev) => ({ ...prev, areaIds: value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Nome
        </label>
        <input
          type="text"
          name="name"
          id="name"
          value={formData.name}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          type="email"
          name="email"
          id="email"
          value={formData.email}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700"
        >
          Senha
        </label>
        <input
          type="password"
          name="password"
          id="password"
          value={formData.password}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700">
          Tipo
        </label>
        <select
          name="type"
          id="type"
          value={formData.type}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <option value={UserType.SERVER}>Servidor</option>
          <option value={UserType.COLLABORATOR}>Colaborador</option>
        </select>
      </div>
      <div>
        <label htmlFor="areas" className="block text-sm font-medium text-gray-700">
          Áreas
        </label>
        <select
          multiple
          name="areaIds"
          id="areas"
          value={formData.areaIds}
          onChange={handleAreaChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </select>
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
