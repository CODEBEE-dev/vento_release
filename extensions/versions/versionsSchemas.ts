import { z, Schema, AutoModel, Protofy } from "protobase";

Protofy("features", {
    "adminPage": "/versions"
})

export const VersionSchema = Schema.object(Protofy("schema", {
    type: z.string().id().search(),
	name: z.string().id().search(),
    date: z.string().id().search(),
    version: z.number().min(0).search()
}))

Protofy("api", {
    "name": "versions",
    "prefix": "/api/core/v1/"
})

export type VersionType = z.infer<typeof VersionSchema>;
export const VersionModel = AutoModel.createDerived<VersionType>("VersionModel", VersionSchema);
