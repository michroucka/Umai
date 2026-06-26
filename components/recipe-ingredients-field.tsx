import {Control, Controller, FieldErrors, useFieldArray, UseFormGetValues, UseFormTrigger} from "react-hook-form";
import {RecipeFormValues} from "@/components/recipe-form";
import {Input} from "@/components/ui/input";
import {Field, FieldError, FieldGroup, FieldLabel} from "@/components/ui/field";
import {InputGroup, InputGroupInput} from "@/components/ui/input-group";
import {
    Autocomplete, AutocompleteClear,
    AutocompleteInput,
    AutocompleteItem,
    AutocompleteList,
    AutocompletePopup,
    AutocompleteTrigger
} from "@/components/ui/autocomplete";
import {Button} from "@/components/ui/button";
import {Trash2} from "lucide-react";


export function RecipeIngredientsField({ control, getValues, errors, trigger, isSubmitted }: {
    control: Control<RecipeFormValues>;
    getValues: UseFormGetValues<RecipeFormValues>;
    errors: FieldErrors<RecipeFormValues>;
    trigger: UseFormTrigger<RecipeFormValues>;
    isSubmitted: boolean;
}) {
    const { fields, append, remove } = useFieldArray({ control, name: "ingredients" });

    const units = ["g", "ml", "ks", "dle chuti", "dle potřeby"]

    return (
        <FieldGroup>
        {fields.map((item, index) => {
            const isLast = index === fields.length - 1;

            return (
                <div key={item.id} className="flex gap-2">
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

                                                const isSecondToLast = index === fields.length - 2;

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
                                                type="number" min={0}
                                                name={field.name}
                                                ref={field.ref}
                                                onBlur={field.onBlur}
                                                value={field.value ?? ""}
                                                onChange={(e) => {
                                                    const val = e.target.valueAsNumber;
                                                    field.onChange(isNaN(val) ? undefined : val);
                                                }}
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
                                                        className="w-1/2 border-0 border-l rounded-l-none shadow-none [&_input::placeholder]:text-[13px]"
                                                        aria-invalid={isSubmitted && !isLast && fieldState.invalid}
                                                    >
                                                        <AutocompleteClear/>
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
                    <div>
                        <Button
                            size="icon-sm"
                            variant="destructive"
                            type="button"
                            className="h-full"
                            onClick={() => remove(index)}
                            disabled={fields.length === 1 || isLast}
                        >
                            <Trash2 />
                        </Button>
                    </div>
                </div>
            )
        })}
        {errors.ingredients?.root && <FieldError errors={[errors.ingredients.root]} />}
        </FieldGroup>
    )
}