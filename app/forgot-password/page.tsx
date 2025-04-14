import { GalleryVerticalEnd } from "lucide-react"
import { ForgotPasswordForm } from "@/components/forgot-password-form"

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/80" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
      
      <div className="absolute -top-24 -left-20 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob" />
      <div className="absolute -top-24 -right-20 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-24 left-32 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob animation-delay-4000" />

      <div className="container relative flex flex-col items-center justify-center min-h-screen py-12 mx-auto">
        <a 
          href="/" 
          className="flex items-center gap-3 mb-12 text-2xl font-semibold transition-colors hover:opacity-80"
        >
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white flex h-12 w-12 items-center justify-center rounded-xl shadow-lg">
            <GalleryVerticalEnd className="h-6 w-6" />
          </div>
          <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent text-3xl">
            TechBlitz 2025
          </span>
        </a>
        <ForgotPasswordForm />
      </div>
    </div>
  )
}