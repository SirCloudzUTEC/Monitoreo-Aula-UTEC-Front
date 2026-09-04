"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet } from "@/components/ui/field";
import type { ConfiguracionAula } from "@/domain/types";

const umbralSchema = z.object({
  aforoMaximo: z.number().int().min(1).max(200),
  temperaturaConfortMin: z.number().min(0).max(50),
  temperaturaConfortMax: z.number().min(0).max(50),
  hrConfortMin: z.number().min(0).max(100),
  hrConfortMax: z.number().min(0).max(100),
  co2AvisoPpm: z.number().min(400).max(5000),
  co2AlertaPpm: z.number().min(400).max(5000),
  pm25AlertaUgM3: z.number().min(0).max(500),
  ruidoAlertaDba: z.number().min(35).max(110),
  iluminanciaMinLux: z.number().min(0).max(10000),
  puertaAbiertaMinFueraHorarioMin: z.number().min(1).max(120),
  puertaAbiertaMinEnClaseMin: z.number().min(1).max(120),
  bateriaBajaPct: z.number().min(1).max(100),
});

type UmbralFormValues = z.infer<typeof umbralSchema>;

export function UmbralForm({
  configuracion,
  guardando,
  onGuardar,
}: {
  configuracion: ConfiguracionAula;
  guardando: boolean;
  onGuardar: (patch: Partial<ConfiguracionAula>) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<UmbralFormValues>({
    resolver: zodResolver(umbralSchema),
    // `values` mantiene el formulario sincronizado cada vez que cambia la
    // configuracion (p.ej. al cambiar de aula), sin necesidad de un efecto.
    values: { aforoMaximo: configuracion.aforoMaximo, ...configuracion.umbrales },
  });

  const onSubmit = handleSubmit(async (values) => {
    const { aforoMaximo, ...umbrales } = values;
    await onGuardar({ aforoMaximo, umbrales });
    toast.success(`Configuracion de ${configuracion.aulaId} actualizada.`);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Umbrales, aforo y sensores</CardTitle>
        <CardDescription>Estos valores controlan cuando el sistema genera avisos y alertas para {configuracion.aulaId}.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <FieldSet>
              <FieldLegend>Aforo</FieldLegend>
              <Field data-invalid={Boolean(errors.aforoMaximo)}>
                <FieldLabel htmlFor="aforoMaximo">Aforo maximo (personas)</FieldLabel>
                <Input id="aforoMaximo" type="number" {...register("aforoMaximo", { valueAsNumber: true })} />
                <FieldError errors={[errors.aforoMaximo]} />
              </Field>
            </FieldSet>

            <FieldSeparator />

            <FieldSet>
              <FieldLegend>Confort termico</FieldLegend>
              <FieldDescription>Rango de temperatura y humedad considerado confortable segun ASHRAE 55.</FieldDescription>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={Boolean(errors.temperaturaConfortMin)}>
                  <FieldLabel htmlFor="temperaturaConfortMin">Temperatura minima (°C)</FieldLabel>
                  <Input id="temperaturaConfortMin" type="number" step="0.1" {...register("temperaturaConfortMin", { valueAsNumber: true })} />
                  <FieldError errors={[errors.temperaturaConfortMin]} />
                </Field>
                <Field data-invalid={Boolean(errors.temperaturaConfortMax)}>
                  <FieldLabel htmlFor="temperaturaConfortMax">Temperatura maxima (°C)</FieldLabel>
                  <Input id="temperaturaConfortMax" type="number" step="0.1" {...register("temperaturaConfortMax", { valueAsNumber: true })} />
                  <FieldError errors={[errors.temperaturaConfortMax]} />
                </Field>
                <Field data-invalid={Boolean(errors.hrConfortMin)}>
                  <FieldLabel htmlFor="hrConfortMin">Humedad relativa minima (%)</FieldLabel>
                  <Input id="hrConfortMin" type="number" {...register("hrConfortMin", { valueAsNumber: true })} />
                  <FieldError errors={[errors.hrConfortMin]} />
                </Field>
                <Field data-invalid={Boolean(errors.hrConfortMax)}>
                  <FieldLabel htmlFor="hrConfortMax">Humedad relativa maxima (%)</FieldLabel>
                  <Input id="hrConfortMax" type="number" {...register("hrConfortMax", { valueAsNumber: true })} />
                  <FieldError errors={[errors.hrConfortMax]} />
                </Field>
              </div>
            </FieldSet>

            <FieldSeparator />

            <FieldSet>
              <FieldLegend>Calidad del aire</FieldLegend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={Boolean(errors.co2AvisoPpm)}>
                  <FieldLabel htmlFor="co2AvisoPpm">CO2 — aviso (ppm)</FieldLabel>
                  <Input id="co2AvisoPpm" type="number" {...register("co2AvisoPpm", { valueAsNumber: true })} />
                  <FieldError errors={[errors.co2AvisoPpm]} />
                </Field>
                <Field data-invalid={Boolean(errors.co2AlertaPpm)}>
                  <FieldLabel htmlFor="co2AlertaPpm">CO2 — alerta (ppm)</FieldLabel>
                  <Input id="co2AlertaPpm" type="number" {...register("co2AlertaPpm", { valueAsNumber: true })} />
                  <FieldError errors={[errors.co2AlertaPpm]} />
                </Field>
                <Field data-invalid={Boolean(errors.pm25AlertaUgM3)}>
                  <FieldLabel htmlFor="pm25AlertaUgM3">PM2.5 — alerta (µg/m³)</FieldLabel>
                  <Input id="pm25AlertaUgM3" type="number" step="0.1" {...register("pm25AlertaUgM3", { valueAsNumber: true })} />
                  <FieldError errors={[errors.pm25AlertaUgM3]} />
                </Field>
              </div>
            </FieldSet>

            <FieldSeparator />

            <FieldSet>
              <FieldLegend>Ruido e iluminacion</FieldLegend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={Boolean(errors.ruidoAlertaDba)}>
                  <FieldLabel htmlFor="ruidoAlertaDba">Ruido — alerta (dBA)</FieldLabel>
                  <Input id="ruidoAlertaDba" type="number" {...register("ruidoAlertaDba", { valueAsNumber: true })} />
                  <FieldError errors={[errors.ruidoAlertaDba]} />
                </Field>
                <Field data-invalid={Boolean(errors.iluminanciaMinLux)}>
                  <FieldLabel htmlFor="iluminanciaMinLux">Iluminancia minima en clase (lux)</FieldLabel>
                  <Input id="iluminanciaMinLux" type="number" {...register("iluminanciaMinLux", { valueAsNumber: true })} />
                  <FieldError errors={[errors.iluminanciaMinLux]} />
                </Field>
              </div>
            </FieldSet>

            <FieldSeparator />

            <FieldSet>
              <FieldLegend>Puerta y nodos</FieldLegend>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field data-invalid={Boolean(errors.puertaAbiertaMinFueraHorarioMin)}>
                  <FieldLabel htmlFor="puertaAbiertaMinFueraHorarioMin">Puerta abierta max. fuera de horario (min)</FieldLabel>
                  <Input id="puertaAbiertaMinFueraHorarioMin" type="number" {...register("puertaAbiertaMinFueraHorarioMin", { valueAsNumber: true })} />
                  <FieldError errors={[errors.puertaAbiertaMinFueraHorarioMin]} />
                </Field>
                <Field data-invalid={Boolean(errors.puertaAbiertaMinEnClaseMin)}>
                  <FieldLabel htmlFor="puertaAbiertaMinEnClaseMin">Puerta abierta max. en clase (min)</FieldLabel>
                  <Input id="puertaAbiertaMinEnClaseMin" type="number" {...register("puertaAbiertaMinEnClaseMin", { valueAsNumber: true })} />
                  <FieldError errors={[errors.puertaAbiertaMinEnClaseMin]} />
                </Field>
                <Field data-invalid={Boolean(errors.bateriaBajaPct)}>
                  <FieldLabel htmlFor="bateriaBajaPct">Bateria baja (%)</FieldLabel>
                  <Input id="bateriaBajaPct" type="number" {...register("bateriaBajaPct", { valueAsNumber: true })} />
                  <FieldError errors={[errors.bateriaBajaPct]} />
                </Field>
              </div>
            </FieldSet>

            <Button type="submit" className="w-fit gap-1.5" disabled={guardando || !isDirty}>
              <Save className="size-3.5" />
              {guardando ? "Guardando..." : "Guardar cambios"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
