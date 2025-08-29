import { Context } from '@netlify/functions'

import { google, sheets_v4 } from 'googleapis'
import { neon, NeonQueryFunction } from '@neondatabase/serverless';

export default async (request: Request, context: Context) => 
{
	let oauth = new google.auth.OAuth2({
		clientId: process.env.GOOGLE_CLIENT_ID,
		clientSecret: process.env.GOOGLE_CLIENT_SECRET,
		redirect_uris: [process.env.GOOGLE_REDIRECT_URI!]
	});

	let url = new URL(request.url);
	let params = new URLSearchParams(url.search);
	let email = params.get('email');

	if(!email)
	{
		return Response.json({error: "Email must be provided.", clear: true}, { status: 400 })
	}

	const sql = neon(process.env.NETLIFY_DATABASE_URL ?? '');
	let credentials = await sql`SELECT credentials FROM user_token where email = ${email}`;

	console.log('email:', email);
	console.log('number of results: ', credentials.length);
	
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

	let spreadsheetId = await getOrCreateSpreadsheet(oauth, sql, email);

	return Response.json({spreadsheetId: spreadsheetId});
}

async function getOrCreateSpreadsheet(oauth: any, sql: NeonQueryFunction<false, false>, email: string) : Promise<string | null>
{
	let results = await sql`SELECT spreadsheetId FROM user_spreadsheet WHERE email = ${email};`

	if(results.length == 0) {
		let sheets = google.sheets({version: 'v4', auth: oauth});
		try {
			let createResponse = await sheets.spreadsheets.create({
				requestBody: {
					properties: {
						title: 'Sleep Tracker'
					}
				}
			});

			if(createResponse.data.spreadsheetId)
			{
				await sql`INSERT INTO user_spreadsheet(email, spreadsheetId) VALUES(${email}, ${createResponse.data.spreadsheetId});`
			}
			
			return createResponse.data.spreadsheetId ?? null;
		}
		catch(e)
		{
			return null;
		}
	}

	console.log(results);

	return results[0]['spreadsheetid'];
}