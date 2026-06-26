import { createContext, useContext } from "react";

interface WorkspaceContextValue {
  refresh: () => void | Promise<void>;
}

export const WorkspaceContext = createContext<WorkspaceContextValue>({
  refresh: () => {},
});

export const useWorkspace = () => useContext(WorkspaceContext);
