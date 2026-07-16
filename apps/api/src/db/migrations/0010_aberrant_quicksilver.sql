CREATE INDEX "card_shares_shared_with_idx" ON "card_shares" USING btree ("shared_with");--> statement-breakpoint
CREATE INDEX "cards_owner_active_idx" ON "cards" USING btree ("owner_id","is_active");--> statement-breakpoint
CREATE INDEX "invitations_invitee_email_status_idx" ON "invitations" USING btree ("invitee_email","status");--> statement-breakpoint
CREATE INDEX "invitations_invited_by_idx" ON "invitations" USING btree ("invited_by");--> statement-breakpoint
CREATE INDEX "public_shares_card_idx" ON "public_shares" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "refresh_tokens_family_idx" ON "refresh_tokens" USING btree ("family_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_idx" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_lower_idx" ON "users" USING btree (lower("username"));
