import { redirect } from "next/navigation";

/** The app's home is the project list. */
export default function RootPage() {
  redirect("/projects");
}
