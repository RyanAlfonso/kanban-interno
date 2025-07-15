'use client';

import { UserForm } from '@/components/UserForm';
import { UserList } from '@/components/UserList';
import { User } from '@prisma/client';
import { useEffect, useState } from 'react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    const data = await res.json();
    setUsers(data);
  };

  const handleSubmit = async (data: any) => {
    const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
    const method = editingUser ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      fetchUsers();
      setEditingUser(null);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
  };

  const handleDelete = async (user: User) => {
    if (confirm(`Tem certeza que deseja excluir o usuário ${user.name}?`)) {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchUsers();
      }
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">Gerenciamento de Usuários</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-2">
            {editingUser ? 'Editar Usuário' : 'Adicionar Usuário'}
          </h2>
          <UserForm
            onSubmit={handleSubmit}
            initialData={editingUser}
          />
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">Lista de Usuários</h2>
          <UserList
            users={users}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}
