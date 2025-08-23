import { Context } from '@netlify/functions'
import { google } from 'googleapis';
import { neon } from '@neondatabase/serverless';

export default async (request: Request, context: Context) => {

	let oauth = new google.auth.OAuth2({
		clientId: process.env.GOOGLE_CLIENT_ID,
		clientSecret: process.env.GOOGLE_CLIENT_SECRET,
		redirect_uris: [process.env.GOOGLE_REDIRECT_URI!]
	});

	let url = new URL(request.url);
	let params = new URLSearchParams(url.search);
	let code = params.get('code');

	const result = await oauth.getToken(code!);
	oauth.setCredentials(result.tokens);

	console.log('included scopes', result.tokens.scope);

	let promise = new Promise<string | null | undefined>((resolve, reject) => {
		google.oauth2('v2').userinfo.get({
			auth: oauth
		}, (err, data) => {
			if(data)
			{
				resolve(data.data.email);
			}

			if(err) {
				reject(JSON.stringify(err));
			}
		})
	});

	const sql = neon(process.env.NETLIFY_DATABASE_URL ?? '');

	let email = await promise;
	let credentials = JSON.stringify(result.tokens);

	let records = await sql`SELECT email FROM user_token WHERE email = ${email};`

	if(records.length > 0) 
	{
		await sql`UPDATE user_token SET credentials = ${credentials} WHERE email = ${email}`;
	} 
	else 
	{
		await sql`INSERT INTO user_token(email, credentials) VALUES(${email}, ${credentials});`;
	}

	return Response.redirect(url.protocol + "//" + url.host + '?email=' + email);
}
