export type ActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fields?: Record<string, string[]>;
};

export const initialActionState: ActionState = { status: "idle" };
