"use client"

import {useEffect, useRef, useState} from "react";
import {Button} from "@/components/ui/button";
import {Clock, Pause, Play, RotateCcw} from "lucide-react";
import {Input} from "@/components/ui/input";
import {Badge} from "@/components/ui/badge";

export function Timer() {
    const [inputMinutes, setInputMinutes] = useState(1);
    const [inputSeconds, setInputSeconds] = useState(0);
    const [remainingMs, setRemainingMs] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [durationMs, setDurationMs] = useState(0);

    const endTimeRef = useRef<number | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const alarmedRef = useRef(false);

    function start(){
        if (inputMinutes == 0 && inputSeconds == 0) return;

        alarmedRef.current = false;
        let remaining;
        if (remainingMs === 0) {
            remaining = inputMinutes * 60000 + inputSeconds * 1000;

            setRemainingMs(remaining);
            setDurationMs(remaining);
        } else {
            remaining = remainingMs;
        }

        endTimeRef.current = Date.now() + remaining;
        setIsRunning(true);
    }

    function check() {
        if (endTimeRef.current !== null) {
            const left = endTimeRef.current - Date.now();
            setRemainingMs(Math.max(0, left));
            if (left <= 0 && audioRef.current && !alarmedRef.current) {
                alarmedRef.current = true;
                audioRef.current.currentTime = 0;
                audioRef.current.play();
            }
        }
    }

    function stop() {
        if (endTimeRef.current !== null && remainingMs > 0) {
            setInputMinutes(Math.floor(remainingMs / 60000))
            setInputSeconds(Math.floor((remainingMs % 60000) / 1000))
        } else {
            reset();
        }
        setIsRunning(false);
        audioRef.current?.pause();
    }

    function reset() {
        if (durationMs > 0) {
            setIsRunning(false);
            audioRef.current?.pause();

            setInputMinutes(Math.floor(durationMs / 60000))
            setInputSeconds(Math.floor((durationMs % 60000) / 1000))
            setRemainingMs(durationMs);
        }
    }

    useEffect(() => {
        if (isRunning) {
            const intId = setInterval(check, 250)

            return () => clearInterval(intId);
        }
    }, [isRunning]);

    return (
        <div className="flex flex-col gap-1">
            {!isRunning && (
                <div className="flex gap-2 justify-center">
                    <Badge variant="outline" className="bg-card" onClick={() => {
                        setInputMinutes(1);
                        setInputSeconds(0);
                        setRemainingMs(0);
                    }}>
                        <Clock /> 1 min
                    </Badge>
                    <Badge variant="outline" className="bg-card" onClick={() => {
                        setInputMinutes(3);
                        setInputSeconds(0);
                        setRemainingMs(0);
                    }}>
                        <Clock /> 3 min
                    </Badge>
                    <Badge variant="outline" className="bg-card" onClick={() => {
                        setInputMinutes(5);
                        setInputSeconds(0);
                        setRemainingMs(0);
                    }}>
                        <Clock /> 5 min
                    </Badge>
                    <Badge variant="outline" className="bg-card" onClick={() => {
                        setInputMinutes(10);
                        setInputSeconds(0);
                        setRemainingMs(0);
                    }}>
                        <Clock /> 10 min
                    </Badge>
                    <Badge variant="outline" className="bg-card" onClick={() => {
                        setInputMinutes(15);
                        setInputSeconds(0);
                        setRemainingMs(0);
                    }}>
                        <Clock /> 15 min
                    </Badge>
                </div>
            )}
            <div className="bg-card rounded-full border p-2 m-2 flex justify-between tabular-nums">
                <Button variant="ghost" onClick={reset}>
                    <RotateCcw /> Reset
                </Button>
                {isRunning ? (
                    <div className="grid grid-cols-2 gap-2 items-center text-2xl font-bold">
                        <div className="flex gap-1">
                            <span className="w-8 text-right">{Math.floor(remainingMs / 60000)}</span>
                            <span>m</span>
                        </div>

                        <div className="flex gap-1">
                            <span className="w-8 text-right">{Math.floor((remainingMs % 60000) / 1000)}</span>
                            <span>s</span>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2 text-2xl font-bold">
                        <div className="flex items-center gap-1">
                            <Input
                                type="number"
                                className="w-8 h-auto border-0 bg-transparent! shadow-none p-0 text-2xl font-bold text-end
                                       focus-visible:ring-0 focus-visible:border-transparent
                                       [&::-webkit-outer-spin-button]:appearance-none
                                       [&::-webkit-inner-spin-button]:appearance-none
                                       [-moz-appearance:textfield]"
                                value={inputMinutes}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                    setInputMinutes(Math.max(0, Math.min(99, Number(e.target.value))));
                                    setRemainingMs(0);
                                }}
                                min={0}
                                max={99}
                            />
                            m
                        </div>
                        <div className="flex items-center gap-1">
                            <Input
                                type="number"
                                className="w-8 h-auto border-0 bg-transparent! shadow-none p-0 text-2xl font-bold text-end
                                       focus-visible:ring-0 focus-visible:border-transparent
                                       [&::-webkit-outer-spin-button]:appearance-none
                                       [&::-webkit-inner-spin-button]:appearance-none
                                       [-moz-appearance:textfield]"
                                value={inputSeconds}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                    setInputSeconds(Math.max(0, Math.min(59, Number(e.target.value))));
                                    setRemainingMs(0);
                                }}
                                min={0}
                                max={59}
                            />
                            s
                        </div>
                    </div>
                )}
                <Button variant="ghost" className="w-30 justify-start" onClick={isRunning ? stop : start}>
                    {isRunning ? (<><Pause /> Zastavit</>) : (<><Play /> Spustit</>)}
                </Button>

                <audio className="hidden" src="/alarm.mp3" ref={audioRef} />
            </div>
        </div>
    )
}