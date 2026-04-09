import { LlmAgent, InMemorySessionService, Runner } from '@google/adk';

async function test() {
    const sessionService = new InMemorySessionService();
    const translatorAgent = new LlmAgent({
        name: "live_translator",
        model: "gemini-3.1-flash-lite-preview",
        instruction: "Test",
    });

    const translatorRunner = new Runner({ agent: translatorAgent, appName: "live_translator_app", sessionService });

    let session = await sessionService.getSession({ appName: "live_translator_app", userId: "local_user", sessionId: "test_session" });
    if (!session) {
        console.log("Creating session...");
        session = await sessionService.createSession({ appName: "live_translator_app", userId: "local_user", sessionId: "test_session" });
        console.log("Created:", session);
    }

    console.log("Runner retrieved:", await translatorRunner.sessionService.getSession({ appName: "live_translator_app", userId: "local_user", sessionId: "test_session" }));

    try {
        const events = await translatorRunner.runAsync({
            userId: "local_user",
            sessionId: "test_session",
            newMessage: { role: "user", parts: [{ text: "Hello" }] } as any
        });
        
        for await (const e of events) {
            console.log(e);
        }
    } catch (e: any) {
        console.error("Runner threw:", e.message);
    }
}
test();
