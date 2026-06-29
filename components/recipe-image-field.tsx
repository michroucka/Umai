import {Field, FieldError, FieldLabel} from "@/components/ui/field";
import {Control, Controller, UseFormGetValues, UseFormSetValue, useFormState, useWatch} from "react-hook-form";
import { ButtonGroup } from "./ui/button-group";
import {Button} from "@/components/ui/button";
import {ChefHat, Search, Upload, X} from "lucide-react";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {searchImages} from "@/lib/actions/search-images";
import {useEffect, useMemo, useRef, useState} from "react";
import {RecipeFormValues} from "@/components/recipe-form";


export function RecipeImageField({ control, setValue, getValues }: {
    control: Control<RecipeFormValues>;
    setValue: UseFormSetValue<RecipeFormValues>;
    getValues: UseFormGetValues<RecipeFormValues>;
}) {
    const [searchResults, setSearchResults] = useState<{ id: number; src: { medium: string }}[]>([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imgWatch = useWatch({ control: control, name: "image" });
    const { errors } = useFormState({ control, name: "image" });

    const objectUrl = useMemo(() => {
        return imgWatch instanceof File ? URL.createObjectURL(imgWatch) : null;
    }, [imgWatch]);

    const previewUrl = objectUrl ?? (typeof imgWatch === "string" ? imgWatch : null);

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);
    return (
        <div className="flex flex-col gap-4">
            <Field data-invalid={!!errors.image}>
                <FieldLabel htmlFor="image">Obrázek</FieldLabel>
                <Controller
                    name="image"
                    control={control}
                    render={({ field: { onChange, ref, name, onBlur } }) => (
                        <input type="file"
                               name={name}
                               onBlur={onBlur}
                               ref={(e) => {
                                   ref(e)
                                   fileInputRef.current = e
                               }}
                               className="hidden"
                               onChange={(e) => {
                                   const file = e.target.files?.[0];
                                   if (file) onChange(file);
                               }}
                        />
                    )}
                />
                <ButtonGroup id="image">
                    <Button type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload /> Nahrát obrázek
                    </Button>
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline"
                                    size="sm"
                                    type="button"
                                    onClick={async () => {
                                        const query = getValues("name");
                                        setSearchQuery(query);
                                        if (query !== "") {
                                            const results = await searchImages(query);
                                            setSearchResults(results);
                                        }
                                        setDialogOpen(true);
                                    }}
                            >
                                <Search /> Hledat online
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Hledat obrázek</DialogTitle>
                            </DialogHeader>
                            <div className="flex gap-2">
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <Button
                                    type="button"
                                    onClick={async () => {
                                        const results = await searchImages(searchQuery);
                                        setSearchResults(results);
                                    }}
                                >
                                    <Search /> Hledat
                                </Button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {searchResults.map((photo) => (
                                    <button
                                        key={photo.id}
                                        type="button"
                                        onClick={() => {
                                            setValue("image", photo.src.medium);
                                            setDialogOpen(false);
                                        }}
                                        className="overflow-hidden rounded-md border hover:ring-2 hover:ring-primary transition"
                                    >
                                        <img
                                            src={photo.src.medium}
                                            alt=""
                                            className="aspect-square w-full object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        </DialogContent>
                    </Dialog>
                </ButtonGroup>
                {errors.image && <FieldError errors={[errors.image]} />}
            </Field>
            <div
                className="relative w-44 aspect-video rounded-md bg-muted/40 flex items-center justify-center overflow-hidden border hover:ring-2 hover:ring-primary transition cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
            >
                {previewUrl != null ? (
                    <>
                        <Button
                            type="button"
                            className="absolute right-1 top-1 rounded-full bg-destructive hover:bg-destructive/75"
                            size="icon-xs"
                            onClick={(e) => {
                                e.stopPropagation();
                                setValue("image", undefined);
                            }}
                        >
                            <X />
                        </Button>
                        <img
                            src={previewUrl}
                            alt=""
                            className="aspect-video w-full object-cover"
                        />
                    </>
                ) : (
                    <ChefHat className="size-12 text-muted" />
                )}
            </div>
        </div>
    )
}