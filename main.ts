// main.ts
import { Application, Context, Router } from "jsr:@oak/oak";
import { evolveHandler, getFunctionsHandler, initHandler } from "./handlers.ts";

export async function accessLogger(ctx: Context, next: () => Promise<unknown>) {
	const start = Date.now();

	await next(); // Call downstream middleware

	const responseTime = Date.now() - start;
	console.log(
		`${ctx.request.method} ${ctx.request.url.pathname} - ${ctx.response.status} - ${responseTime}ms`,
	);
}

const router = new Router();

router
	.post("/evolve", evolveHandler)
	.post("/init", initHandler)
	.get("/get_funcs", getFunctionsHandler);

const app = new Application();

app.use(accessLogger);
// CORS Middleware
app.use(async (ctx, next) => {
	ctx.response.headers.set("Access-Control-Allow-Origin", "*"); // Allow all origins
	ctx.response.headers.set(
		"Access-Control-Allow-Methods",
		"GET, POST, PUT, DELETE, OPTIONS",
	);
	ctx.response.headers.set(
		"Access-Control-Allow-Headers",
		"Content-Type, Authorization",
	);

	// Handle preflight OPTIONS requests
	if (ctx.request.method === "OPTIONS") {
		ctx.response.status = 204;
	} else {
		await next();
	}
});
app.use(router.routes());
app.use(router.allowedMethods());

console.log("Server running on http://localhost:8080");
await app.listen({ port: 8080 });
