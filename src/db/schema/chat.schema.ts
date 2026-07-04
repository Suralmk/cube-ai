import { pgTable, text, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core"
import { organization } from "./organization.schema"
import { user } from "./auth.schema"

export const chatSession = pgTable("chat_session", {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").references(() => organization.id),
    userId: text("user_id").references(() => user.id),
    title: text("title").notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt:timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date())
}) 

export const chatMessage = pgTable("chat_message", {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").references(() => organization.id),
    userId: text("user_id").references(() => user.id),
    sessionId: text("session_id").references(() => chatSession.id, { onDelete: 'cascade' }),
    content: text("content").notNull(),
    role: text("role").notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt:timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
    index("chat_message_organization_id_idx").on(table.organizationId),
    index("chat_message_session_id_idx").on(table.sessionId),
])

// citation schema for chat messages