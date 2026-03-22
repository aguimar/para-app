"use client";

import {
  // Conhecimento
  BookOpen, Books, Note, NotePencil, Notebook, FileText,
  Archive, Bookmark, Tag, Article, Hash, List,
  // Ciência & Mente
  Brain, Atom, Flask, Microscope, Lightbulb, MagnifyingGlass,
  Eye, ChartLine, Scales, PuzzlePiece, TestTube, Infinity,
  // Tecnologia
  Code, Terminal, Desktop, DeviceMobile, Cpu, Database,
  GitBranch, Robot, Gear, Wrench, Cloud, Bug,
  // Arte & Criação
  PaintBrush, Palette, MusicNote, Camera, FilmStrip, Microphone,
  Pen, Pencil, Image, Scissors, VideoCamera, Aperture,
  // Natureza
  Tree, Leaf, Globe, Fire, Drop, Lightning,
  Sun, Moon, Flower, Mountains, Wind, Planet,
  // Negócios
  Briefcase, ChartBar, Trophy, Rocket, Crown, Key,
  Megaphone, Target, Flag, Compass, Handshake, Certificate,
  // Pessoas & Vida
  User, Users, GraduationCap, Heart, House, Star,
  Smiley, Chat, Phone, Baby, Buildings, Medal,
  // Saúde & Bem-estar
  Heartbeat, Timer, Barbell, Coffee, Shield, FirstAid,
  Pill, PersonSimpleRun, Stethoscope, HandFist, ForkKnife, Bandaids,
  type Icon,
} from "@phosphor-icons/react";

export type { Icon };

export const ICON_REGISTRY: Record<string, Icon> = {
  // Conhecimento
  BookOpen, Books, Note, NotePencil, Notebook, FileText,
  Archive, Bookmark, Tag, Article, Hash, List,
  // Ciência & Mente
  Brain, Atom, Flask, Microscope, Lightbulb, MagnifyingGlass,
  Eye, ChartLine, Scales, PuzzlePiece, TestTube, Infinity,
  // Tecnologia
  Code, Terminal, Desktop, DeviceMobile, Cpu, Database,
  GitBranch, Robot, Gear, Wrench, Cloud, Bug,
  // Arte & Criação
  PaintBrush, Palette, MusicNote, Camera, FilmStrip, Microphone,
  Pen, Pencil, Image, Scissors, VideoCamera, Aperture,
  // Natureza
  Tree, Leaf, Globe, Fire, Drop, Lightning,
  Sun, Moon, Flower, Mountains, Wind, Planet,
  // Negócios
  Briefcase, ChartBar, Trophy, Rocket, Crown, Key,
  Megaphone, Target, Flag, Compass, Handshake, Certificate,
  // Pessoas & Vida
  User, Users, GraduationCap, Heart, House, Star,
  Smiley, Chat, Phone, Baby, Buildings, Medal,
  // Saúde & Bem-estar
  Heartbeat, Timer, Barbell, Coffee, Shield, FirstAid,
  Pill, PersonSimpleRun, Stethoscope, HandFist, ForkKnife, Bandaids,
};

export const ICON_GROUPS: { label: string; icons: string[] }[] = [
  {
    label: "Conhecimento",
    icons: ["BookOpen","Books","Note","NotePencil","Notebook","FileText","Archive","Bookmark","Tag","Article","Hash","List"],
  },
  {
    label: "Ciência & Mente",
    icons: ["Brain","Atom","Flask","Microscope","Lightbulb","MagnifyingGlass","Eye","ChartLine","Scales","PuzzlePiece","TestTube","Infinity"],
  },
  {
    label: "Tecnologia",
    icons: ["Code","Terminal","Desktop","DeviceMobile","Cpu","Database","GitBranch","Robot","Gear","Wrench","Cloud","Bug"],
  },
  {
    label: "Arte & Criação",
    icons: ["PaintBrush","Palette","MusicNote","Camera","FilmStrip","Microphone","Pen","Pencil","Image","Scissors","VideoCamera","Aperture"],
  },
  {
    label: "Natureza",
    icons: ["Tree","Leaf","Globe","Fire","Drop","Lightning","Sun","Moon","Flower","Mountains","Wind","Planet"],
  },
  {
    label: "Negócios",
    icons: ["Briefcase","ChartBar","Trophy","Rocket","Crown","Key","Megaphone","Target","Flag","Compass","Handshake","Certificate"],
  },
  {
    label: "Pessoas & Vida",
    icons: ["User","Users","GraduationCap","Heart","House","Star","Smiley","Chat","Phone","Baby","Buildings","Medal"],
  },
  {
    label: "Saúde & Bem-estar",
    icons: ["Heartbeat","Timer","Barbell","Coffee","Shield","FirstAid","Pill","PersonSimpleRun","Stethoscope","HandFist","ForkKnife","Bandaids"],
  },
];
