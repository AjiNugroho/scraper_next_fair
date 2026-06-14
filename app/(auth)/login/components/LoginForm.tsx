"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, Globe2 } from "lucide-react"

import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field"

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
})

type LoginValues = z.infer<typeof loginSchema>

const NODES = [
  { x: 8,  y: 15 }, { x: 22, y: 40 }, { x: 38, y: 12 }, { x: 55, y: 28 },
  { x: 72, y: 48 }, { x: 88, y: 18 }, { x: 12, y: 68 }, { x: 45, y: 62 },
  { x: 68, y: 78 }, { x: 92, y: 65 }, { x: 30, y: 88 }, { x: 80, y: 90 },
  { x: 5,  y: 45 }, { x: 58, y: 92 }, { x: 95, y: 40 },
]

const EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 4],  [4, 5],
  [0, 6], [1, 6], [1, 7], [3, 7],  [4, 8],
  [4, 9], [5, 9], [5, 14],[6, 10], [7, 10],
  [7, 8], [8, 11],[9, 11],[10, 13],[11, 13],
  [0, 12],[12, 6],[14, 9],[3, 14],
]

// nodes that get a primary-color highlight
const ACTIVE_NODES = new Set([1, 3, 7, 9])

function BackgroundPattern() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Fine grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: [
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)",
            "linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          ].join(","),
          backgroundSize: "48px 48px",
        }}
      />

      {/* Glow blobs */}
      <div className="absolute -top-40 -left-40 w-140 h-140 rounded-full bg-primary/15 blur-[120px]" />
      <div className="absolute -bottom-40 -right-40 w-110 h-110 rounded-full bg-primary/10 blur-[100px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-75 h-75 rounded-full bg-primary/5 blur-[80px]" />

      {/* Network graph */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        {EDGES.map(([a, b], i) => (
          <line
            key={i}
            x1={NODES[a].x} y1={NODES[a].y}
            x2={NODES[b].x} y2={NODES[b].y}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="0.18"
          />
        ))}
        {NODES.map((node, i) => (
          <g key={i}>
            {/* outer halo */}
            <circle
              cx={node.x} cy={node.y} r="1.2"
              fill={ACTIVE_NODES.has(i) ? "rgba(96,165,250,0.15)" : "rgba(255,255,255,0.05)"}
            />
            {/* inner dot */}
            <circle
              cx={node.x} cy={node.y} r="0.35"
              fill={ACTIVE_NODES.has(i) ? "rgba(96,165,250,0.8)" : "rgba(255,255,255,0.35)"}
            />
          </g>
        ))}
      </svg>
    </div>
  )
}

export function LoginForm() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(values: LoginValues) {
    setIsPending(true)
    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
      callbackURL: "/",
    })

    if (error) {
      setIsPending(false)
      toast.error(error.message ?? "Invalid credentials. Please try again.")
      return
    }

    router.push("/")
    router.refresh()
  }

  return (
    <div className="min-h-screen relative bg-zinc-950 overflow-hidden">
      <BackgroundPattern />

      <div className="relative z-10 min-h-screen lg:grid lg:grid-cols-[3fr_2fr]">
        {/* ── Left: branding ── */}
        <div className="hidden lg:flex flex-col justify-between p-10 xl:p-16 text-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Globe2 className="h-4 w-4 text-primary" />
            </div>
            <span className="font-mono text-xs tracking-[0.2em] uppercase text-zinc-500">
              fair-studio
            </span>
          </div>

          <div>
            <h1 className="text-5xl xl:text-6xl font-bold tracking-tight leading-tight">
              Scraper
              <br />
              <span className="text-primary">Management</span>
              <br />
              Dashboard
            </h1>
            <p className="mt-4 text-sm text-zinc-500 max-w-xs leading-relaxed">
              Orchestrate, monitor, and scale your web scraping fleet from a single control plane.
            </p>
          </div>

          <p className="text-xs text-zinc-700">
            © {new Date().getFullYear()} fair-studio · All rights reserved
          </p>
        </div>

        {/* ── Right: form card ── */}
        <div className="flex min-h-screen lg:min-h-0 items-center justify-center p-8">
          <div className="w-full max-w-sm bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-2xl p-8 shadow-2xl shadow-black/60">
            {/* Mobile logo */}
            <div className="flex items-center gap-2.5 mb-8 lg:hidden">
              <div className="h-8 w-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Globe2 className="h-4 w-4 text-primary" />
              </div>
              <span className="font-mono text-xs tracking-[0.2em] uppercase text-zinc-500">
                fair-studio
              </span>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Welcome back</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Sign in to access your dashboard
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <FieldGroup className="gap-5">
                <Controller
                    name="email"
                    control={control}
                    render={({field,fieldState})=>(
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor={field.name}>
                                Email
                            </FieldLabel>

                            <Input
                                {...field}
                                id={field.name}
                                aria-invalid={fieldState.invalid}
                                placeholder="email"
                            />
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}

                        </Field>
                    )}
                    />

                 <Controller
                    name="password"
                    control={control}
                    render={({field,fieldState})=>(
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor={field.name}>
                                Password
                            </FieldLabel>

                            <PasswordInput
                                {...field}
                                aria-invalid={fieldState.invalid}
                                placeholder="password"
                            />
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}

                        </Field>
                    )}
                    />
              </FieldGroup>

              <Button type="submit" className="w-full mt-6" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-zinc-700 lg:hidden">
              © {new Date().getFullYear()} fair-studio · All rights reserved
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
