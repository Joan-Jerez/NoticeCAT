"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { deleteAccount, requestReset, signIn, signUp, updatePassword, type AuthState } from "@/app/(public)/cuenta/actions";
import { Button } from "@/components/ui/button";
import { describedBy, Field, Input } from "@/components/ui/field";

const actions = { entrar: signIn, registro: signUp, recuperar: requestReset, "nueva-clave": updatePassword, borrar: deleteAccount };
export type AuthMode = keyof typeof actions;

function Submit({ children, variant }: { children: React.ReactNode; variant?: "primary" | "danger" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} className="w-full" loading={pending}>
      {children}
    </Button>
  );
}

// Un formulario para cada paso de la cuenta. Los errores llegan del servidor
// (zod); el navegador solo ayuda con required/type.
export function AuthForm({ mode, button, next }: { mode: AuthMode; button: string; next?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(actions[mode], {});
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.error || state.done) box.current?.focus();
  }, [state]);
  const err = (k: string) => state.fieldErrors?.[k];

  if (state.done) {
    return (
      <div ref={box} tabIndex={-1} role="status" className="mt-6 rounded-sm bg-success-bg px-4 py-3 text-ui text-success">
        {state.done}
      </div>
    );
  }

  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      {state.error && (
        <div ref={box} tabIndex={-1} role="alert" className="rounded-sm bg-danger-bg px-4 py-3 text-ui text-danger">
          {state.error}
        </div>
      )}
      {next && <input type="hidden" name="siguiente" value={next} />}
      {mode === "registro" && (
        <Field id="nombre" label="Nombre" error={err("name")}>
          <Input id="nombre" name="nombre" autoComplete="name" required maxLength={80} aria-invalid={!!err("name")} aria-describedby={describedBy("nombre", err("name"))} />
        </Field>
      )}
      {(mode === "entrar" || mode === "registro" || mode === "recuperar") && (
        <Field id="email" label="Correo" error={err("email")}>
          <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!err("email")} aria-describedby={describedBy("email", err("email"))} />
        </Field>
      )}
      {(mode === "entrar" || mode === "registro" || mode === "nueva-clave") && (
        <Field
          id="password"
          label={mode === "nueva-clave" ? "Contraseña nueva" : "Contraseña"}
          hint={mode === "entrar" ? undefined : "Al menos 8 caracteres, con letras y números."}
          error={err("password")}
        >
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "entrar" ? "current-password" : "new-password"}
            required
            minLength={mode === "entrar" ? undefined : 8}
            aria-invalid={!!err("password")}
            aria-describedby={describedBy("password", err("password"), mode !== "entrar")}
          />
        </Field>
      )}
      {mode === "borrar" && (
        <Field id="confirmar" label="Escribe BORRAR para confirmar" error={err("confirmar")}>
          <Input id="confirmar" name="confirmar" autoComplete="off" required aria-invalid={!!err("confirmar")} aria-describedby={describedBy("confirmar", err("confirmar"))} />
        </Field>
      )}
      <Submit variant={mode === "borrar" ? "danger" : "primary"}>{button}</Submit>
    </form>
  );
}
