"use client";

import type { Device } from "@/lib/auth/devices";
import { Badge } from "@/components/ui/badge";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import { IconDevices } from "@tabler/icons-react";
import { revokePairedDevice } from "@/lib/actions/revoke-paired-device";
import { useState, useTransition } from "react";
import { RevokeDeviceButton } from "@/components/revoke-device-button";

export type DeviceListItem = Device & { lastSeenLabel: string };

type DeviceListProps = {
    devices: DeviceListItem[];
    currentDeviceId: number;
};

function DeviceRow({ device, isCurrent }: { device: DeviceListItem; isCurrent: boolean }) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string>();

    function handleRevoke(deviceId: number) {
        startTransition(async () => {
            const result = await revokePairedDevice(deviceId);
            setError(result.error);
        });
    }

    return (
        <Item variant="outline">
            <ItemContent>
                <ItemTitle>
                    <div className="flex gap-2 items-center text-base font-semibold">
                        <IconDevices />
                        {device.name}
                    </div>
                    <div className="flex gap-2">
                        {device.isAdmin && <Badge variant="secondary">Správce</Badge>}
                        {isCurrent && <Badge variant="outline">Toto zařízení</Badge>}
                    </div>
                </ItemTitle>
                <ItemDescription className="flex flex-col gap-1">
                    <span>Naposledy: {device.lastSeenLabel}</span>
                    {error && <span className="text-destructive">{error}</span>}
                </ItemDescription>
            </ItemContent>
            {!isCurrent && (
                <ItemActions>
                    <RevokeDeviceButton
                        deviceName={device.name}
                        isPending={isPending}
                        onConfirm={() => handleRevoke(device.id)}
                    />
                </ItemActions>
            )}
        </Item>
    );
}

export function DeviceList({ devices, currentDeviceId }: DeviceListProps) {
    return (
        <div className="flex w-full max-w-md flex-col gap-6">
            {devices.map((device) => (
                <DeviceRow key={device.id} device={device} isCurrent={currentDeviceId === device.id} />
            ))}
        </div>
    );
}
