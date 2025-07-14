'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserType } from '@prisma/client';
import { useEffect, useState } from 'react';

const formSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório.'),
  email: z.string().email('O email não é válido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
  type: z.nativeEnum(UserType),
  areaIds: z.array(z.string()).min(1, 'Selecione pelo menos uma área.'),
});

interface Area {
  id: string;
  name: string;
}

interface UserFormProps {
  onSubmit: (data: z.infer<typeof formSchema>) => void;
  initialData?: any;
}

export function UserForm({ onSubmit, initialData }: UserFormProps) {
  const [areas, setAreas] = useState<Area[]>([]);

  useEffect(() => {
    // Em um aplicativo real, você buscaria as áreas de uma API
    setAreas([
      { id: '1', name: 'Área 1' },
      { id: '2', name: 'Área 2' },
      { id: '3', name: 'Área 3' },
    ]);
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: '',
      email: '',
      password: '',
      type: UserType.COLLABORATOR,
      areaIds: [],
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Nome do usuário" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Email do usuário" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Senha" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de usuário" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={UserType.SERVER}>Servidor</SelectItem>
                  <SelectItem value={UserType.COLLABORATOR}>
                    Colaborador
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="areaIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Áreas</FormLabel>
              <Select
                onValueChange={(value) => field.onChange([...field.value, value])}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione as áreas" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Salvar</Button>
      </form>
    </Form>
  );
}
