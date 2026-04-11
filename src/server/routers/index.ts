import { router } from "../trpc";
import { workspaceRouter } from "./workspace";
import { projectRouter } from "./project";
import { areaRouter } from "./area";
import { resourceRouter } from "./resource";
import { archiveRouter } from "./archive";
import { noteRouter } from "./note";
import { attachmentRouter } from "./attachment";
import { userRouter } from "./user";
import { commentRouter } from "./comment";
import { searchRouter } from "./search";
import { contactsRouter } from "./contacts";

export const appRouter = router({
  user: userRouter,
  workspace: workspaceRouter,
  project: projectRouter,
  area: areaRouter,
  resource: resourceRouter,
  archive: archiveRouter,
  note: noteRouter,
  attachment: attachmentRouter,
  comment: commentRouter,
  search: searchRouter,
  contacts: contactsRouter,
});

export type AppRouter = typeof appRouter;
