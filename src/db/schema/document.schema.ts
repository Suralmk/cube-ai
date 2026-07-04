import { pgTable, text, timestamp, boolean, index, jsonb } from "drizzle-orm/pg-core"
import { user } from "./auth.schema"
import { organization } from "./organization.schema"

export const document  = pgTable('document',{
    id: text('id').primaryKey(),
    uploaded_by: text('uploaded_by').references(() => user.id, { onDelete: 'cascade' }).notNull(),
    organizationId: text("organization_id").references(() => organization.id, { onDelete: 'cascade' }).notNull(),
    title: text("title").notNull(),
    filename:text("filename").notNull(),
    docuemntType: text("docuemnt_type").notNull(),
    s3_key: text("s3_key").notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt:timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date())
}, (table) => [
    index("document_organization_id_idx").on(table.organizationId),
    index("document_uploaded_by_idx").on(table.uploaded_by),
])