"use client"

import {RecipeWithDetails} from "@/lib/types";
import {Input} from "@/components/ui/input";
import {useEffect, useRef, useState} from "react";
import {Badge} from "@/components/ui/badge";
import {formatAmount, parseHoursMinutes} from "@/lib/utils";
import {Button} from "@/components/ui/button";
import {ChevronLeft, ChevronRight, List, Maximize2, Minus, PenSquare, Plus, TimerIcon, Trash2, X} from "lucide-react";
import {Separator} from "@/components/ui/separator";
import {Field, FieldContent, FieldDescription, FieldLabel} from "@/components/ui/field";
import {Checkbox} from "@/components/ui/checkbox";
import Link from "next/link";
import {ButtonGroup} from "@/components/ui/button-group";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {deleteRecipe} from "@/lib/actions/delete-recipe";
import {Timer} from "@/components/timer";
import { motion, AnimatePresence, useDragControls } from "motion/react";
import {Ingredients} from "@/components/ingredients";
import {ScalableText} from "@/components/scalable-text";

const MIN_PORTIONS = 1;
const MAX_PORTIONS = 99;

function clampPortions(value: number): number {
    return Math.min(MAX_PORTIONS, Math.max(MIN_PORTIONS, value));
}

export function Recipe({recipe}: { recipe: RecipeWithDetails }) {
    const [fullscreenMode, setFullScreenMode] = useState<boolean>(false);
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [swipeDirection, setSwipeDirection] = useState<number>(1);
    const variants = {
        enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
    };

    const [timerOpen, setTimerOpen] = useState<boolean>(false);
    const [ingredientsOpen, setIngredientsOpen] = useState<boolean>(false);
    const ingredientsDragControls = useDragControls();

    const [deleteOpen, setDeleteOpen] = useState<boolean>(false);

    const [portions, setPortions] = useState<number>(recipe.portions);
    const portionsFactor = portions / recipe.portions;
    const prepTime = recipe.prepTime ? parseHoursMinutes(recipe.prepTime) : null;

    const wakeLockRef = useRef<WakeLockSentinel | null>(null);

    // TODO: wake lock fixes
    // - Race on unmount: request() is async, so if cleanup runs before it
    //   resolves (fast unmount, StrictMode double-mount in dev), the lock is
    //   acquired after cleanup and never released. Track a `cancelled` flag
    //   in the effect and release the fresh sentinel right after `await`
    //   when it's set.
    // - Leaked sentinel: acquireWakeLock() overwrites the ref without
    //   releasing the previous sentinel. Skip the request when a live
    //   (`!released`) sentinel is already held.
    // - Unsupported API: `navigator.wakeLock?.request` silently does nothing
    //   when the API is missing (e.g. iOS home screen apps before 18.4).
    //   Check `"wakeLock" in navigator` explicitly if the user should know.
    useEffect(() => {
        async function acquireWakeLock() {
            try {
                wakeLockRef.current = await navigator.wakeLock?.request("screen");
            } catch (err) {
                console.error("Failed to acquireWakeLock: ", err);
            }
        }

        function handleVisibilityChange() {
            if (document.visibilityState === "visible") {
                acquireWakeLock();
            }
        }

        acquireWakeLock();
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            wakeLockRef.current?.release();
        }

    }, []);

    function paginate(newDirection: number) {
        const next = currentStep + newDirection;
        if (next < 0 || next > recipe.steps.length - 1) return;
        setSwipeDirection(newDirection);
        setCurrentStep(next);
    };

    return (
        <AnimatePresence>
            {fullscreenMode ? (
                <motion.div
                    className="fixed inset-0 z-50 bg-background flex flex-col"
                    key="fullscreen"
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                >
                    <AnimatePresence mode="popLayout" custom={swipeDirection} initial={false}>
                        <motion.div
                            className="flex-1 overflow-y-auto p-6"
                            key={currentStep}
                            custom={swipeDirection}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.7}
                            onDragEnd={(_, info) => {
                                const threshold = 50;
                                if (info.offset.x < -threshold) paginate(1);
                                else if (info.offset.x > threshold) paginate(-1);
                            }}
                        >
                            <span className="text-lg whitespace-pre-wrap">
                                <span className="text-3xl font-semibold text-primary mr-2">{recipe.steps[currentStep].stepOrder + 1}.</span>
                                <ScalableText text={recipe.steps[currentStep].content} factor={portionsFactor} />
                            </span>
                        </motion.div>
                    </AnimatePresence>
                    <AnimatePresence>
                        {timerOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                            >
                                <Timer />
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <AnimatePresence>
                        {ingredientsOpen && (
                            <>
                                <motion.div
                                    className="fixed inset-0 z-60 bg-black/50"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setIngredientsOpen(false)}
                                />

                                <motion.div
                                    className="fixed inset-x-0 bottom-0 z-60 max-h-[60vh] overflow-y-auto rounded-t-2xl border-t bg-background p-4"
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    exit={{ y: "100%" }}
                                    transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
                                    drag="y"
                                    dragListener={false}
                                    dragControls={ingredientsDragControls}
                                    dragConstraints={{ top: 0, bottom: 0 }}
                                    dragElastic={{ top: 0, bottom: 0.5 }}
                                    onDragEnd={(_, info) => {
                                        if (info.offset.y > 100) setIngredientsOpen(false);
                                    }}
                                >
                                    <div
                                        className="-mx-4 -mt-4 mb-3 flex touch-none justify-center py-3"
                                        onPointerDown={(e) => ingredientsDragControls.start(e)}
                                    >
                                        <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
                                    </div>
                                    <Ingredients ingredients={recipe.ingredients} portionsFactor={portionsFactor} />
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                    <div className="flex justify-between p-6 pt-3">
                        <div className="flex gap-2">
                            <Button
                                size="icon-xl"
                                variant="outline"
                                className="rounded-full"
                                onClick={() => setFullScreenMode(false)}
                            >
                                <X />
                            </Button>
                            <Button
                                size="icon-xl"
                                variant="outline"
                                className="rounded-full"
                                onClick={() => setTimerOpen(!timerOpen)}
                            >
                                <TimerIcon />
                            </Button>
                            <Button
                                size="icon-xl"
                                variant="outline"
                                className="rounded-full"
                                onClick={() => setIngredientsOpen(!ingredientsOpen)}
                            >
                                <List />
                            </Button>
                        </div>
                        <div>
                            <ButtonGroup>
                                <Button
                                    size="icon-xl"
                                    variant="outline"
                                    onClick={() => {paginate(-1)}}
                                    disabled={currentStep === 0}
                                >
                                    <ChevronLeft />
                                </Button>
                                <Button
                                    size="icon-xl"
                                    variant="outline"
                                    onClick={() => paginate(1)}
                                    disabled={currentStep === recipe.steps.length - 1}
                                >
                                    <ChevronRight />
                                </Button>
                            </ButtonGroup>
                        </div>
                    </div>
                </motion.div>
            ) : (
                <motion.div key="normal" className="xl:flex xl:h-full xl:min-h-0 xl:flex-col">
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
                                    asChild
                                >
                                    <Link href="/"><Trash2 /> Smazat</Link>
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <div className="flex justify-between mb-4 xl:shrink-0">
                        <Button variant="outline" asChild>
                            <Link href="/"><X /> Zavřít</Link>
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="secondary" asChild>
                                <Link href={`/recipes/${recipe.id}/edit`}><PenSquare /> Upravit</Link>
                            </Button>
                            <Button variant="destructive" size="icon" onClick={() => setDeleteOpen(true)}>
                                <Trash2 />
                            </Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:flex-1 xl:min-h-0">
                        <div className="flex flex-col gap-4 sm:gap-2 xl:pr-4 xl:border-r xl:min-h-0">
                            <div className="flex flex-col sm:flex-row gap-2 xl:shrink-0">
                                {recipe.image && (
                                    <div className="relative w-full sm:w-64 sm:min-w-64 mb-0 sm:mb-4 aspect-video rounded-md bg-muted/40 flex items-center justify-center overflow-hidden">
                                        <img
                                            src={recipe.image}
                                            alt=""
                                            className="aspect-video w-full object-cover"
                                        />
                                    </div>
                                )}
                                <div className="flex flex-col gap-2">
                                    <div className="flex flex-col gap-0.5">
                                        <h3>{recipe.name}</h3>
                                        {recipe.description &&
                                            <p className="m-0 leading-5 text-sm">{recipe.description}</p>
                                        }
                                    </div>
                                    <div className="flex max-sm:justify-between sm:gap-8 text-center">
                                        <div>
                                            <p>Porce</p>
                                            <div className="flex items-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => setPortions(p => clampPortions(p - 1))}
                                                    disabled={portions <= MIN_PORTIONS}
                                                >
                                                    <Minus className="size-4" />
                                                </Button>
                                                <Input
                                                    type="number"
                                                    value={portions}
                                                    min={MIN_PORTIONS} max={MAX_PORTIONS}
                                                    onChange={(e) => setPortions(clampPortions(Number(e.target.value)))}
                                                    onFocus={(e) => e.target.select()}
                                                    className="max-w-10 text-center [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => setPortions(p => clampPortions(p + 1))}
                                                    disabled={portions >= MAX_PORTIONS}
                                                >
                                                    <Plus className="size-4" />
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
                            </div>
                            <div className="flex flex-col gap-2 xl:flex-1 xl:min-h-0">
                                <h4 className="mb-1 xl:shrink-0">Ingredience</h4>
                                <div className="flex flex-col gap-2 xl:flex-1 xl:min-h-0 xl:overflow-y-auto xl:pb-4">
                                    {recipe.ingredients.map((ingredient) => {
                                        const amount = ingredient.amount ?
                                            formatAmount(ingredient.amount * portionsFactor) : null;

                                        return (
                                            <Field key={ingredient.id} orientation="horizontal" className="group">
                                                <Checkbox id={`ingredient-${ingredient.id}`} name={`ingredient-${ingredient.id}`}/>
                                                <FieldContent className="gap-0">
                                                    <FieldLabel
                                                        htmlFor={`ingredient-${ingredient.id}`}
                                                        className="gap-1 group-has-data-[state=checked]:line-through group-has-data-[state=checked]:text-muted-foreground"
                                                    >
                                                        <span className="font-bold">{ingredient.name}</span> • {amount ?? ""} {ingredient.unit}
                                                    </FieldLabel>
                                                    {ingredient.note &&
                                                        <FieldDescription
                                                            className="group-has-data-[state=checked]:line-through group-has-data-[state=checked]:opacity-75"
                                                        >
                                                            <ScalableText text={ingredient.note} factor={portionsFactor} />
                                                        </FieldDescription>
                                                    }
                                                </FieldContent>
                                            </Field>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                        <Separator className="xl:hidden" />
                        <div className="flex flex-col gap-1 xl:min-h-0">
                            <div className="flex justify-between mb-1 xl:shrink-0">
                                <h4 className="mb-1">Postup</h4>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="xl:hidden"
                                    onClick={() => setFullScreenMode(true)}
                                >
                                    <Maximize2 />
                                </Button>
                            </div>
                            <div className="flex flex-col gap-1 xl:flex-1 xl:min-h-0 xl:overflow-y-auto xl:pb-4">
                                {recipe.steps.map((step, index) => (
                                    <div key={step.id}>
                                        <div className="flex gap-2">
                                            <h3 className="text-primary min-w-6 self-start -mt-1">{step.stepOrder + 1}.</h3>
                                            <span className="whitespace-pre-wrap">
                                                <ScalableText text={step.content} factor={portionsFactor} />
                                            </span>
                                        </div>
                                        {index < recipe.steps.length - 1 && <Separator className="my-4 mx-auto max-w-2/3 " />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}