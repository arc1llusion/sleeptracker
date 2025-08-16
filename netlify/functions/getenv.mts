import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {

const value = process.env['GOOGLE_APIS'];

return {
        statusCode: 200,
        body: value,
    };
};

export { handler };