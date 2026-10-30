import { redirect } from "next/navigation";
import { isAuthenticated } from "../lib/auth";
import StudyClient from "../components/StudyClient";

export default async function Home() {
  if (!(await isAuthenticated())) redirect("/login");
  return <main><StudyClient /></main>;
}
