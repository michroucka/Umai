"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";
import { pairDevice, type PairDeviceState } from "@/lib/actions/pair-device";
import { MAX_DEVICE_NAME_LENGTH } from "@/lib/auth/device-name";

const CODE_LENGTH = 8;

type PairFormProps = {
    next: string;
    suggestedName: string;
};

export function PairForm({ next, suggestedName }: PairFormProps) {
    const formRef = useRef<HTMLFormElement>(null);
    const codeInputRef = useRef<HTMLInputElement>(null);
    const [name, setName] = useState(suggestedName);
    const [code, setCode] = useState("");
    const [isCodeInvalid, setIsCodeInvalid] = useState(false);

    // Wraps the server action so a rejected code can be cleared for the next attempt;
    // the name stays, so only the mistake needs retyping.
    const [state, formAction, isPending] = useActionState(
        async (previousState: PairDeviceState, formData: FormData) => {
            const result = await pairDevice(previousState, formData);
            if (result.error) {
                setCode("");
                setIsCodeInvalid(true);
            }
            return result;
        },
        {},
    );

    // The code input is disabled while pairing, so it can only take focus back once the action has finished.
    useEffect(() => {
        if (isCodeInvalid && !isPending) {
            codeInputRef.current?.focus();
        }
    }, [isCodeInvalid, isPending]);

    function handleCodeChange(value: string) {
        setCode(value.toUpperCase());
        setIsCodeInvalid(false);
    }

    return (
        <form ref={formRef} action={formAction}>
            <FieldGroup>
                <Field>
                    <FieldLabel htmlFor="device-name">Název zařízení</FieldLabel>
                    <Input
                        id="device-name"
                        name="name"
                        required
                        maxLength={MAX_DEVICE_NAME_LENGTH}
                        disabled={isPending}
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                    />
                </Field>
                <Field>
                    <FieldLabel htmlFor="pairing-code">Párovací kód</FieldLabel>
                    <InputOTP
                        ref={codeInputRef}
                        id="pairing-code"
                        name="code"
                        required
                        maxLength={CODE_LENGTH}
                        pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                        autoComplete="one-time-code"
                        autoCapitalize="characters"
                        disabled={isPending}
                        aria-invalid={isCodeInvalid}
                        containerClassName="has-aria-invalid:animate-shake motion-reduce:animate-none"
                        value={code}
                        onChange={handleCodeChange}
                        onComplete={() => formRef.current?.requestSubmit()}
                    >
                        <InputOTPGroup>
                            {[0, 1, 2, 3].map((index) => (
                                <InputOTPSlot key={index} index={index} aria-invalid={isCodeInvalid} />
                            ))}
                        </InputOTPGroup>
                        <InputOTPSeparator />
                        <InputOTPGroup>
                            {[4, 5, 6, 7].map((index) => (
                                <InputOTPSlot key={index} index={index} aria-invalid={isCodeInvalid} />
                            ))}
                        </InputOTPGroup>
                    </InputOTP>
                    {state.error && <FieldError>{state.error}</FieldError>}
                </Field>
                <input type="hidden" name="next" value={next} />
                <Button type="submit" disabled={isPending}>
                    Spárovat
                </Button>
            </FieldGroup>
        </form>
    );
}
