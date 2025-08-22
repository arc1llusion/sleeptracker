import { Context } from '@netlify/functions'

import { google, sheets_v4 } from 'googleapis'
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
	let range = params.get('range');
	let values = params.get('values');

	const sql = neon(process.env.NETLIFY_DATABASE_URL ?? '');
	let credentials = await sql`SELECT credentials FROM user_token where email = ${email}`;

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
	oauth.setCredentials(JSON.parse(credentials[0]['credentials']));

	let sheets = google.sheets({version: 'v4', auth: oauth});

	let response = await sheets.spreadsheets.values.update({
		range: range!,
		spreadsheetId: spreadsheetId!,
		valueInputOption: "USER_ENTERED",
		requestBody:
		{
			range: range!,
			majorDimension: "ROWS",
			values: JSON.parse(values!)
		}
	});

	return Response.json({data: []});
}
