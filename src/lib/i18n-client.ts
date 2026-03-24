"use client";

import { createContext, useContext } from "react";
import type ptBR from "@/dictionaries/pt-BR.json";

export type Dictionary = typeof ptBR;

export const DictionaryContext = createContext<Dictionary>({} as Dictionary);
export const useTranslation = () => useContext(DictionaryContext);
