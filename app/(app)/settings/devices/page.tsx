import { DeviceList } from "@/components/devices/device-list";
import { PairingCodeForm } from "@/components/devices/pairing-code-form";
import { requireAdmin } from "@/lib/auth/session";
import { listDevices } from "@/lib/auth/devices";
import { formatPragueDateTime } from "@/lib/format-date";
import { PageTransition } from "@/components/layout/page-transition";

export default async function DevicesPage() {
    const currentDevice = await requireAdmin();
    const devices = (await listDevices()).map((device) => ({
        ...device,
        lastSeenLabel: formatPragueDateTime(device.lastSeenAt),
    }));

    return (
        <PageTransition>
            <h1>Spárovaná zařízení</h1>
            <DeviceList devices={devices} currentDeviceId={currentDevice.id} />
            <PairingCodeForm />
        </PageTransition>
    );
}
