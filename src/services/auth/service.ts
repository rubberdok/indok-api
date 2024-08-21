import type { FastifyRequest } from "fastify";
import {
	type TokenSet,
	type UserinfoResponse,
	generators,
} from "openid-client";
import { env } from "~/config.js";
import {
	AuthenticationError,
	BadRequestError,
	DownstreamServiceError,
	InternalServerError,
	UnauthorizedError,
} from "~/domain/errors.js";
import type { StudyProgram, User } from "~/domain/users.js";
import { Result, type ResultAsync, type TResult } from "~/lib/result.js";
import { isValidRedirectUrl } from "~/utils/validate-redirect-url.js";

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
	): Promise<{ body?: Buffer }>;
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
		phoneNumber?: string;
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
			confirmedStudyProgramId: string | null;
			enrolledStudyPrograms: StudyProgram[] | null;
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
		private feideGroupsApi: URL = new URL(env.FEIDE_GROUPS_API),
	) {}

	/**
	 * authorizationUrl returns the url to redirect the user to in order to authenticate with the OpenID Provider
	 * which in our case (for now) is Feide. For Feide, we use the Authorization Code Flow with proof key for code exchange (PKCE).
	 * This means that we generate a code verifier, and a code challenge based on the code verifier. The challenge is
	 * sent to the OpenID Provider, and the verifier is stored in the session. When the user is redirected back to us, we
	 * send the verifier along with the code, and the OpenID Provider will verify that the verifier matches the challenge.
	 */
	generateAuthorizationUrl(
		req: FastifyRequest,
		params: {
			redirectUri: "/auth/login/callback" | "/auth/study-program/callback";
			returnTo?: string;
		},
	): TResult<
		{ authorizationUrl: string },
		InternalServerError | BadRequestError
	> {
		const { codeVerifier, codeChallenge } = this.pkce();
		req.session.set("codeVerifier", codeVerifier);
		let returnToUrl: URL | undefined = undefined;
		if (params.returnTo) {
			const validationResult = isValidRedirectUrl(params.returnTo);
			if (validationResult.ok) {
				returnToUrl = validationResult.data.url;
			} else {
				return Result.error(new BadRequestError("Invalid returnTo url"));
			}
		}

		try {
			const url = this.openIDClient.authorizationUrl({
				scope: this.scope,
				code_challenge_method: "S256",
				code_challenge: codeChallenge,
				redirect_uri: `${env.SERVER_URL}${params.redirectUri}`,
				state: returnToUrl?.toString(),
			});
			return Result.success({ authorizationUrl: url });
		} catch (err) {
			return Result.error(
				new InternalServerError("Failed to generate authorization url", err),
			);
		}
	}

	async getAuthorizationToken(
		req: FastifyRequest,
		params: {
			code: string;
			redirectUri: "/auth/login/callback" | "/auth/study-program/callback";
		},
	): ResultAsync<
		{ token: TokenSet },
		DownstreamServiceError | BadRequestError
	> {
		const codeVerifier = req.session.get("codeVerifier");
		if (!codeVerifier) {
			return Result.error(
				new BadRequestError("No code verifier found in session"),
			);
		}

		try {
			const tokenset = await this.openIDClient.callback(
				`${env.SERVER_URL}${params.redirectUri}`,
				{ code: params.code },
				{ code_verifier: codeVerifier },
			);
			return Result.success({ token: tokenset });
		} catch (err) {
			return Result.error(
				new DownstreamServiceError(
					"Failed to get token from OpenID Provider",
					err,
				),
			);
		}
	}

	async getUserInfo(
		req: FastifyRequest,
		params: { token: TokenSet },
	): ResultAsync<
		{ userInfo: UserinfoResponse<FeideUserInfo> },
		DownstreamServiceError
	> {
		req.log.info("Fetching userinfo from OIDC provider");
		try {
			const userinfo = await this.openIDClient.userinfo(params.token);
			return Result.success({ userInfo: userinfo });
		} catch (err) {
			return Result.error(
				new DownstreamServiceError("Failed to fetch userinfo", err),
			);
		}
	}

	async getOrCreateUser(
		req: FastifyRequest,
		{ userInfo }: { userInfo: UserinfoResponse<FeideUserInfo> },
	): ResultAsync<
		{ user: User },
		InternalServerError | AuthenticationError | DownstreamServiceError
	> {
		const {
			sub,
			name,
			email,
			"https://n.feide.no/claims/userid_sec": userid_sec,
			"https://n.feide.no/claims/eduPersonPrincipalName": ntnuId,
			phone_number: phoneNumber,
		} = userInfo;
		const existingUser = await this.userService.getByFeideID(sub);
		if (existingUser) {
			req.log?.info(
				{
					userId: existingUser.id,
				},
				"User already exists",
			);
			return Result.success({ user: existingUser });
		}

		req.log?.info({ sub: userInfo.sub }, "Creating new user");

		let eduUsername: string;
		if (ntnuId) {
			eduUsername = ntnuId.slice(0, ntnuId.indexOf("@"));
		} else {
			const feideUserIdSec = userid_sec.find((id) => id.startsWith("feide:"));
			if (!feideUserIdSec)
				return Result.error(
					new AuthenticationError(
						`No username found for user with feideId ${sub}`,
					),
				);
			eduUsername = feideUserIdSec.slice(
				feideUserIdSec.indexOf(":") + 1,
				feideUserIdSec.indexOf("@"),
			);
		}

		const [firstName, lastName] = name.split(" ");
		const user = await this.userService.create({
			email,
			firstName: firstName ?? "",
			lastName: lastName ?? "",
			feideId: sub,
			username: eduUsername,
			phoneNumber,
		});

		return Result.success({ user });
	}

	async updateStudyProgramForUser(
		req: FastifyRequest,
		params: { token: TokenSet },
	): ResultAsync<
		{ studyProgram: StudyProgram | null },
		DownstreamServiceError | UnauthorizedError
	> {
		const userId = req.session.get("userId");
		if (!userId) {
			return Result.error(
				new UnauthorizedError(
					"You need to be logged in to perform this action",
				),
			);
		}
		req.log.info("fetching study programs");
		const groupsApiResponse = await this.openIDClient.requestResource(
			this.feideGroupsApi,
			params.token,
		);

		if (!groupsApiResponse.body) return Result.success({ studyProgram: null });

		const groups: FeideGroup[] = JSON.parse(groupsApiResponse.body.toString());
		const feideGroups = groups.filter((group) => {
			const isAtNtnu = group.parent === "fc:org:ntnu.no";
			const isStudyProgram = group.type === "fc:fs:prg";
			const isActive = group.membership.active;

			return isAtNtnu && isStudyProgram && isActive;
		});
		req.log.info({ studyPrograms: feideGroups.length }, "study programs");

		const studyPrograms: StudyProgram[] = [];
		for (const group of feideGroups) {
			let studyProgram = await this.userService.getStudyProgram({
				externalId: group.id,
			});
			if (!studyProgram) {
				req.log.info({ studyProgram: group }, "found new study program");
				studyProgram = await this.userService.createStudyProgram({
					name: group.displayName,
					externalId: group.id,
				});
			}
			studyPrograms.push(studyProgram);
		}

		const bestGuessStudyProgram = studyPrograms[0];
		if (!bestGuessStudyProgram) return Result.success({ studyProgram: null });

		await this.userService.update(userId, {
			confirmedStudyProgramId: bestGuessStudyProgram.id,
			enrolledStudyPrograms: studyPrograms,
		});

		return Result.success({ studyProgram: bestGuessStudyProgram });
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
		await req.session.regenerate([]);
		req.session.set("userId", user.id);
		const updatedUser = await this.userService.login(user.id);
		req.log.info({ userId: user.id }, "User logged in");
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
		if (req.session.get("userId")) {
			await req.session.destroy();
			return;
		}
		throw new UnauthorizedError(
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
