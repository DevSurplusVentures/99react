import GreetForm from "@/components/collection-list";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return <GreetForm />;
}
