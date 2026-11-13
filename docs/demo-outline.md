# Five-minute demo outline — recording pending

The [Step 8 detailed script](demo-script.md) and [recording guide](recording-guide.md) provide the current timings, narration, commands and verified recording-tool availability. This outline is retained as the earlier planning reference.

Prepare the already-configured Java/PHP/Metro processes and USB phone before recording. Load the extension, open both UML SVGs and use an Arabic-capable terminal. Keep account Settings/password entry and environment setup off-camera. No screenshots or video have been fabricated or recorded by Step 7.

| Time | Demonstration |
| --- | --- |
| 0:00–0:25 | Introduce the individual assignment: English → Moroccan Darija, one Java REST API, four clients. Show the deployment SVG and the backend-only Gemini key boundary. |
| 0:25–1:00 | Show public /api/health, then one protected request without credentials producing 401. Explain Jakarta Security mechanism, IdentityStore and translator role through Liberty's Jakarta Authentication bridge. Do not display a valid Authorization header. |
| 1:00–1:50 | Select an English sentence on a normal webpage; right-click Translate to Darija. Show automatic source transfer and real output; briefly demonstrate Copy/local speech if the installed Arabic voice is ready. |
| 1:50–2:25 | Python one-shot translation; show source/target JSON. Explain terminal/environment credentials without displaying them. |
| 2:25–3:00 | PHP form translation; show server-side cURL flow and RTL result. Mention HTML escaping and CSRF. |
| 3:00–4:10 | Physical Android Expo Go app: Online status, translate a short sentence, show Arabic RTL and Copy. Explain USB reverse 9080 for API and 8082 for Metro; Java stays loopback-only. Account persistence was confirmed; do not expose stored values. |
| 4:10–4:40 | Zoom the class SVG: resource → interface → Gemini service/configuration; then authentication/IdentityStore and safe error handling. |
| 4:40–5:00 | Summarize tested clients and automated counts. Disclose Expo Go rather than a verified native APK, development-only HTTP and the three moderate dependency advisories. Point to README/API/test evidence. |

Allow time inside each client segment for real provider latency. Rehearse with brief sentences and known quota; a 45-second provider timeout can exceed the planned slot. If delays occur, state what happened, shorten commentary or re-record. Do not relabel fixture/example output as a live result. A five-minute outline is a target, not a guarantee of external API latency.

Before recording: confirm the course's screen/phone capture and attribution requirements. After recording: verify audible narration, readable text and no secret exposure. Publication/ZIP/LMS actions belong to the next explicitly authorized step.
