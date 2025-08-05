import UserAuthForm from "@/components/UserAuthForm";

export default function Login() {
  return (
    <div className="container mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[600px] bg-white dark:bg-gray-900 p-4 mt-36 rounded-3xl shadow-lg text-card-foreground">
      <div className="min-w-fit flex flex-col text-center gap-4 py-4 justify-center">
        <p className="text-2xl font-bold">DNIT</p>
        <div>
          <p className="text-sm">Bem-vindo</p>
          
          <p className="text-sm">Por favor, faça login para continuar</p>
        </div>
        <UserAuthForm />
      </div>
    </div>
  );
}

