import type { IncomingMessage } from "http";
import type { FastifyRequest } from "fastify";
import type { TokenSet, UserinfoResponse } from "openid-client";
import { generators } from "openid-client";
import { env } from "~/config.js";
import {
	AuthenticationError,
	BadRequestError,
	NotFoundError,
	UnauthorizedError,
} from "~/domain/errors.js";
import type { StudyProgram, User } from "~/domain/users.js";
import type { Context } from "../../lib/context.js";

export interface OpenIDClient {
	authorizationUrl(options: {
		scope: string;
		code_challenge_method: string;
		code_challenge: string;
		state?: string;
		redirect_uri?: string;
	}): string;
	callback(
		redirectUrl: string,
		params: { code: string },
		options: { code_verifier: string },
	): Promise<TokenSet>;
	requestResource(
		resourceUrl: URL,
		accessToken: TokenSet,
	): Promise<{ body?: Buffer } & IncomingMessage>;
	userinfo(
		tokenSet: TokenSet,
	): Promise<UserinfoResponse<FeideUserInfo, Record<string, never>>>;
}

export interface UserService {
	create(data: {
		email: string;
		firstName: string;
		lastName: string;
		feideId: string;
		username: string;
	}): Promise<User>;
	login(id: string): Promise<User>;
	getByFeideID(feideId: string): Promise<User | null>;
	update(
		id: string,
		data: Partial<{
			firstName: string | null;
			lastName: string | null;
			graduationYear: number | null;
			allergies: string | null;
			phoneNumber: string | null;
			studyProgramId: string | null;
		}>,
	): Promise<User>;
	get(id: string): Promise<User>;
	getStudyProgram(
		by: { id: string } | { externalId: string },
	): Promise<StudyProgram | null>;
	createStudyProgram(studyProgram: {
		name: string;
		externalId: string;
	}): Promise<StudyProgram>;
}

export interface FeideUserInfo {
	name: string;
	email: string;
	"https://n.feide.no/claims/eduPersonPrincipalName"?: string;
	"https://n.feide.no/claims/userid_sec": string[];
}

export class AuthService {
	private scope = [
		"openid",
		"userid",
		"userid-feide",
		"userinfo-name",
		"email",
		"groups-edu",
	].join(" ");

	constructor(
		private userService: UserService,
		private openIDClient: OpenIDClient,
		private callbackUrlMapping: Record<
			"login" | "studyProgram",
			string | URL
		> = {
			login: new URL("/auth/authenticate", env.SERVER_URL),
			studyProgram: new URL("/auth/study-program", env.SERVER_URL),
		},
		private feideGroupsApi: URL = new URL(env.FEIDE_GROUPS_API),
	) {}

	/**
	 * authorizationUrl returns the url to redirect the user to in order to authenticate with the OpenID Provider
	 * which in our case (for now) is Feide. For Feide, we use the Authorization Code Flow with proof key for code exchange (PKCE).
	 * This means that we generate a code verifier, and a code challenge based on the code verifier. The challenge is
	 * sent to the OpenID Provider, and the verifier is stored in the session. When the user is redirected back to us, we
	 * send the verifier along with the code, and the OpenID Provider will verify that the verifier matches the challenge.
	 *
	 * @param req - the fastify request
	 * @param postAuthorizationRedirectUrl - the url to redirect the user to after authentication is complete
	 * @returns the url to redirect the user to
	 */
	authorizationUrl(
		req: FastifyRequest,
		postAuthorizationRedirectUrl?: string | null,
		kind: "login" | "studyProgram" = "login",
	): string {
		const { codeVerifier, codeChallenge } = this.pkce();
		req.session.set("codeVerifier", codeVerifier);

		const url = this.openIDClient.authorizationUrl({
			scope: this.scope,
			code_challenge_method: "S256",
			code_challenge: codeChallenge,
			state: postAuthorizationRedirectUrl ?? undefined,
			redirect_uri: this.callbackUrlMapping[kind].toString(),
		});

		return url;
	}

