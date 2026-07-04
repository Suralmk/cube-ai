import  {pgTable, text, timestamp, boolean, jsonb, } from "drizzle-orm/pg-core"
import { user } from "./auth.schema";

export const organization = pgTable('organization', {
    id: text('id').primaryKey(),
    ownerId: text('user_id').references(() => user.id, { onDelete: 'cascade' }).unique(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
  });

  export const organizationProfile = pgTable('organization_profile', {
    id: text('id').primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: 'cascade' }).unique(),
    industry: text("industry"),
    website: text("website"),
    logo: text("logo"),
    phone: text("phone"),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    zip: text("zip"),
    country: text("country"),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
  })

  export const organizationSettings = pgTable("organization_settings", {
    id: text('id').primaryKey(),
    organizationId: text("organization_id").references(() => organization.id, { onDelete: 'cascade' }).unique(),
    branding: jsonb("branding"),
    companySlogan: text("company_slogan"),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
  })