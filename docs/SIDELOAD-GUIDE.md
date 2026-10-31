# Sideload guide: iloader + SideStore

Checked 2026-10-31 against SideStore's docs and iloader's GitHub page. iloader version then: v2.4.1.
Use the spare Apple account (see DECISIONS), not the main one. Only you type its ID and password. Never paste them into chat. If any step wants iCloud removed or changed, stop and tell Code.

## Laptop
1. Download `unsigned-ipa` from the latest "Build iOS (unsigned)" run on GitHub (sign in first). Save it to Downloads, not this repo.
2. Install iloader from its [releases page](https://github.com/nab138/iloader/releases/latest): `iloader-windows-x64.msi`. That page and iloader.app are its only official sources.
3. iTunes only if iloader can't see the phone: Apple's [direct 64-bit installer](https://www.apple.com/itunes/download/win64), not the Microsoft Store one. The Apple Mobile Device service, which iloader needs for USB, was already running on 2026-10-31.

## Phone, before plugging in
4. Have a passcode set, iOS 15 or newer.
5. Install **LocalDevVPN** from the App Store. Connect, then tap Allow.
6. Join Wi-Fi. Mobile data won't do for installing or refreshing.

## Install SideStore
7. Plug in by USB. Tap Trust and enter the passcode.
8. Open iloader. **You type your Apple ID and password here.** The entry is case-sensitive.
9. Select the phone, then "Install SideStore (Stable)".
10. Phone: Settings > General > VPN & Device Management > Developer App > trust your account.
11. Phone: Settings > Privacy & Security > Developer Mode > on (iOS 16+). The phone restarts.
12. Open LocalDevVPN and tap Connect.
13. Open SideStore. **You type the same Apple ID and password here.** Go to My Apps and tap the "7 DAYS" counter to refresh. Confirm if asked to revoke or create a certificate.

## Install the Vault app
14. Get `unsigned.ipa` onto the phone (Code sets up the transfer; not through iCloud Drive).
15. In SideStore: My Apps > + > pick the `.ipa`. LocalDevVPN must be connected.

## Keep in mind
- Free Apple accounts expire apps after 7 days. Refresh in SideStore before then, with LocalDevVPN on and on Wi-Fi.
- iPhones generally run one VPN at a time. Use LocalDevVPN to install or refresh, then switch to Tailscale to reach the laptop.
- If the pairing file expires after an update or reset, replace it using SideStore's pairing file guide.
- iloader problems go to the idevice Discord, not the SideStore team.
