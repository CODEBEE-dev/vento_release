import { z, Schema, AutoModel } from "protobase";

export const GroupSchema = Schema.object({
  name: z.string()
    .label('name')
    .hint('admin, developer, operator, ...')
    .static()
    .id()
    .search()
    .help('Unique group name. Use predefined roles or create custom ones.'),

  // If true, adds "*" permission (full access). For backward compatibility.
  admin: z.boolean().optional().default(false),

  // Granular permissions. Format: resource.operation
  // Available presets: admin, user, viewer
  permissions: z.array(z.string()).optional().default([]),
})

export type GroupType = z.infer<typeof GroupSchema>;
export const GroupModel = AutoModel.createDerived<GroupType>("GroupModel", GroupSchema);
