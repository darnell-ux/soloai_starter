// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			session?: Record<string, unknown>;
			user?: Record<string, unknown>;
		}
		interface PageData {
			authSession?: 'signed-in' | 'signed-out';
			/** A08: fade/slide route transitions when PUBLIC_PAGE_TRANSITIONS_ENABLED=true */
			pageTransitionsEnabled?: boolean;
			analytics?: {
				gtmContainerId: string;
				locale: string;
				isUsLocale: boolean;
				privacyPolicyHref: string;
				user_id_hash: string | null;
				subscription_tier: string | null;
				payment_provider: string | null;
			};
			hero?: import('$lib/server/homepage-hero').HeroContent;
			featureItems?: import('$lib/server/strapi/homepage-content').FeaturePreviewItem[];
			landingSignup?: import('$lib/server/strapi/homepage-content').LandingSignupCta | null;
			cmsSeo?: import('$lib/server/strapi/homepage-content').LandingCmsSeo | null;
			faqGroups?: import('$lib/server/strapi/faqs').FaqGroup[];
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
