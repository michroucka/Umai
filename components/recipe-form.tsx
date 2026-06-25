"use client"

import {
    Field,
    FieldGroup,
    FieldLabel,
    FieldError,
    FieldSet,
    FieldLegend,
    FieldDescription, FieldSeparator
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Button} from "@/components/ui/button";
import {Save, X} from "lucide-react";
import { zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import {useForm, Controller} from "react-hook-form";
import Link from "next/link";
import {createRecipe} from "@/lib/actions/create-recipe";
import {RecipeImageField} from "@/components/recipe-image-field";
import {RecipeIngredientsField} from "@/components/recipe-ingredients-field";
import {Separator} from "@/components/ui/separator";
import {RecipeStepsField} from "@/components/recipe-steps-field";

export type RecipeFormValues = z.infer<typeof recipeSchema>;

const recipeSchema = z.object({
    name: z.string().min(1, "Název je povinný"),
    description: z.string().optional(),
    portions: z.number().min(1),
    hours: z.number().min(0),
    minutes: z.number().min(0).max(59),
    image: z.union([z.instanceof(File), z.url()]).optional(),

    ingredients: z.array(z.object({
        name: z.string(),
        note: z.string().optional(),
        amount: z.number().min(0.1).optional(),
        unit: z.string(),
    }).refine(
        (ing) => ing.name === "" || ing.unit !== "",
        { message: "Jednotka je povinná", path: ["unit"] }
    )).refine(
        (list) => list.slice(0, -1).some(i => i.name.trim() !== ""),
        { message: "Přidejte alespoň jednu ingredienci" }
    ),

    steps: z.array(z.object({
        content: z.string(),
    })).refine(
        (list) => list.some(s => s.content.trim() !== ""),
        { message: "Přidejte alespoň jeden krok" }
    ),
});

async function onSubmit(data: z.infer<typeof recipeSchema>) {
    const formData = new FormData();
    formData.append("name", data.name);
    if (data.description) formData.append("description", data.description);
    formData.append("portions", String(data.portions));
    formData.append("hours", String(data.hours));
    formData.append("minutes", String(data.minutes));
    if (data.image) formData.append("image", data.image);

    formData.append("ingredients", JSON.stringify(data.ingredients));
    formData.append("steps", JSON.stringify(data.steps));

    await createRecipe(formData);
}

export function RecipeForm() {
    const form = useForm<z.infer<typeof recipeSchema>>({
        resolver: zodResolver(recipeSchema),
        defaultValues: { name: "", description: "", portions: 2, hours: 0, minutes: 0,
            ingredients: [{ name: "", unit: "", amount: undefined }], steps: [{ content: "" }] },
    });

    return (
        <form
            className="grid grid-cols-1 xl:grid-cols-3 sm:max-xl:w-2/3 sm:max-xl:mx-auto gap-10 gap-y-4"
            onSubmit={form.handleSubmit(onSubmit)}
        >
            <div className="xl:col-span-3">
                <h1>Nový recept</h1>
                <Separator className="max-w-2/3 sm:max-w-1/3 mx-auto mt-2" />
            </div>

            <FieldSet>
                <FieldLegend>Základní informace</FieldLegend>
                <FieldDescription>Název, popis a čas přípravy receptu.</FieldDescription>
                <FieldGroup>
                    <RecipeImageField control={form.control} setValue={form.setValue} getValues={form.getValues} />
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
                            <Field>
                                <FieldLabel htmlFor="description">Popis</FieldLabel>
                                <Textarea
                                    {...field}
                                    id="description"
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
                    <Field orientation="horizontal" className="max-xl:hidden">
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
            </FieldSet>

            <FieldSeparator className="sm:hidden" />

            <FieldSet>
                <FieldLegend>Ingredience</FieldLegend>
                <FieldDescription>Co všechno budete potřebovat a v jakém množství.</FieldDescription>
                <RecipeIngredientsField
                    control={form.control}
                    getValues={form.getValues}
                    errors={form.formState.errors}
                    trigger={form.trigger}
                />
            </FieldSet>

            <FieldSeparator className="sm:hidden" />

            <FieldSet>
                <FieldLegend>Postup přípravy</FieldLegend>
                <FieldDescription>Jednotlivé kroky, jak recept připravit.</FieldDescription>
                <RecipeStepsField
                    control={form.control}
                    errors={form.formState.errors}
                    trigger={form.trigger}
                />
            </FieldSet>

            <div className="flex gap-2 xl:hidden">
                <Button type="submit">
                    <Save /> Uložit
                </Button>
                <Button variant="outline" type="button" asChild>
                    <Link href="/">
                        <X /> Zrušit
                    </Link>
                </Button>
            </div>
        </form>
    )
}