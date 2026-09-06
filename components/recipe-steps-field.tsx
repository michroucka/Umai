import {RecipeFormValues} from "@/components/recipe-form";
import {Control, Controller, FieldErrors, useFieldArray, UseFormTrigger} from "react-hook-form";
import {Field, FieldError, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Textarea} from "@/components/ui/textarea";
import {Plus, Trash2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {motion, AnimatePresence} from "motion/react";


export function RecipeStepsField({ control, errors, trigger }: {
    control: Control<RecipeFormValues>;
    errors: FieldErrors<RecipeFormValues>;
    trigger: UseFormTrigger<RecipeFormValues>;
}) {
    const { fields, append, remove } = useFieldArray({ control, name: "steps" });

    return (
        <FieldGroup className="max-xl:mb-16 xl:flex-1 xl:min-h-0 xl:overflow-y-auto">
            <AnimatePresence initial={false}>
                {fields.map((item, index) => (
                    <motion.div
                        key={item.id}
                        className="flex gap-2"
                        layout
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                    >
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
                    </motion.div>
                ))}
            </AnimatePresence>
            <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full mb-6"
                onClick={() => append({content: ""})}
            >
                <Plus className="size-3.5" /> Přidat krok
            </Button>
            {errors.steps?.root && <FieldError errors={[errors.steps.root]} />}
        </FieldGroup>
    )
}