import {useState, useTransition} from "react";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Textarea} from "@/components/ui/textarea";
import {FieldError} from "@/components/ui/field";
import {Loader2, Sparkles} from "lucide-react";
import {ImportedRecipe, importRecipe} from "@/lib/actions/import-recipe";

export function RecipeImportDialog({ onImport }: { onImport: (recipe: ImportedRecipe) => void }) {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [instructions, setInstructions] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleImport() {
        setError(null);
        startTransition(async () => {
            const result = await importRecipe(input, instructions);
            if (result.ok) {
                onImport(result.recipe);
                setInput("");
                setInstructions("");
                setOpen(false);
            } else {
                setError(result.error);
            }
        });
    }

    return (
        <Dialog open={open} onOpenChange={(o) => !isPending && setOpen(o)}>
            <DialogTrigger asChild>
                <Button variant="outline" type="button">
                    <Sparkles /> Importovat z webu
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Importovat recept</DialogTitle>
                    <DialogDescription>
                        Vložte odkaz na recept nebo jeho text. AI ho přeloží do češtiny a předvyplní formulář.
                    </DialogDescription>
                </DialogHeader>
                <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="https://… nebo text receptu"
                    className="max-h-64"
                    disabled={isPending}
                />
                <Textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Doplňující pokyny (nepovinné), např. přepočítej na 4 porce"
                    className="min-h-12"
                    disabled={isPending}
                />
                {error && <FieldError>{error}</FieldError>}
                <Button type="button" onClick={handleImport} disabled={isPending || !input.trim()}>
                    {isPending ? <><Loader2 className="animate-spin" /> Zpracovávám…</> : <><Sparkles /> Importovat</>}
                </Button>
            </DialogContent>
        </Dialog>
    )
}
