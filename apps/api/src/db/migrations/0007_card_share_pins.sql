CREATE TABLE "card_share_pins" (
	"user_id" uuid NOT NULL,
	"share_id" uuid NOT NULL,
	CONSTRAINT "card_share_pins_user_id_share_id_pk" PRIMARY KEY("user_id","share_id")
);
--> statement-breakpoint
ALTER TABLE "card_share_pins" ADD CONSTRAINT "card_share_pins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_share_pins" ADD CONSTRAINT "card_share_pins_share_id_card_shares_id_fk" FOREIGN KEY ("share_id") REFERENCES "public"."card_shares"("id") ON DELETE cascade ON UPDATE no action;
