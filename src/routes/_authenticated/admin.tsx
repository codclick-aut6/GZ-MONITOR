import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { GoodZapSettings } from "@/components/goodzap-settings";
import { Button } from "@/components/ui/button";
import { getGoodZapSettings } from "@/lib/goodzap.functions";
import { lazy } from "react";

const settingsQuery = (userId: string) => queryOptions({ queryKey: ["goodzap-settings", userId], queryFn: () => getGoodZapSettings(), staleTime: 0 });
const LazyGoodZapError = lazy(async () => ({ default: GoodZapError }));
export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [
    { title: "GoodZap — Configurações Gerais e Sistema" },
    { name: "description", content: "Gestão de configurações do GoodZap: empresa, contatos, horários, entrega, promoções e saudações." },
    { property: "og:title", content: "GoodZap — Configurações Gerais e Sistema" },
    { property: "og:description", content: "Central de gestão administrativa do GoodZap integrada ao atendimento." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQuery(context.authUserId)),
  component: GoodZapPage,
  errorComponent: LazyGoodZapError,
  pendingComponent: () => <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">Carregando GoodZap...</div>,
});
function GoodZapPage() {
  const { queryClient, authUserId } = Route.useRouteContext();
  const options = settingsQuery(authUserId);
  const { data } = useSuspenseQuery(options);
  return <GoodZapSettings data={data} reload={async () => { await queryClient.invalidateQueries({ queryKey: options.queryKey }); await queryClient.fetchQuery(options); }} />;
}
function GoodZapError({ error }: { error: unknown }) {
  const router = useRouter();
  return <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-6"><h1 className="text-2xl font-semibold">GoodZap</h1><p role="alert" className="text-sm text-destructive">{error instanceof Error ? error.message : "Não foi possível abrir o GoodZap."}</p><div className="flex gap-2"><Button onClick={() => void router.invalidate()}>Tentar novamente</Button><Button variant="outline" asChild><Link to="/">Atendimento</Link></Button></div></main>;
}