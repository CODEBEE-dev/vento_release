import { AutoModel, Schema, z, Protofy } from 'protobase'

Protofy("features", {
    "adminPage": "/boards"
})

export const CardSchema = Schema.object({
    name: z.string().id(),
    label: z.string().optional(),
    type: z.string(),
    settings: z.any().optional(),
    description: z.string().optional(),
    rules: z.array(z.string()).optional(),
    params: z.record(z.string(), z.any()).optional(),
    content: z.string().optional(),
    // Ephemeral state settings
    stateMode: z.enum(['default', 'ephemeral', 'non-ephemeral']).optional(),
    chainTerminator: z.boolean().optional()
})

export type CardType = z.infer<typeof CardSchema>;
export const CardModel = AutoModel.createDerived<CardType>("CardModel", CardSchema);

export const BoardSchema = Schema.object(Protofy("schema", {
    name: z.string().hint("room, system, controller, ...").regex(/^[a-z0-9_]+$/, "Only lower case chars, numbers or _").static().id(),
    layouts: z.any().optional().hidden(),
    cards: z.array(CardSchema).optional().hidden(),
    rules: z.array(z.string()).optional().hidden(),
    userPermissions: z.enum(['r', 'rw']).optional(),
    // Ephemeral state: controls default stateMode for cards with stateMode='default'
    ephemeral: z.boolean().optional(),
}))

Protofy("api", {
    "name": "boards",
    "prefix": "/api/core/v1/"
})

export type BoardType = z.infer<typeof BoardSchema>;
export const BoardModel = AutoModel.createDerived<BoardType>("BoardModel", BoardSchema);
