# Getting songs out of BandLab (research only, nothing run)

**Facts:** 50-100 songs, many never exported. You already export in the iPhone app to iCloud `Music`. Some songs need older revisions.
Cover art matters for few or none.

**Recommendation: A, hand export into a new dedicated folder, helped by an optional Shortcut.**

| | A. Hand export in the app | B. Browser automation with your session | C. Data request to BandLab |
|---|---|---|---|
| Effort | ~1-2 min a song, about 2-3 hours total, can be split up | Build + maintain a script; breaks when the site changes | One email, then waiting |
| Audio quality | WAV or M4A | Whatever the site offers | Unknown, may not include audio |
| Titles | You type or keep them, and can rename as you go (your wish) | Automatic | Unknown |
| Revision dates | You note them where needed | Possibly automatic | Unknown |
| Older revisions | You choose per song | Possible, fragile | Unknown |
| Account risk | None | **Real**, see below | None |

## Terms of service
[BandLab's terms](https://bandlabtechnologies.com/policies/bandlab-terms-of-use/) say you keep ownership of your content (3.1). They restrict
automated tools such as bots and scrapers (4.2.7), including requests faster than a human could make, and reverse engineering (4.2.2).
A breach can end your rights automatically (4.3). Some of that wording is about "deceptive or invalid" use, so a slow personal script is a gray
area, not clearly banned. I read 100,000 of the terms' 126,316 characters. I'm not a lawyer. At 50-100 songs, the risk to the account that
holds unexported music isn't worth saving 2-3 hours.

## The method
- **New iCloud folder, `BandLab Exports`.** Keeps them apart from FL bounces, so the source tag is automatic. You create it; I can't write
  in iCloud. **Exports already in `Music` stay there,** and you'd tag those by hand. The `.m4a` files there may be BandLab's (87 across the scan; unconfirmed).
- **Format: WAV.** [BandLab's format table](https://help.bandlab.com/hc/en-us/articles/360036010533-Supported-Import-and-Export-File-Formats)
  lists WAV and M4A for iOS, and some guides mention MP3, so check what your app offers. WAV is the only safe master for finality. The Vault makes compressed copies for the phone.
- **Versions:** latest for every song. For songs you choose, also export older revisions, named `Title (2024-05-02)`. Rest stay in BandLab as history.
- **Titles and dates:** the file name is the title. BandLab's revision date doesn't survive export, as far as I can tell, so The Vault's import card asks
  for a date only when you care. Test this on one song.
- **Cover art:** skip. Add in The Vault later.
- **Tracking:** The Vault keeps a BandLab checklist ("47 of 83 pulled in"). No song is final until checked.
- **Pulled audio location:** the original stays in iCloud; The Vault copies it into its library (see architecture memo).
- **Re-sync later:** new or changed songs get exported the same way. The Vault notices new files in the folder. Same title + newer = proposed as a new version.

## Bridge: iOS Shortcut (optional, later)
A Shortcut in the share sheet could save the export straight to `BandLab Exports` and tag it, cutting a few taps. I haven't tested whether BandLab's share sheet allows it.

## Not verified
BandLab's help pages block automated reading, so exact current app steps and options come from search summaries. Export one test song first to confirm format, revision access and file name.
