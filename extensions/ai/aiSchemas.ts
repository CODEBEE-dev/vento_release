import { z, Schema, AutoModel, Protofy } from "protobase";

// System description schema (data/systems/*.md)
export const SystemSchema = Schema.object(Protofy("schema", {
    name: z.string().id().search(),
    content: z.string()
}))

Protofy("api", {
    "name": "systems",
    "prefix": "/api/core/v1/"
})

export type SystemType = z.infer<typeof SystemSchema>;
export const SystemModel = AutoModel.createDerived<SystemType>("SystemModel", SystemSchema);

// Plan schema (data/plans/*.md)
export const PlanSchema = Schema.object(Protofy("schema", {
    name: z.string().id().search(),
    content: z.string()
}))

Protofy("api", {
    "name": "plans",
    "prefix": "/api/core/v1/"
})

export type PlanType = z.infer<typeof PlanSchema>;
export const PlanModel = AutoModel.createDerived<PlanType>("PlanModel", PlanSchema);
