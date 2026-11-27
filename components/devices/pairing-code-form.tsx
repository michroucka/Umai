"use client";

import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { createDevicePairingCode, type CreateDevicePairingCodeState } from "@/lib/actions/create-device-pairing-code";
import { useRouter } from "next/navigation";

function formatTime(date: Date) {
    return date.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
}

export function PairingCodeForm() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const router = useRouter();

    // Opens the dialog as a result of the submit instead of syncing it to the state in an effect.
    const [state, formAction, isPending] = useActionState(
        async (previousState: CreateDevicePairingCodeState, formData: FormData) => {
            const result = await createDevicePairingCode(previousState, formData);
            if (result.code) {
                setIsDialogOpen(true);
            }
            return result;
        },
        {},
    );

    function handleDialogOpenChange(open: boolean) {
        setIsDialogOpen(open);
        if (!open) {
            router.refresh();
        }
    }

    return (
        <>
            <form action={formAction}>
                <FieldGroup>
                    <Field orientation="horizontal">
                        <Checkbox id="pairing-code-is-admin" name="isAdmin" disabled={isPending} />
                        <FieldLabel htmlFor="pairing-code-is-admin">Kód pro správce</FieldLabel>
                    </Field>
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Spinner />}
                        Vytvořit párovací kód
                    </Button>
                </FieldGroup>
            </form>

            <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
                {/* Outside clicks are ignored so the code cannot be dismissed by accident before it is typed in. */}
                <DialogContent onInteractOutside={(event) => event.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            Párovací kód
                            {state.isAdmin && <Badge variant="secondary">Správce</Badge>}
                        </DialogTitle>
                        {state.expiresAt && (
                            <DialogDescription>
                                Zadej ho na novém zařízení. Platí jednou, do {formatTime(state.expiresAt)}.
                            </DialogDescription>
                        )}
                    </DialogHeader>
                    <p className="py-4 text-center font-mono text-3xl font-semibold tracking-widest">{state.code}</p>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button>Hotovo</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
