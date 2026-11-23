"use client";

import { Trash2 } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type RevokeDeviceButtonProps = {
    deviceName: string;
    isPending: boolean;
    onConfirm: () => void;
};

export function RevokeDeviceButton({ deviceName, isPending, onConfirm }: RevokeDeviceButtonProps) {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    variant="destructive"
                    size="icon"
                    aria-label={`Zrušit spárování ${deviceName}`}
                    disabled={isPending}
                >
                    {isPending ? <Spinner /> : <Trash2 />}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Zrušit spárování „{deviceName}“?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Zařízení přijde o přístup k receptům. Znovu se spáruje jen s novým párovacím kódem.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Ponechat</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={onConfirm}>
                        Zrušit spárování
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
