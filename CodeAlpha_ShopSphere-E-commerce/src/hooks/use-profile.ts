"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { api, HttpError } from "@/lib/api";
import { toast } from "sonner";
import type { UserDTO } from "@/types";

export function useProfile() {
  return useQuery<UserDTO>({
    queryKey: ["profile"],
    queryFn: () => api.get<UserDTO>("/api/users/me"),
    enabled: false, // fetched manually after auth
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const { update } = useSession();
  return useMutation({
    mutationFn: (input: { name?: string; phone?: string }) =>
      api.put<UserDTO>("/api/users/me", input),
    onSuccess: (u) => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      // Keep the JWT session name in sync.
      update?.({ name: u.name });
      toast.success("Profile updated");
    },
    onError: (e) => toast.error((e as HttpError).message || "Could not update profile"),
  });
}
