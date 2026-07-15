import {Control, Controller, FieldErrors, useFieldArray, UseFormGetValues, UseFormTrigger} from "react-hook-form";
import {RecipeFormValues} from "@/components/recipe-form";
import {Input} from "@/components/ui/input";
import {Field, FieldError, FieldGroup, FieldLabel} from "@/components/ui/field";
import {InputGroup, InputGroupInput} from "@/components/ui/input-group";
import {
    Autocomplete,
    AutocompleteInput,
    AutocompleteItem,
    AutocompleteList,
    AutocompletePopup,
    AutocompleteTrigger
} from "@/components/ui/autocomplete";
import {Button} from "@/components/ui/button";
import {ChevronDown, ChevronUp, Trash2} from "lucide-react";
import {AnimatePresence, motion} from "motion/react";

export function RecipeIngredientsField({ control, getValues, errors, trigger, isSubmitted }: {
    control: Control<RecipeFormValues>;
    getValues: UseFormGetValues<RecipeFormValues>;
    errors: FieldErrors<RecipeFormValues>;
    trigger: UseFormTrigger<RecipeFormValues>;
    isSubmitted: boolean;
}) {
    const { fields, append, remove, move } = useFieldArray({ control, name: "ingredients" });

    const units = ["g", "ml", "ks", "lžíce", "lžičky", "dle chuti", "dle potřeby"]

    return (
        <FieldGroup>
            <AnimatePresence mode="popLayout" initial={false}>
                {fields.map((item, index) => {
                    const isFirst = index === 0;
                    const isLast = index === fields.length - 1;
                    const isSecondToLast = index === fields.length - 2;

                    return (
                        <motion.div
                            key={item.id}
                            className="flex gap-2"
                            layout
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -100 }}
                        >
                            <div className="flex flex-col gap-2">
                                <Field orientation="horizontal">
                                    <FieldLabel htmlFor={`ingredients.${index}.name`}>Název</FieldLabel>
                                    <Controller
                                        name={`ingredients.${index}.name`}
                                        control={control}
                                        render={({field, fieldState}) => (
                                            <>
                                                <Input
                                                    {...field}
                                                    aria-invalid={isSubmitted && !isLast && fieldState.invalid}
                                                    onChange={(e) => {
                                                        const wasEmpty = field.value === "";
                                                        const newValue = e.target.value;
                                                        field.onChange(e);

                                                        if (wasEmpty && newValue !== "" && isLast) {
                                                            append({name: "", unit: "", amount: undefined}, {shouldFocus: false});
                                                        }

                                                        if (!wasEmpty && newValue === "" && isSecondToLast) {
                                                            const lastName = getValues(`ingredients.${fields.length - 1}.name`);
                                                            if (lastName === "") {
                                                                remove(fields.length - 1);
                                                            }
                                                        }

                                                        void trigger("ingredients")
                                                    }}
                                                />
                                                {isSubmitted && !isLast && fieldState.invalid && <FieldError errors={[fieldState.error]}/>}
                                            </>
                                        )}
                                    />
                                </Field>
                                <Field orientation="horizontal">
                                    <FieldLabel htmlFor={`ingredients.${index}.amount`}>Množství</FieldLabel>
                                    <div className="flex flex-col gap-1">
                                        <InputGroup>
                                            <Controller
                                                name={`ingredients.${index}.amount`}
                                                control={control}
                                                render={({field, fieldState}) => (
                                                    <InputGroupInput
                                                        type="text" inputMode="decimal"
                                                        name={field.name}
                                                        ref={field.ref}
                                                        onBlur={field.onBlur}
                                                        value={field.value ?? ""}
                                                        onChange={(e) => field.onChange(e.target.value)}
                                                        aria-invalid={isSubmitted && !isLast && fieldState.invalid}
                                                    />
                                                )}
                                            />
                                            <Controller
                                                name={`ingredients.${index}.unit`}
                                                control={control}
                                                render={({field, fieldState}) => (
                                                    <>
                                                        <Autocomplete
                                                            value={field.value}
                                                            onValueChange={(value) => {
                                                                field.onChange(value);
                                                                void trigger("ingredients")
                                                            }}
                                                            items={units}
                                                            mode="none"
                                                            openOnInputClick
                                                        >
                                                            <AutocompleteInput
                                                                placeholder="Jednotka"
                                                                className="w-1/2 border-0 border-l rounded-l-none shadow-none [&_input]:text-sm [&_input::placeholder]:text-[13px]"
                                                                aria-invalid={isSubmitted && !isLast && fieldState.invalid}
                                                            >
                                                                <AutocompleteTrigger/>
                                                            </AutocompleteInput>
                                                            <AutocompletePopup>
                                                                <AutocompleteList>
                                                                    {(unit) => (
                                                                        <AutocompleteItem key={unit} value={unit}>
                                                                            {unit}
                                                                        </AutocompleteItem>
                                                                    )}
                                                                </AutocompleteList>
                                                            </AutocompletePopup>
                                                        </Autocomplete>
                                                    </>
                                                )}
                                            />
                                        </InputGroup>
                                        {isSubmitted && !isLast && errors.ingredients?.[index]?.unit && (
                                            <FieldError className="w-1/2 ms-auto" errors={[errors.ingredients[index].unit]} />
                                        )}
                                    </div>
                                </Field>
                                <Field orientation="horizontal">
                                    <FieldLabel htmlFor={`ingredients.${index}.note`}>Poznámka</FieldLabel>
                                    <Controller
                                        name={`ingredients.${index}.note`}
                                        control={control}
                                        render={({field}) => (
                                            <Input {...field} />
                                        )}
                                    />
                                </Field>
                            </div>
                            <div className="flex flex-col">
                                <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    type="button"
                                    onClick={() => move(index, index - 1)}
                                    disabled={fields.length === 1 || isLast || isFirst}
                                >
                                    <ChevronUp />
                                </Button>
                                <Button
                                    size="icon-sm"
                                    variant="destructive"
                                    type="button"
                                    className="flex-1"
                                    onClick={() => remove(index)}
                                    disabled={fields.length === 1 || isLast}
                                >
                                    <Trash2 />
                                </Button>
                                <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    type="button"
                                    onClick={() => move(index, index + 1)}
                                    disabled={fields.length === 1 || isLast || isSecondToLast}
                                >
                                    <ChevronDown />
                                </Button>
                            </div>
                        </motion.div>
                    )
                })}
            </AnimatePresence>
        {errors.ingredients?.root && <FieldError errors={[errors.ingredients.root]} />}
        </FieldGroup>
    )
}