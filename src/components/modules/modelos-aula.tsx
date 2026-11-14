import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MODELOS_AULA, esAulaMonitoreada } from "@/lib/aulas";

/** Visual proposals stay discoverable without entering live dashboards or device registration. */
export function ModelosAula() {
  const modelos = MODELOS_AULA.filter((a) => !esAulaMonitoreada(a.codigo));
  if (modelos.length === 0) return null;
  return (
    <section
      aria-label="Modelos 3D fotográficos"
      className="flex flex-col gap-4"
    >
      <h2 className="text-lg font-semibold">Modelos 3D fotográficos</h2>
      <div className="grid gap-5 md:grid-cols-2">
        {modelos.map((a) => (
          <Card key={a.codigo}>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">{a.nombre}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <p className="font-medium">Sin telemetría conectada</p>
              <p className="text-muted-foreground">
                Proporciones estimadas de fotografías; nodos propuestos, no
                instalaciones confirmadas. Este modelo no se incluye en estados,
                aforo, alertas ni operaciones del backend.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href={`/aula/${a.codigo}`}
                  className="font-medium underline underline-offset-4"
                >
                  Ver ficha y modelo
                </Link>
                <Link
                  href={`/aula/${a.codigo}/3d`}
                  className="font-medium underline underline-offset-4"
                >
                  Abrir 3D
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
