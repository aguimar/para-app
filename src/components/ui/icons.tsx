"use client";

// Re-export all Phosphor icons used across the app through a client boundary.
// Server components must import icons from here, NOT directly from @phosphor-icons/react,
// because Phosphor uses createContext internally which can't run on the server.
export {
  Archive,
  ArrowLeft,
  ArrowSquareOut,
  ArrowsClockwise,
  Books,
  CircleNotch,
  DotsSixVertical,
  FloppyDisk,
  Folder,
  House,
  Info,
  Link,
  List,
  PencilSimple,
  Plus,
  Rocket,
  SquaresFour,
  Trash,
  Tray,
  TreeStructure,
  UploadSimple,
  X,
} from "@phosphor-icons/react";
