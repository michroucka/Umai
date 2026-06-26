import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {ChefHat, EllipsisVertical, List, SquarePen, Trash2} from "lucide-react";
import {Card, CardAction, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {useRef, useState} from "react";
import {deleteRecipe} from "@/lib/actions/delete-recipe";
import {Recipe} from "@/lib/types";
import {
    Dialog, DialogClose, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {redirect} from "next/navigation";
import {parseHoursMinutes} from "@/lib/utils";

export function RecipeCard({ recipe }: { recipe: Recipe }) {
    const [ menuOpen, setMenuOpen ] = useState(false);
    const [ deleteOpen, setDeleteOpen ] = useState(false);
    const prepTime = recipe.prepTime ? parseHoursMinutes(recipe.prepTime) : null;

    const pressTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    function startPress() {
        pressTimer.current = setTimeout(() => setMenuOpen(true), 500);
    }
    function cancelPress() {
        clearTimeout(pressTimer.current);
    }

    return (
        <div
            className="relative group select-none cursor-pointer hover:-translate-y-0.5 transition duration-250"
            onPointerDown={startPress}
            onPointerUp={cancelPress}
            onPointerMove={cancelPress}
            onPointerCancel={cancelPress}
            onContextMenu={(e) => e.preventDefault()}
            onClick={() => redirect(`/recipes/${recipe.id}`) }
        >
            <div onClick={(e) => e.stopPropagation()}>
                <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen} >
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon-sm"
                            className="rounded-full right-1 top-1 absolute z-50 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity"
                        >
                            <EllipsisVertical className="size-4.5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                            <List />
                            Ingredience
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => redirect(`/recipes/${recipe.id}/edit`)}
                        >
                            <SquarePen />
                            Upravit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            variant="destructive"
                            onClick={() => { setMenuOpen(false); setDeleteOpen(true); }}
                        >
                            <Trash2 />
                            Smazat
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <DialogContent showCloseButton={false}>
                        <DialogHeader>
                            <DialogTitle>Smazat recept</DialogTitle>
                            <DialogDescription>
                                Opravdu chcete smazat recept &quot;{recipe.name}&quot;? Tato akce je nevratná.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="secondary">Zrušit</Button>
                            </DialogClose>
                            <Button
                                variant="destructive"
                                onClick={() => { void deleteRecipe(recipe.id); setDeleteOpen(false); }}
                            >
                                <Trash2 /> Smazat
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card
                className="relative mx-auto w-full h-full pt-0 shadow-md hover:shadow-xl transition duration-250"
            >
                {recipe.image != null ? (
                    <img
                        src={recipe.image}
                        alt="Recipe image"
                        className="aspect-video w-full object-cover"
                    />
                ) : (
                    <div className="relative z-20 w-full aspect-video bg-muted/40 flex items-center justify-center">
                        <ChefHat className="size-20 text-muted" />
                    </div>
                )}
                <CardHeader>
                    <CardTitle className="font-semibold">{recipe.name}</CardTitle>
                    {recipe.description && <CardDescription className="">{recipe.description}</CardDescription>}
                    <CardAction>
                        {prepTime && (
                            <Badge>{prepTime.hours > 0 && `${prepTime.hours} h`} {prepTime.minutes > 0 && `${prepTime.minutes} min`}</Badge>
                        )}
                    </CardAction>
                </CardHeader>
            </Card>
        </div>
    )
}