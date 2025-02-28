"use client";

import { useUsers, useDeleteUser } from "@/hooks/useUsers";
import Link from "next/link";
import { Trash2, Pencil, X } from "lucide-react";
import { useState } from "react";

export default function UsersList() {
  const { data: users, isLoading } = useUsers();
  const { mutate: deleteUser } = useDeleteUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userIdToDelete, setUserIdToDelete] = useState<string | null>(null);

  const openModal = (id: string) => {
    setUserIdToDelete(id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setUserIdToDelete(null);
  };

  const confirmDelete = () => {
    if (userIdToDelete) {
      deleteUser(userIdToDelete);
    }
    closeModal();
  };

  if (isLoading) return <p className="text-center text-gray-500 mt-6">Carregando usuários...</p>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-semibold text-gray-800">Usuários</h1>
        <Link
          href="/users/new"
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition cursor-pointer"
        >
          Criar Usuário
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {users?.map((user) => (
          <div key={user.id} className="bg-white shadow-md rounded-lg p-4 flex justify-between items-center border">
            <div>
              <p className="text-lg font-medium text-gray-900">{user.name}</p>
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/users/${user.id}`}
                className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition cursor-pointer"
              >
                <Pencil size={18} />
                <span className="hidden sm:inline">Editar</span>
              </Link>
              <button
                onClick={() => openModal(user.id)}
                className="flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-600 px-3 py-2 rounded-lg transition cursor-pointer"
              >
                <Trash2 size={18} />
                <span className="hidden sm:inline">Excluir</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Confirmação */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full relative animate-fade-in">
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-semibold text-gray-900">Confirmar exclusão</h2>
            <p className="text-gray-600 mt-2">Tem certeza que deseja excluir este usuário?</p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
