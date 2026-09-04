"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useMockAuth } from "@/hooks/use-mock-auth";

const loginSchema = z.object({
  email: z.string().min(1, "Ingresa tu correo institucional.").email("Ingresa un correo valido."),
  password: z.string().min(1, "Ingresa tu contraseña."),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useMockAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    login(email, password);
  });

  return (
    <div className="flex flex-1 items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Building2 className="size-6" />
          </div>
          <CardTitle className="text-xl">Monitoreo del Aula</CardTitle>
          <CardDescription>Panel de Operaciones UTEC — acceso de administrador</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <FieldGroup>
              <Field data-invalid={Boolean(errors.email)}>
                <FieldLabel htmlFor="email">Correo institucional</FieldLabel>
                <Input id="email" type="email" placeholder="operaciones@utec.edu.pe" autoComplete="username" {...register("email")} />
                <FieldError errors={[errors.email]} />
              </Field>
              <Field data-invalid={Boolean(errors.password)}>
                <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                <Input id="password" type="password" placeholder="••••••••" autoComplete="current-password" {...register("password")} />
                <FieldError errors={[errors.password]} />
              </Field>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Ingresando..." : "Ingresar"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Acceso de demostracion: cualquier correo y contraseña son validos.
              </p>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
