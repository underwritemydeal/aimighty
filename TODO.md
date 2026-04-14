# AImighty — Current TODO
## Last Updated: April 14, 2026

### CRITICAL BUGS (Fix First):
- [x] Voice not playing on all 14 belief systems — normalize belief IDs (earth→pantheism, etc.) ✅ FIXED
- [x] Mobile voice not playing — audio autoplay unlock needed ✅ FIXED (persistent audio element strategy)
- [x] Desktop God text still left-aligned — must be centered ✅ FIXED (isMobile conditional styling)
- [ ] TTS delay 3-5 seconds — optimize fetch timing (timing logs added, need to investigate)
- [x] BEGIN button too low on mobile welcome screen ✅ FIXED (80px min padding)

### IN PROGRESS:
- [x] Article generation pipeline (Cloudflare KV + generation endpoints) ✅ Endpoints added
- [ ] Article generation pipeline (/explore pages + Daily Wisdom card) — frontend needed
- [x] Character personality system (Jesus/Mary speak as themselves) ✅ FIXED in worker
- [x] Remember me / session persistence ✅ FIXED (localStorage vs sessionStorage toggle)
- [x] Clean screenshot mode (controls auto-hide, chevron toggle) ✅ DONE

### NEXT UP:
- [ ] Landing page / marketing homepage
- [ ] 3-message free trial → paywall with $4.99/$14.99 tier selection
- [ ] Fix www.aimightyme.com DNS
- [ ] Stripe subscription integration
- [ ] Frontend for /explore articles (render from KV)
- [ ] Daily Wisdom card on conversation screen

### KNOWN ISSUES:
- Some desktop belief images look too fiery — CSS filter helps but not perfect
- Login still requires typing credentials each visit — remember me may not be persisting
- God sometimes gives long responses to casual greetings despite brevity instructions
- Topic selection starts with "forgiveness" then allows "death" on day 2 (working as designed — only blocks heavy after heavy)

### COMPLETED TODAY (April 14):
- [x] Belief ID normalization in worker (earth, spiritual, stoicism aliases)
- [x] Mobile audio unlock with persistent audio element
- [x] Desktop text centering with isMobile conditional styles
- [x] Character personality prompts (JESUS_IDENTITY, MARY_IDENTITIES per belief)
- [x] Remember me toggle on auth screen
- [x] Smart topic selection with heavy/non-heavy logic
- [x] Worker endpoints: /daily-topic, /topic-history, /reset-topics
- [x] KV namespace created and bound to worker
- [x] BEGIN button padding fix
- [x] Controls auto-hide with chevron indicator
- [x] Multiple audio unlock trigger points
