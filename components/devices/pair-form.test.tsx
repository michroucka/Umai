// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PairForm } from "@/components/devices/pair-form";
import { pairDevice, type PairDeviceState } from "@/lib/actions/pair-device";
import { MAX_DEVICE_NAME_LENGTH } from "@/lib/auth/device-name";

vi.mock("@/lib/actions/pair-device", () => ({ pairDevice: vi.fn() }));

// jsdom has no layout; input-otp calls elementFromPoint to detect password manager badges.
document.elementFromPoint = () => null;

const pairDeviceMock = vi.mocked(pairDevice);
const invalidCode = { error: "Kód je neplatný nebo už vypršel." };

beforeEach(() => {
    pairDeviceMock.mockReset();
    pairDeviceMock.mockResolvedValue({});
});

afterEach(cleanup);

function renderForm({ next = "/", suggestedName = "iPhone · Safari" } = {}) {
    render(<PairForm next={next} suggestedName={suggestedName} />);
}

function codeField() {
    return screen.getByLabelText<HTMLInputElement>(/kód/i);
}

function nameField() {
    return screen.getByLabelText<HTMLInputElement>(/název zařízení/i);
}

function submitButton() {
    return screen.getByRole<HTMLButtonElement>("button", { name: /spárovat/i });
}

async function typeCode(code: string) {
    await userEvent.setup().type(codeField(), code);
}

describe("PairForm fields", () => {
    it("asks for the device name first and the code last, so finishing the code can submit the form", () => {
        renderForm();
        const nameBeforeCode = nameField().compareDocumentPosition(codeField()) & Node.DOCUMENT_POSITION_FOLLOWING;
        expect(nameBeforeCode).toBeTruthy();
    });

    it("prefills the suggested device name and lets the user change it", async () => {
        renderForm({ suggestedName: "Android · Chrome" });
        expect(nameField().value).toBe("Android · Chrome");

        const user = userEvent.setup();
        await user.clear(nameField());
        await user.type(nameField(), "Pixel 8");
        expect(nameField().value).toBe("Pixel 8");
    });

    it("has a required device name field limited to the stored length", () => {
        renderForm();
        expect(nameField().required).toBe(true);
        expect(nameField().maxLength).toBe(MAX_DEVICE_NAME_LENGTH);
    });

    it("has a required code field that suits typing a one-time code on a phone", () => {
        renderForm();
        expect(codeField().required).toBe(true);
        expect(codeField().getAttribute("autocomplete")).toBe("one-time-code");
        expect(codeField().getAttribute("autocapitalize")).toBe("characters");
    });

    it("opens a keyboard with letters on a phone, because codes are not only digits", () => {
        renderForm();
        expect(codeField().getAttribute("inputmode")).toBe("text");
    });

    it("takes exactly the 8 characters of a pairing code", () => {
        renderForm();
        expect(codeField().maxLength).toBe(8);
    });

    it("skips the dash and other characters that are never part of a code", async () => {
        renderForm();
        await typeCode("K7MP-Q2X");
        expect(codeField().value).toBe("K7MPQ2X");
    });

    it("shows a code typed in lowercase in uppercase, as it appears on the admin's screen", async () => {
        renderForm();
        await typeCode("k7mpq2x");
        expect(codeField().value).toBe("K7MPQ2X");
    });
});

describe("PairForm submission", () => {
    it("submits by itself once the last character of the code is typed", async () => {
        renderForm({ next: "/recipes/7", suggestedName: "Pixel 8" });
        await typeCode("K7MPQ2XR");

        await waitFor(() => expect(pairDeviceMock).toHaveBeenCalledTimes(1));
        const formData = pairDeviceMock.mock.calls[0][1];
        expect(formData.get("code")).toBe("K7MPQ2XR");
        expect(formData.get("name")).toBe("Pixel 8");
        expect(formData.get("next")).toBe("/recipes/7");
    });

    it("does not submit an unfinished code", async () => {
        renderForm();
        await typeCode("K7MPQ2X");
        expect(pairDeviceMock).not.toHaveBeenCalled();
    });

    it("does not submit by itself while the device name is empty", async () => {
        renderForm({ suggestedName: "" });
        await typeCode("K7MPQ2XR");
        expect(pairDeviceMock).not.toHaveBeenCalled();
    });

    it("can still be submitted with the button, e.g. after filling in the name", async () => {
        renderForm({ suggestedName: "" });
        const user = userEvent.setup();
        await typeCode("K7MPQ2XR");
        await user.type(nameField(), "Pixel 8");
        await user.click(submitButton());

        await waitFor(() => expect(pairDeviceMock).toHaveBeenCalledTimes(1));
        expect(pairDeviceMock.mock.calls[0][1].get("name")).toBe("Pixel 8");
    });

    it("locks the fields and the button while pairing, so the code is not sent twice", async () => {
        let finishPairing: (state: PairDeviceState) => void = () => {};
        pairDeviceMock.mockImplementation(() => new Promise((resolve) => (finishPairing = resolve)));
        renderForm();
        await typeCode("K7MPQ2XR");

        await waitFor(() => expect(submitButton().disabled).toBe(true));
        expect(codeField().disabled).toBe(true);
        expect(nameField().disabled).toBe(true);

        finishPairing(invalidCode);
        await waitFor(() => expect(submitButton().disabled).toBe(false));
        expect(codeField().disabled).toBe(false);
    });
});

describe("PairForm after an invalid code", () => {
    beforeEach(() => {
        pairDeviceMock.mockResolvedValue(invalidCode);
    });

    it("shows no error before the first attempt", () => {
        renderForm();
        expect(screen.queryByRole("alert")).toBeNull();
        expect(codeField().getAttribute("aria-invalid")).not.toBe("true");
    });

    it("shows the error returned by pairDevice", async () => {
        renderForm();
        await typeCode("K7MPQ2XX");
        expect((await screen.findByRole("alert")).textContent).toContain("Kód je neplatný nebo už vypršel.");
    });

    it("marks the code as invalid, so it can turn red and shake", async () => {
        renderForm();
        await typeCode("K7MPQ2XX");
        await screen.findByRole("alert");
        expect(codeField().getAttribute("aria-invalid")).toBe("true");
    });

    it("clears the code for a new attempt, keeps the name and puts the cursor back in the code", async () => {
        renderForm({ suggestedName: "Pixel 8" });
        await typeCode("K7MPQ2XX");
        await screen.findByRole("alert");

        await waitFor(() => expect(codeField().value).toBe(""));
        expect(nameField().value).toBe("Pixel 8");
        expect(document.activeElement).toBe(codeField());
    });

    it("removes the invalid mark as soon as the user types a new code", async () => {
        renderForm();
        await typeCode("K7MPQ2XX");
        await screen.findByRole("alert");
        await waitFor(() => expect(codeField().value).toBe(""));

        await typeCode("K");
        expect(codeField().getAttribute("aria-invalid")).not.toBe("true");
    });

    it("submits the next complete code again", async () => {
        renderForm();
        await typeCode("K7MPQ2XX");
        await screen.findByRole("alert");
        await waitFor(() => expect(codeField().value).toBe(""));

        await typeCode("K7MPQ2XR");
        await waitFor(() => expect(pairDeviceMock).toHaveBeenCalledTimes(2));
        expect(pairDeviceMock.mock.calls[1][1].get("code")).toBe("K7MPQ2XR");
    });
});