	/**
	 * authorizationCallback is the callback handler for the OpenID Provider. Using the code, we will fetch
	 * an access token and an id token from the OpenID Provider. The id token contains information about the user,
	 * and we use this to create a new user in our database if it does not already exist.
	 *
	 * The openid-client library handles JWT verification of the ID token for us. The access token is used to fetch
	 * additional information about the user from the OpenID Provider.
	 *
	 * When making the access token request, we send the code verifier along with the code. The OpenID Provider will
	 * verify that the verifier matches the challenge.
	 *
	 * If the user already exists, we return the user without changes.
	 *
	 * @throws {BadRequestError} - if no code verifier is found in the session
	 * @throws {AuthenticationError} - if no username is found for the user.
	 * @param req - the fastify request
	 * @param params.code - the authorization code from the OpenID Provider as a result of the user authenticating
	 * @returns the user
	 */
	async studyProgramCallback(
		req: FastifyRequest,
		params: { code: string },
	): Promise<User> {
		const codeVerifier = req.session.get("codeVerifier");
		if (!codeVerifier) throw new BadRequestError("No code verifier found");

		const { code } = params;

		const tokenSet = await this.openIDClient.callback(
			this.callbackUrlMapping.studyProgram.toString(),
			{
				code,
			},
			{
				code_verifier: codeVerifier,
			},
		);

		const userInfo = await this.openIDClient.userinfo(tokenSet);

		const user = await this.userService.getByFeideID(userInfo.sub);
		if (user === null) {
			throw new NotFoundError("User not found, use /login?kind=login instead");
		}

		const ctx = {
			user,
			log: req.log,
		};

		const studyProgram = await this.getStudyProgramForUser(ctx, tokenSet);

		if (ctx.user.studyProgramId === studyProgram?.id) return ctx.user;

		const updatedUser = await this.userService.update(ctx.user.id, {
			studyProgramId: studyProgram?.id,
		});

		return updatedUser;
	}

	private async getStudyProgramForUser(
		ctx: Context,
		accessToken: TokenSet,
	): Promise<StudyProgram | null> {
		if (!ctx.user) throw new UnauthorizedError("Not logged in");

		ctx.log.info({ userId: ctx.user.id }, "fetching study programs");
		const groupsApiResponse = await this.openIDClient.requestResource(
			this.feideGroupsApi,
			accessToken,
		);

		if (!groupsApiResponse.body) return null;

		const groups: FeideGroup[] = JSON.parse(groupsApiResponse.body.toString());
		const studyPrograms = groups.filter((group) => {
			const isAtNtnu = group.parent === "fc:org:ntnu.no";
			const isStudyProgram = group.type === "fc:fs:prg";
			const isActive = group.membership.active;

			return isAtNtnu && isStudyProgram && isActive;
		});

		ctx.log.info({ studyPrograms: studyPrograms.length }, "study programs");
		const bestGuessStudyProgram = studyPrograms[0];
		if (!bestGuessStudyProgram) return null;

		const studyProgram = await this.userService.getStudyProgram({
			externalId: bestGuessStudyProgram.id,
		});
		if (studyProgram) return studyProgram;

		ctx.log.info(
			{ studyProgram: bestGuessStudyProgram },
			"found new study program",
		);
		const newStudyProgram = await this.userService.createStudyProgram({
			name: bestGuessStudyProgram.displayName,
			externalId: bestGuessStudyProgram.id,
		});
		return newStudyProgram;
	}

