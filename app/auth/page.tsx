import { AuthClient } from "./auth-client"

type AuthMode = "login" | "signup"

function getSafeRedirect(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return "/"
  }

  return value.startsWith("/") ? value : "/"
}

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const initialMode: AuthMode = params?.mode === "login" ? "login" : "signup"
  const redirectTo = getSafeRedirect(params?.redirect)

  return <AuthClient initialMode={initialMode} redirectTo={redirectTo} />
}