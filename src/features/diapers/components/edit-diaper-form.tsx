"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useTransition, type ReactNode } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormFooter } from "@/components/shared/form-footer";
import { SubmitButton } from "@/components/shared/submit-button";
import { updateDiaperChange } from "@/features/diapers/actions";
import { DiaperFields } from "@/features/diapers/components/diaper-fields";
import {
  diaperChangeSchemas,
  type UpdateDiaperChangeInput,
} from "@/features/diapers/schemas";
import { applyFieldErrors } from "@/lib/forms";

const FIELDS = [
  "type",
  "occurredAt",
  "stoolColor",
  "stoolConsistency",
  "notes",
] as const;

type EditDiaperFormProps = {
  timeZone: string;
  defaultValues: UpdateDiaperChangeInput;
  /** The history of the diaper's own day. */
  returnHref: string;
  /** Secondary actions in the footer, e.g. delete. */
  children?: ReactNode;
};

export function EditDiaperForm({
  timeZone,
  defaultValues,
  returnHref,
  children,
}: EditDiaperFormProps): ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const schema = useMemo(
    () => diaperChangeSchemas(timeZone).updateDiaperChangeSchema,
    [timeZone],
  );
  const form = useForm<UpdateDiaperChangeInput>({
    resolver: zodResolver(schema, undefined, { raw: true }),
    defaultValues,
  });

  function onSubmit(values: UpdateDiaperChangeInput): void {
    startTransition(async () => {
      const result = await updateDiaperChange(values);
      if (result.ok) {
        toast.success("Cambios guardados");
        router.replace(returnHref);
        return;
      }
      const { message, fieldErrors } = result.error;
      if (!applyFieldErrors(form.setError, FIELDS, fieldErrors)) {
        toast.error(message);
      }
    });
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-1 flex-col gap-6"
        noValidate
      >
        <DiaperFields timeZone={timeZone} />
        <FormFooter>
          <SubmitButton isPending={isPending} pendingLabel="Guardando…">
            Guardar cambios
          </SubmitButton>
          {children}
        </FormFooter>
      </form>
    </FormProvider>
  );
}
