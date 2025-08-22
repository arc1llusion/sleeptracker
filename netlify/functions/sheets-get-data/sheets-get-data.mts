import { Context } from '@netlify/functions'

import { google } from 'googleapis'
import { neon } from '@neondatabase/serverless';

export default async (request: Request, context: Context) => {
	let oauth = new google.auth.OAuth2({
		clientId: process.env.GOOGLE_CLIENT_ID,
		clientSecret: process.env.GOOGLE_CLIENT_SECRET,
		redirect_uris: [process.env.GOOGLE_REDIRECT_URI!]
	});

	let url = new URL(request.url);
	let params = new URLSearchParams(url.search);
	let email = params.get('email');
	let spreadsheetId = params.get('spreadsheetId');

	const sql = neon(process.env.NETLIFY_DATABASE_URL ?? '');
	let credentialsRaw = await sql`SELECT credentials FROM user_token where email = ${email}`;
	let credentials = JSON.parse(credentialsRaw[0]['credentials']);

	oauth.on('tokens', async (tokens) => 
	{
		console.log('refreshed tokens');

		let records = await sql`SELECT email FROM user_token WHERE email = ${email};`
		let newCredentials = JSON.stringify(tokens);

		if(records.length > 0) 
		{
			await sql`UPDATE user_token SET credentials = ${newCredentials} WHERE email = ${email}`;
		} 
		else 
		{
			await sql`INSERT INTO user_token(email, credentials) VALUES(${email}, ${newCredentials});`;
		}
	});

	oauth.setCredentials(credentials);

	let sheets = google.sheets({version: 'v4', auth: oauth});

	try {
		let response = await sheets.spreadsheets.values.get({
			range: "A:C",
			majorDimension: "ROWS",
			spreadsheetId: spreadsheetId!
		});

		return Response.json({data: response.data.values});
	}
	catch(e)
	{
		console.log('error', e);

		return Response.json({error: "Could not get sheet data.", clear: true}, { status: 401 })
	}
}
