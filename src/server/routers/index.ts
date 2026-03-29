import { router } from "../trpc";
import { workspaceRouter } from "./workspace";
import { projectRouter } from "./project";
import { areaRouter } from "./area";
import { resourceRouter } from "./resource";
import { archiveRouter } from "./archive";
import { noteRouter } from "./note";
import { attachmentRouter } from "./attachment";
import { userRouter } from "./user";

export const appRouter = router({
  user: userRouter,
  workspace: workspaceRouter,
  project: projectRouter,
  area: areaRouter,
  resource: resourceRouter,
  archive: archiveRouter,
  note: noteRouter,
  attachment: attachmentRouter,
});

export type AppRouter = typeof appRouter;
