"use client"

import {RecipeWithDetails} from "@/lib/types";
import {Input} from "@/components/ui/input";
import {useEffect, useState} from "react";
import {Badge} from "@/components/ui/badge";
import {parseHoursMinutes} from "@/lib/utils";
import {Button} from "@/components/ui/button";
import {ChevronLeft, ChevronRight, Maximize2, Minus, PenSquare, Plus, X} from "lucide-react";
import {Separator} from "@/components/ui/separator";
import {Field, FieldContent, FieldDescription, FieldLabel} from "@/components/ui/field";
import {Checkbox} from "@/components/ui/checkbox";
import Link from "next/link";
import {ButtonGroup} from "@/components/ui/button-group";

export function Recipe({recipe}: { recipe: RecipeWithDetails }) {
    const [fullscreenMode, setFullScreenMode] = useState<boolean>(false);
    const [currentStep, setCurrentStep] = useState<number>(0);

    const [portions, setPortions] = useState<number>(recipe.portions);
    const prepTime = recipe.prepTime ? parseHoursMinutes(recipe.prepTime) : null;

    useEffect(() => {
        let wakeLock: WakeLockSentinel | null = null;

        navigator.wakeLock?.request("screen").then((lock) => {
            wakeLock = lock;
        });

        return () => {
            wakeLock?.release();
        };
    }, []);

    return fullscreenMode ? (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
            <div className="flex-1 overflow-y-auto p-6">
                <span className="text-lg">
                    <span className="text-3xl font-semibold text-primary mr-2">{recipe.steps[currentStep].stepOrder + 1}.</span>
                    {recipe.steps[currentStep].content}
                </span>
            </div>
            <div className="flex justify-between p-6">
                <Button
                    size="icon-xl"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => setFullScreenMode(false)}
                >
                    <X />
                </Button>
                <div>
                    <ButtonGroup>
                        <Button
                            size="icon-xl"
                            variant="outline"
                            onClick={() => {
                                if (currentStep > 0) {
                                    setCurrentStep(currentStep - 1);
                                }
                            }}
                            disabled={currentStep === 0}
                        >
                            <ChevronLeft />
                        </Button>
                        <Button
                            size="icon-xl"
                            variant="outline"
                            onClick={() => {
                                if (currentStep < recipe.steps.length - 1) {
                                    setCurrentStep(currentStep + 1);
                                }
                            }}
                            disabled={currentStep === recipe.steps.length - 1}
                        >
                            <ChevronRight />
                        </Button>
                    </ButtonGroup>
                </div>
            </div>
        </div>
    ) : (
        <div>
            <div className="flex max-lg:justify-between lg:gap-4 mb-4">
                <Button variant="outline" asChild>
                    <Link href="/"><X /> Zavřít</Link>
                </Button>
                <Button variant="secondary" asChild>
                    <Link href={`/recipes/${recipe.id}/edit`}><PenSquare /> Upravit</Link>
                </Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2 lg:pr-4 lg:border-r">
                    {/* MOBILE */}
                    <div className="sm:hidden flex flex-col gap-2">
                        {recipe.image && (
                            <div className="relative w-full aspect-video rounded-md bg-muted/40 flex items-center justify-center overflow-hidden">
                                <img
                                    src={recipe.image}
                                    alt=""
                                    className="aspect-video w-full object-cover"
                                />
                            </div>
                        )}
                        <div className="flex flex-col gap-0.5">
                            <h3>{recipe.name}</h3>
                            {recipe.description &&
                                <p className="m-0 leading-5 text-sm">{recipe.description}</p>
                            }
                        </div>
                        <div className="flex justify-between text-center px-2">
                            <div>
                                <p>Porce</p>
                                <div className="flex items-center">
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => setPortions(portions - 1)}
                                    >
                                        <Minus />
                                    </Button>
                                    <Input
                                        type="number"
                                        value={portions}
                                        min={1} max={99}
                                        onChange={(e) => setPortions(Math.min(99, Math.max(1, Number(e.target.value))))}
                                        onFocus={(e) => e.target.select()}
                                        className="max-w-10 text-center [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => setPortions(portions + 1)}
                                    >
                                        <Plus className="size-5" />
                                    </Button>
                                </div>
                            </div>
                            {prepTime &&
                                <div>
                                    <p>Čas přípravy</p>
                                    <Badge size="lg">
                                        {prepTime.hours > 0 && `${prepTime.hours} h`} {prepTime.minutes > 0 && `${prepTime.minutes} min`}
                                    </Badge>
                                </div>
                            }
                        </div>
                    </div>

                    {/* DESKTOP */}
                    <div className="hidden sm:flex gap-2">
                        <div className="flex flex-col gap-2">
                            {recipe.image && (
                                <div className="relative min-w-64 w-64 aspect-video rounded-md bg-muted/40 flex items-center justify-center overflow-hidden mb-4">
                                    <img
                                        src={recipe.image}
                                        alt=""
                                        className="aspect-video w-full object-cover"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col gap-1">
                            <h3>{recipe.name}</h3>
                            {recipe.description &&
                                <p className="m-0 leading-5 text-sm">{recipe.description}</p>
                            }
                            <div className="flex text-center mt-1">
                                <div className="flex-1">
                                    <p>Porce</p>
                                    <div>
                                        <Button
                                            variant="ghost"
                                            size="icon-xs"
                                            onClick={() => setPortions(portions - 1)}
                                        >
                                            <Minus />
                                        </Button>
                                        <Input
                                            type="number"
                                            value={portions}
                                            min={1} max={99}
                                            onChange={(e) => setPortions(Math.min(99, Math.max(1, Number(e.target.value))))}
                                            onFocus={(e) => e.target.select()}
                                            className="max-w-10 text-center [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon-xs"
                                            onClick={() => setPortions(portions + 1)}
                                        >
                                            <Plus />
                                        </Button>
                                    </div>
                                </div>
                                {prepTime &&
                                    <div className="flex-1">
                                        <p>Čas přípravy</p>
                                        <Badge size="lg">
                                            {prepTime.hours > 0 && `${prepTime.hours} h`} {prepTime.minutes > 0 && `${prepTime.minutes} min`}
                                        </Badge>
                                    </div>
                                }
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <h4 className="mb-1">Ingredience</h4>
                        {recipe.ingredients.map((ingredient) => {
                            const amount = ingredient.amount ?
                                Math.round((ingredient.amount / recipe.portions) * portions) : null;

                            return (
                                <Field key={ingredient.id} orientation="horizontal" className="group">
                                    <Checkbox name={`ingredient-${ingredient.id}`}/>
                                    <FieldContent className="gap-0">
                                        <FieldLabel
                                            htmlFor={`ingredient-${ingredient.id}`}
                                            className="gap-1 group-has-data-[state=checked]:line-through group-has-data-[state=checked]:text-muted-foreground"
                                        >
                                            <span className="font-bold">{ingredient.name}</span> • {amount ?? ""} {ingredient.unit}
                                        </FieldLabel>
                                        {ingredient.note &&
                                            <FieldDescription
                                                className="group-has-data-[state=checked]:line-through group-has-data-[state=checked]:text-muted-foreground"
                                            >
                                                {ingredient.note}
                                            </FieldDescription>
                                        }
                                    </FieldContent>
                                </Field>
                            )
                        })}
                    </div>
                </div>
                <Separator className="lg:hidden" />
                <div className="flex flex-col gap-1">
                    <div className="flex justify-between mb-1">
                        <h4 className="mb-1">Postup</h4>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="lg:hidden"
                            onClick={() => setFullScreenMode(true)}
                        >
                            <Maximize2 />
                        </Button>
                    </div>
                    {recipe.steps.map((step, index) => (
                        <div key={step.id}>
                            <div className="flex gap-2">
                                <h3 className="text-primary min-w-6 self-start -mt-1">{step.stepOrder + 1}.</h3>
                                <span>{step.content}</span>
                            </div>
                            {index < recipe.steps.length - 1 && <Separator className="my-4 mx-auto max-w-2/3 " />}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}