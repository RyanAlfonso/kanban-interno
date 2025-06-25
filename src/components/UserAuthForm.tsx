"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input"; // Importar Input
import { Label } from "./ui/label"; // Importar Label
import { useToast } from "./ui/use-toast";
import { signIn } from "next-auth/react";
import { useRouter } from 'next/navigation'; // Importar useRouter

const UserAuthForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const router = useRouter(); // Inicializar router

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault(); // Prevenir recarregamento da página
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false, // Não redirecionar automaticamente, tratar manualmente
        email: email,
        password: password,
      });

      if (result?.error) {
        // Exibir erro específico retornado pelo next-auth (se houver)
        console.error("Erro de login:", result.error);
        toast({
          title: "Falha no Login",
          description: result.error === 'CredentialsSignin' ? "Credenciais inválidas. Verifique seu email e senha." : "Ocorreu um erro durante o login. Tente novamente.",
          variant: "destructive",
        });
      } else if (result?.ok) {
        // Login bem-sucedido
        toast({
          title: "Login bem-sucedido",
          description: "Redirecionando para a página principal...",
        });
        // Redirecionar para a página principal ou dashboard
        router.push('/'); // Redireciona para a raiz
        router.refresh(); // Força a atualização da página para refletir o estado de login
      } else {
        // Caso genérico de erro
        toast({
          title: "Falha no Login",
          description: "Ocorreu um erro desconhecido durante o login.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro inesperado no login:", error);
      toast({
        title: "Erro Inesperado",
        description: "Ocorreu um erro inesperado. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          placeholder="********"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>
      <Button
        type="submit"
        className="w-full"
        isLoading={isLoading}
        disabled={isLoading}
      >
        {isLoading ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
};

export default UserAuthForm;

