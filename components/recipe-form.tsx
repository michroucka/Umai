"use client"

import {useEffect, useMemo, useRef, useState} from "react";
import {Field, FieldGroup, FieldLabel, FieldError} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {ButtonGroup} from "@/components/ui/button-group";
import {Button} from "@/components/ui/button";
import {ChefHat, Save, Search, Upload, X} from "lucide-react";
import { zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import {useForm, Controller, useWatch} from "react-hook-form";
import {searchImages} from "@/lib/actions/search-images";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import Link from "next/link";
import {createRecipe} from "@/lib/actions/create-recipe";

const recipeSchema = z.object({
    name: z.string().min(1, "Název je povinný"),
    description: z.string().optional(),
    portions: z.number().min(1),
    hours: z.number().min(0),
    minutes: z.number().min(0).max(59),
    image: z.union([z.instanceof(File), z.url()]).optional(),
});

async function onSubmit(data: z.infer<typeof recipeSchema>) {
    const formData = new FormData();
    formData.append("name", data.name);
    if (data.description) formData.append("description", data.description);
    formData.append("portions", String(data.portions));
    formData.append("hours", String(data.hours));
    formData.append("minutes", String(data.minutes));
    if (data.image) formData.append("image", data.image);

    await createRecipe(formData);
}

export function RecipeForm() {
    const [searchResults, setSearchResults] = useState<{ id: number; src: { medium: string }}[]>([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const form = useForm<z.infer<typeof recipeSchema>>({
        resolver: zodResolver(recipeSchema),
        defaultValues: { name: "", description: "", portions: 2, hours: 0, minutes: 0 },
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imgWatch = useWatch({ control: form.control, name: "image" });

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
        <form
            className="w-full max-w-md self-center"
            onSubmit={form.handleSubmit(onSubmit)}
        >
            <h1 className="my-4">Nový recept</h1>
            <FieldGroup>
                <div className="flex flex-col gap-4">
                    <Field>
                        <FieldLabel htmlFor="image">Obrázek</FieldLabel>
                        <Controller
                            name="image"
                            control={form.control}
                            render={({ field: { onChange, ref, name, onBlur } }) => (
                                <input type="file"
                                       name={name}
                                       onBlur={onBlur}
                                       ref={(e) => {
                                           ref(e)
                                           fileInputRef.current = e
                                       }}
                                       className="hidden"
                                       onChange={(e) => onChange(e.target.files?.[0] ?? null)}
                                />
                            )}
                        />
                        <ButtonGroup id="image">
                            <Button type="button"
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload /> Nahrát obrázek
                            </Button>
                            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline"
                                            type="button"
                                            onClick={async () => {
                                                const query = form.getValues("name");
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
                                                    form.setValue("image", photo.src.medium);
                                                    setDialogOpen(false);
                                                }}
                                                className="overflow-hidden rounded-md border hover:ring-2 hover:ring-primary"
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
                    </Field>
                    <div className="relative w-44 h-26 rounded-md bg-muted/40 flex items-center justify-center overflow-hidden">
                        {previewUrl != null ? (
                            <>
                                <Button
                                    type="button"
                                    className="absolute right-1 top-1 rounded-full bg-destructive hover:bg-destructive/75"
                                    size="icon-sm"
                                    onClick={() => form.setValue("image", undefined)}
                                >
                                    <X />
                                </Button>
                                <img
                                    src={previewUrl}
                                    alt=""
                                    className="aspect-square w-full object-cover"
                                />
                            </>
                        ) : (
                            <ChefHat className="size-12 text-muted" />
                        )}
                    </div>
                </div>
                <Controller
                    name="name"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="name">Název receptu</FieldLabel>
                            <Input
                                {...field}
                                id="name"
                                aria-invalid={fieldState.invalid}
                            />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />
                <Controller
                    name="description"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="description">Popis</FieldLabel>
                            <Textarea
                                {...field}
                                id="description"
                                aria-invalid={fieldState.invalid}
                            />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />
                <div className="grid grid-cols-2 gap-4">
                    <Field>
                        <FieldLabel htmlFor="hours">Čas přípravy</FieldLabel>
                        <div className="flex items-center gap-2">
                            <Controller
                                name="hours"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <>
                                        <Input
                                            {...field}
                                            id="hours"
                                            type="number"
                                            onChange={(e) => field.onChange(Number(e.target.value))}
                                            min={0} max={99}
                                            className="w-16"
                                            aria-invalid={fieldState.invalid}
                                            onFocus={(e) => e.target.select()}
                                        />
                                    </>
                                )}
                            />
                            <span>h</span>
                            <Controller
                                name="minutes"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <>
                                        <Input
                                            {...field}
                                            type="number"
                                            value={field.value}
                                            onChange={(e) => {
                                                const val = Number(e.target.value);
                                                const currentHours = form.getValues("hours");
                                                if (val < 0) {
                                                    if (currentHours == 0) return;
                                                    form.setValue("hours", currentHours - 1);
                                                    field.onChange(59);
                                                } else if (val >= 60) {
                                                    form.setValue("hours", currentHours + Math.floor(val / 60));
                                                    field.onChange(val % 60);
                                                } else {
                                                    field.onChange(val);
                                                }
                                            }}
                                            className="w-16"
                                            aria-invalid={fieldState.invalid}
                                            onFocus={(e) => e.target.select()}
                                        />
                                    </>
                                )}
                            />
                            <span>min</span>
                        </div>
                        {(form.formState.errors.hours || form.formState.errors.minutes) && (
                            <FieldError errors={[form.formState.errors.hours, form.formState.errors.minutes]} />
                        )}
                    </Field>
                    <Controller
                        name="portions"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor="portions">Počet porcí</FieldLabel>
                                <Input
                                    {...field}
                                    id="portions"
                                    aria-invalid={fieldState.invalid}
                                    type="number"
                                    min={1}
                                    max={99}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                    onFocus={(e) => e.target.select()}
                                />
                                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                            </Field>
                        )}
                    />
                </div>
                <Field orientation="horizontal">
                    <Button type="submit">
                        <Save /> Uložit
                    </Button>
                    <Button variant="outline" type="button" asChild>
                        <Link href="/">
                            <X /> Zrušit
                        </Link>
                    </Button>
                </Field>
            </FieldGroup>
        </form>
    )
}