"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserInput {
  name: string;
  email: string;
  password: string;
}

interface UserPutInput {
  name?: string;
  email?: string;
  password?: string;
}

export function useUsers() {
  return useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const { data } = await api.get("/users");
      return data;
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: UserInput) => {
      const { data } = await api.post("/users", user);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, user }: { id: string; user: UserInput }) => {
      const { data } = await api.put(`/users/${id}`, user);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}


export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
