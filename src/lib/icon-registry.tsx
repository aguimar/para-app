"use client";

import * as Phosphor from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

export type { Icon };

// Build registry from every Phosphor export.
// Keep only the primary components (skip the "Icon"-suffixed duplicates).
const FORWARD_REF = Symbol.for("react.forward_ref");

// Phosphor also exports non-icon internals (IconBase, IconContext) — exclude them
const NON_ICONS = new Set(["Icon", "IconBase", "IconContext", "SSRBase"]);

export const ICON_REGISTRY: Record<string, Icon> = Object.fromEntries(
  Object.entries(Phosphor as Record<string, unknown>).filter(
    ([key, val]) =>
      typeof val === "object" &&
      val !== null &&
      (val as any).$$typeof === FORWARD_REF &&
      /^[A-Z]/.test(key) &&
      !key.endsWith("Icon") &&
      !NON_ICONS.has(key)
  )
) as Record<string, Icon>;

// Curated category tabs — shown when not searching
export const ICON_GROUPS: { label: string; icons: string[] }[] = [
  {
    label: "Conhecimento",
    icons: [
      "BookOpen","Books","Note","NotePencil","Notebook","FileText",
      "Archive","Bookmark","Tag","Article","Hash","List",
      "NoteBlank","FolderOpen","Newspaper","Quotes","Files","AlignLeft",
      "Folder","PaperclipHorizontal","ReadCvLogo","BookBookmark",
      "BookOpenText","FileMagnifyingGlass","MagnifyingGlassPlus",
      "Notepad","Bookmarks","ListBullets","ListNumbers","TextT",
    ],
  },
  {
    label: "Ciência & Mente",
    icons: [
      "Brain","Atom","Flask","Microscope","Lightbulb","MagnifyingGlass",
      "Eye","ChartLine","Scales","PuzzlePiece","TestTube","Infinity",
      "Binoculars","Function","Sigma","Calculator","Question","Dna",
      "Comet","Planet","Asterisk","Lightning","Divide","Pi",
      "Intersect","Subset","CircleDashed","Hexagon","Triangle",
    ],
  },
  {
    label: "Tecnologia",
    icons: [
      "Code","Terminal","Desktop","DeviceMobile","Cpu","Database",
      "GitBranch","Robot","Gear","Wrench","Cloud","Bug",
      "WifiHigh","Bluetooth","HardDrive","Keyboard","Mouse","Broadcast",
      "MonitorPlay","Download","GitCommit","GitFork","GitMerge","GitPullRequest",
      "GithubLogo","StackSimple","Stack","Cube","CubeFocus","Package",
      "Plugs","PlugsConnected","WebhooksLogo","Webhook","CodeBlock","CodeSimple",
    ],
  },
  {
    label: "Arte & Criação",
    icons: [
      "PaintBrush","Palette","MusicNote","Camera","FilmStrip","Microphone",
      "Pen","Pencil","Image","Scissors","VideoCamera","Aperture",
      "PenNib","Headphones","GameController","Confetti","Sparkle",
      "MusicNotes","Radio","Presentation","PaintRoller","Eyedropper",
      "FrameCorners","Crop","Swatches","Textbox","TextAlignLeft",
      "Article","Columns","Layout","GridFour",
    ],
  },
  {
    label: "Natureza",
    icons: [
      "Tree","Leaf","Globe","Fire","Drop","Lightning",
      "Sun","Moon","Flower","Mountains","Wind","Planet",
      "Snowflake","Waves","Bird","Fish","PawPrint","CloudRain",
      "CloudSun","CloudMoon","CloudLightning","CloudSnow",
      "Rainbow","Sunset","Thermometer","Umbrella","Acorn",
      "Cactus","Butterfly","Bug","Mushroom","Plant",
    ],
  },
  {
    label: "Negócios",
    icons: [
      "Briefcase","ChartBar","Trophy","Rocket","Crown","Key",
      "Megaphone","Target","Flag","Compass","Handshake","Certificate",
      "Medal","ChartPie","CurrencyDollar","Bank","ShoppingCart",
      "Package","Stamp","CreditCard","ChartDonut","Trend",
      "TrendUp","TrendDown","CurrencyEur","CurrencyBtc",
      "Percent","Invoice","Receipt","Money","Wallet",
    ],
  },
  {
    label: "Pessoas & Vida",
    icons: [
      "User","Users","GraduationCap","Heart","House","Star",
      "Smiley","Chat","Phone","Baby","Buildings","Bed",
      "Car","Airplane","Train","MapPin","Clock","Calendar",
      "SmileyWink","Alarm","Chats","ChatText","PhoneCall",
      "EnvelopeSimple","AddressBook","UserCircle","UserPlus",
      "UsersThree","Lifebuoy","Umbrella",
    ],
  },
  {
    label: "Saúde & Bem-estar",
    icons: [
      "Heartbeat","Timer","Barbell","Coffee","Shield","FirstAid",
      "Pill","PersonSimpleRun","Stethoscope","HandFist","ForkKnife","Bandaids",
      "Bicycle","Thermometer","Grains","PersonSimpleWalk",
      "PersonSimpleSwim","PersonSimpleBike","PersonArmsSpread",
      "HandHeart","AppleLogo","Orange","Carrot","Bowl","Drop",
    ],
  },
];
