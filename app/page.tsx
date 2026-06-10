import { redirect } from "next/navigation"

// Root path → show landing page
export default function Home() {
  redirect("/landing")
}
