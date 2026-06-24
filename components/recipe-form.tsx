"use client"

import {useEffect, useRef, useState} from "react";
import {Field, FieldGroup, FieldLabel} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {ButtonGroup} from "@/components/ui/button-group";
import {Button} from "@/components/ui/button";
import {Save, Search, Upload, X} from "lucide-react";

export function RecipeForm() {
    const [ name, setName ] = useState<string>("");
    const [ description, setDescription ] = useState<string>("");
    const [ hours, setHours ] = useState<number>(0);
    const [ minutes, setMinutes ] = useState<number>(0);
    const [ image, setImage ] = useState<File | null>(null);
    const [ portions, setPortions ] = useState<number>(2);

    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <form className="w-full max-w-md self-center">
            <h1 className="my-4">Nový recept</h1>
            <FieldGroup>
                <div className="grid grid-cols-2 gap-4">
                    <Field>
                        <FieldLabel htmlFor="form-image">Obrázek</FieldLabel>
                        <input type="file"
                               ref={fileInputRef}
                               className="hidden"
                               onChange={(e) => setImage(e.target.files?.[0] ?? null)}
                        />
                        <ButtonGroup id="form-image">
                            <Button type="button"
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload /> Nahrát obrázek
                            </Button>
                            <Button variant="outline" type="button">
                                <Search /> Hledat online
                            </Button>
                        </ButtonGroup>
                    </Field>
                </div>
                <Field>
                    <FieldLabel htmlFor="form-name">Název receptu</FieldLabel>
                    <Input id="form-name"
                           type="text"
                           value={name}
                           onChange={(e) => setName(e.target.value)}
                           required
                    />
                </Field>
                <Field>
                    <FieldLabel htmlFor="form-description">Popis</FieldLabel>
                    <Textarea id="form-description"
                              value={description}
                              onChange={(e) => setDescription(e.target.value)}
                    />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                    <Field>
                        <FieldLabel htmlFor="form-prep-time">Čas přípravy</FieldLabel>
                        <div id="form-prep-time" className="flex items-center gap-2">
                            <Input type="number"
                                   value={hours}
                                   onChange={(e) => setHours(Number(e.target.value))}
                                   min={0} max={99}
                                   className="w-16" />
                            <span>h</span>
                            <Input type="number"
                                   value={minutes}
                                   onChange={(e) => {
                                       const val = Number(e.target.value);
                                       if (val < 0) {
                                           if (hours == 0) return;
                                           else {
                                               setHours(hours - 1);
                                               setMinutes(59);
                                           }
                                       } else if (val >= 60) {
                                           setHours(hours + Math.floor(val / 60))
                                           setMinutes(val % 60)
                                       } else {
                                           setMinutes(val)
                                       }
                                   }}
                                   className="w-16" />
                            <span>min</span>
                        </div>
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="form-portions">Počet porcí</FieldLabel>
                        <Input id="form-portions"
                               type="number"
                               min={1}
                               max={99}
                               value={portions}
                               onChange={(e) => setPortions(Number(e.target.value))}
                               required
                       />
                    </Field>
                </div>
                <Field orientation="horizontal">
                    <Button type="submit">
                        <Save /> Uložit
                    </Button>
                    <Button variant="outline" type="button">
                        <X /> Zrušit
                    </Button>
                </Field>
            </FieldGroup>
        </form>
    )
}