'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"

function toSnakeCase(strr: string) {
  return strr
    .trim()
    .toLowerCase()
    .replace(/&/g, '')         // Remove all ampersands
    .replace(/\s+/g, '_')      // Replace spaces with underscores
    .replace(/__+/g, '_')      // Replace multiple underscores with a single one
    .replace(/^_+|_+$/g, '');  // Trim leading/trailing underscores
}

export function useAuthCheck(permision: any) {
  const router = useRouter()
  const encodedPermision = toSnakeCase(permision)
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }
      else {
        console.log(session.user.id)
        console.log(permision)
        const { data }: { data: Record<string, boolean> | null } = await supabase
          .from('admin')
          .select(encodedPermision)
          .eq('id', session.user.id)
          .single();

        console.log(data);

        if (data && data[encodedPermision] === false) {
            toast.error("You don't have permission to access this page.")
            router.replace('/')
            return
        }
      }
    }

    if (typeof window !== "undefined") {
      checkAuth()
    }
  }, [router, permision])
}