	/**
	 * userLoginCallback is the callback handler for the OpenID Provider. Using the code, we will fetch
	 * an access token and an id token from the OpenID Provider. The id token contains information about the user,
	 * and we use this to create a new user in our database if it does not already exist.
	 *
	 * The openid-client library handles JWT verification of the ID token for us. The access token is used to fetch
	 * additional information about the user from the OpenID Provider.
	 *
	 * When making the access token request, we send the code verifier along with the code. The OpenID Provider will
	 * verify that the verifier matches the challenge.
	 *
	 * If the user already exists, we return the user without changes.
	 *
	 * @throws {BadRequestError} - if no code verifier is found in the session
	 * @throws {AuthenticationError} - if no username is found for the user.
	 * @param req - the fastify request
	 * @param params.code - the authorization code from the OpenID Provider as a result of the user authenticating
	 * @returns the user
	 */
	async userLoginCallback(
		req: FastifyRequest,
		params: { code: string },
	): Promise<User> {
		const codeVerifier = req.session.get("codeVerifier");
		if (!codeVerifier)
			throw new BadRequestError("No code verifier found in session");

		const { code } = params;

		req.log?.info("Fetching access token");
		const tokenSet = await this.openIDClient.callback(
			this.callbackUrlMapping.login.toString(),
			{
				code,
			},
			{
				code_verifier: codeVerifier,
			},
		);

		req.log?.info("Fetching user info");
		const {
			sub,
			name,
			email,
			"https://n.feide.no/claims/userid_sec": userid_sec,
			"https://n.feide.no/claims/eduPersonPrincipalName": ntnuId,
		} = await this.openIDClient.userinfo(tokenSet);
		req.log?.info({ sub }, "Fetched user info");

		const existingUser = await this.userService.getByFeideID(sub);
		if (existingUser) {
			req.log?.info(
				{
					userId: existingUser.id,
				},
				"User already exists",
			);
			return existingUser;
		}

		req.log?.info({ sub }, "Creating new user");

		let eduUsername: string;
		if (ntnuId) {
			eduUsername = ntnuId.slice(0, ntnuId.indexOf("@"));
		} else {
			const feideUserIdSec = userid_sec.find((id) => id.startsWith("feide:"));
			if (!feideUserIdSec)
				throw new AuthenticationError(
					`No username found for user with feideId ${sub}`,
				);
			eduUsername = feideUserIdSec.slice(
				feideUserIdSec.indexOf(":") + 1,
				feideUserIdSec.indexOf("@"),
			);
		}

		const [firstName, lastName] = name.split(" ");
		let user = await this.userService.create({
			email,
			firstName: firstName ?? "",
			lastName: lastName ?? "",
			feideId: sub,
			username: eduUsername,
		});

		req.log.info("fetching study program");
		const studyProgram = await this.getStudyProgramForUser(
			{ user, log: req.log },
			tokenSet,
		);

		if (studyProgram) {
			user = await this.userService.update(user.id, {
				studyProgramId: studyProgram.id,
			});
		}
		return user;
	}

	/**
	 * pkce generates a code verifier and a code challenge based on the code verifier.
	 *
	 * @returns the code verifier and the code challenge
	 */
	private pkce(): { codeVerifier: string; codeChallenge: string } {
		const codeVerifier = generators.codeVerifier();
		const codeChallenge = generators.codeChallenge(codeVerifier);

		return { codeVerifier, codeChallenge };
	}

	/**
	 * login logs in the user by setting the authenticated flag in the session to true, and setting the userId in the session.
	 * It also regenerates the session to prevent session fixation attacks.
	 *
	 * @param req - the fasitfy request
	 * @param user - the user to log in
	 * @returns
	 */
	async login(req: FastifyRequest, user: User): Promise<User> {
		req.session.set("authenticated", true);
		req.session.set("userId", user.id);
		await req.session.regenerate(["authenticated", "userId"]);
		const updatedUser = await this.userService.login(user.id);
		return updatedUser;
	}

	/**
	 * logout logs out the user by destroying the session.
	 *
	 * @throws {AuthenticationError} - if the user is not logged in
	 * @param req - the fastify request
	 * @returns
	 */
	async logout(req: FastifyRequest): Promise<void> {
		if (req.session.get("authenticated")) {
			await req.session.destroy();
			return;
		}
		throw new AuthenticationError(
			"You need to be logged in to perform this action.",
		);
	}
}

type FeideGroup = {
	id: string;
	type: string;
	displayName: string;
	membership: {
		basic: string;
		active: boolean;
		displayName: string;
		fsroles: string[];
	};
	parent: string;
};
