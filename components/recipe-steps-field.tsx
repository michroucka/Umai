import {RecipeFormValues} from "@/components/recipe-form";
import {Control, Controller, FieldErrors, useFieldArray, UseFormTrigger} from "react-hook-form";
import {Field, FieldError, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Textarea} from "@/components/ui/textarea";
import {Plus, Trash2} from "lucide-react";
import {Button} from "@/components/ui/button";


export function RecipeStepsField({ control, errors, trigger }: {
    control: Control<RecipeFormValues>;
    errors: FieldErrors<RecipeFormValues>;
    trigger: UseFormTrigger<RecipeFormValues>;
}) {
    const { fields, append, remove } = useFieldArray({ control, name: "steps" });

    return (
        <FieldGroup className="max-xl:mb-16">
            {fields.map((item, index) => (
                <div key={item.id} className="flex gap-2">
                    <Field orientation="horizontal" className="min-w-0">
                        <FieldLabel className="mb-auto" htmlFor={`steps.${index}.content`}>{index + 1}.</FieldLabel>
                        <Controller
                            name={`steps.${index}.content`}
                            control={control}
                            render={({field, fieldState}) => (
                                <>
                                    <Textarea
                                        {...field}
                                        aria-invalid={fieldState.invalid}
                                        onChange={(e) => {
                                            field.onChange(e);
                                            void trigger("steps");
                                        }}
                                    />
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </>
                            )}
                        />
                    </Field>
                    <div>
                        <Button
                            size="icon-sm"
                            variant="destructive"
                            type="button"
                            className="h-full"
                            onClick={() => remove(index)}
                            disabled={fields.length === 1}
                        >
                            <Trash2 />
                        </Button>
                    </div>
                </div>
            ))}
            <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => append({content: ""})}
            >
                <Plus className="size-3.5" /> Přidat krok
            </Button>
            {errors.steps?.root && <FieldError errors={[errors.steps.root]} />}
        </FieldGroup>
    )
}