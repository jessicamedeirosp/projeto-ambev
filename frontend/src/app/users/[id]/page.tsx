"use client";

import { useCreateUser, useUpdateUser, useUsers } from "@/hooks/useUsers";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";

const userSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

export default function UserForm() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== "new";

  const { data: users } = useUsers();
  const user = users?.find((u) => u.id === id);

  const { mutate: createUser } = useCreateUser();
  const { mutate: updateUser } = useUpdateUser();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (user) {
      setValue("name", user.name);
      setValue("email", user.email);
    }
  }, [user, setValue]);

  const onSubmit = (data: { name: string; email: string; password: string }) => {
    if (isEditing) {
      updateUser({ id, user: data });
    } else {
      createUser(data);
    }
    router.push("/");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-6">
        <h1 className="text-2xl font-semibold text-gray-800 text-center mb-6">
          {isEditing ? "Editar Usuário" : "Criar Usuário"}
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Campo Nome */}
          <div>
            <label className="block text-gray-700 font-medium">Nome</label>
            <input
              {...register("name")}
              className="mt-1 block w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
          </div>

          {/* Campo E-mail */}
          <div>
            <label className="block text-gray-700 font-medium">E-mail</label>
            <input
              {...register("email")}
              type="email"
              className="mt-1 block w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
          </div>

          {/* Campo Senha */}
          <div>
            <label className="block text-gray-700 font-medium">Senha</label>
            <input
              {...register("password")}
              type="password"
              className="mt-1 block w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            />
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
          </div>

          {/* Botões */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition w-1/2 mr-2"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition w-1/2 cursor-pointer"
            >
              {isEditing ? "Salvar" : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
