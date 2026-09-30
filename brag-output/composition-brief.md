# Hyperframes Composition Brief: OpenClaw

## Objective
Create a short launch-style brag video for OpenClaw, the Aires dashboard chat.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 20 seconds

## Source Material
- Project root: `/Users/belarmino/Documents/prime`
- Primary files read: `app/dashboard/openclaw/page.tsx`, `components/dashboard/OpenClawChat.tsx`, `app/globals.css`, `app/layout.tsx`
- Product name: OpenClaw
- Tagline / strongest claim: Pode pedir uma planilha.
- Key UI or visual moment to recreate: the dark chat card, amber user bubble, and the file download chip
- Copy that must appear verbatim:
  - Agente
  - OpenClaw
  - Pode pedir uma planilha.
  - Escreva para o OpenClaw…
  - Enter envia
  - Uma planilha.
  - O OpenClaw está pensando…
  - o ficheiro aparece nesta conversa para descarga.
- Stand-in: the filename `planilha.xlsx` stands in for whatever name the agent writes. No customer data.

## Creative Direction
- Tone preset: polished
- Creative direction: filme curto do painel escuro, uma pergunta âmbar, um ficheiro
- Interpretation: few cuts, readable holds, short motion, quiet sound
- Angle: the empty-state sentence is the whole film
- Hook: "Pode pedir uma planilha."
- Outro / punchline: OpenClaw / o ficheiro aparece nesta conversa para descarga.
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Unrelated visual redesign
  - Hostnames, tokens, real names, emails

## Visual Identity
- Background: `#020817`
- Text: `#ffffff`
- Accent: `#fbbf24`
- User bubble text: `#1c1917`
- Display font: Playfair Display
- Body font: Geist
- Visual references from the project: amber eyebrow, Playfair page title, rounded chat card `border-white/10`, amber user bubble, translucent assistant bubble, file button with a download mark

## Storyboard
Use the storyboard in `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. Hook — 4.8s — "Pode pedir uma planilha."
2. Chat — 5.6s — type and send; amber bubble lands at 8.74s
3. Ficheiro — 6.0s — thinking, then `planilha.xlsx` at 13.11s
4. Outro — 3.6s — OpenClaw and the download sentence from 17.47s

## Audio
- Audio role: warm bed
- Audio arc: low bed, three interface accents, fade at the close
- Music: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3`
- Music treatment: volume about 0.28, fade out over the last 1.5s
- Music cue guidance: bundled preset `happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json`. Lock the bubble to 8.74s, the file chip to 13.11s, and the final line to 17.47s.
- Audio-reactive treatment: subtle; amber glow behind the card follows per-frame RMS of the music bed. Numpy band extraction was unavailable, so the glow uses overall energy instead of a bass band. No waveform.
- Audio-coupled moments:
  - send click — simulated interaction
  - amber bubble — card landing
  - file chip — payoff
- SFX selection guidance: one click, one soft drop, one soft impact. Low high-frequency risk.
- SFX analysis guidance: `/Users/belarmino/.agents/skills/brag/assets/sfx/sfx-analysis.md`
- Exact SFX choice: Hyperframes should choose filenames, timestamps, density, and volume based on the implemented animation.
- Audio files: copy the chosen music and any Hyperframes-selected SFX into `brag-output/composition/assets/`

## Hyperframes Instructions
Load the composition-building Hyperframes domain skills — `hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`, `hyperframes-keyframes`, and `hyperframes-cli`. /brag is its own workflow: do not enter the `hyperframes` entry-point intent interview and do not route into its generic promo / launch-video workflow.

Requirements:
- Show at least one real UI, copy, or visual element from the source project.
- Keep all text readable in the final render.
- Keep the video within 15-25 seconds.
- Include the planned music/SFX layer.
- Major reveals may move toward nearby strong cues within about 0.15s.
- Use local assets.
- Run `hyperframes check` before render.
- Keep creation and rendering local.
