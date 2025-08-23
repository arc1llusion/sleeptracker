import { Context } from '@netlify/functions'

import { google, sheets_v4 } from 'googleapis'
import { neon } from '@neondatabase/serverless';

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

	let drive = google.drive({version: 'v3', auth: oauth});
	let sheets = google.sheets({version: 'v4', auth: oauth});
	
	const driveResponse = await drive.files.list({
		q: "name = 'Sleep Tracker'"
	});

	const files = driveResponse.data.files;

	console.log('files', files);
	
	if(files && files?.length == 0)
	{
		try {
			let createResponse = await sheets.spreadsheets.create({
				requestBody: {
					properties: {
						title: 'Sleep Tracker'
					}
				}
			});

			console.log(createResponse);

			
			return Response.json({spreadsheetId: createResponse.data.spreadsheetId});
		}
		catch(e)
		{
			console.log(e);
			return Response.json({spreadsheetId: null, error: JSON.stringify(e)});
		}
	}	

	return Response.json({spreadsheetId: files![0].id});
}
